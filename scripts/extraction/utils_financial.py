#!/usr/bin/env python3
"""
Financial utilities for KJET document extraction.
Contains specialized functions for extracting and processing financial documents.
"""

import os
import re
from pathlib import Path

# Financial document type patterns
FINANCIAL_PATTERNS = {
    'bank_statements': [
        'Bank Statements_',
        'bank statement',
        'Bank Statement',
        'BANK STATEMENT',
        'statement'
    ],
    'mpesa_statements': [
        'MPESA_Statement',
        'M-PESA',
        'MPESA',
        'Mpesa Statements_',
        'mpesa'
    ],
    'balance_sheets': [
        'Balance Sheets_',
        'balance sheet',
        'Balance Sheet',
        'BALANCE SHEET',
        'b.sheet'
    ],
    'income_statements': [
        'Income Statements_',
        'income statement',
        'Income Statement',
        'INCOME STATEMENT',
        'income'
    ],
    'cash_books': [
        'Cash-Based Books_',
        'cash book',
        'Cash Book',
        'CASH BOOK',
        'cashbook'
    ],
    'audited_accounts': [
        'AUDITED ACCOUNTS',
        'audited accounts',
        'Audited Accounts',
        'audit'
    ]
}

# Key financial terms to search for
FINANCIAL_KEYWORDS = [
    'total', 'totals', 'revenue', 'assets', 'profit', 'loss',
    'net profit', 'gross profit', 'total assets', 'total liabilities',
    'balance', 'income', 'expense', 'operating profit', 'net income',
    'current assets', 'fixed assets', 'equity', 'retained earnings',
    'cash flow', 'turnover', 'sales', 'cost of goods sold'
]

def classify_financial_document(filename):
    """
    Classify a financial document based on its filename.
    Returns the document type and a cleaned name.
    """
    filename_lower = filename.lower()

    # Check each pattern type
    for doc_type, patterns in FINANCIAL_PATTERNS.items():
        for pattern in patterns:
            if pattern.lower() in filename_lower:
                return doc_type, filename

    # Default classification for unmatched files
    return 'other_financial', filename

def extract_first_and_last_pages(pdf_path, num_last_pages=2):
    """
    Extract text from the first page and last two pages of a PDF.
    This captures summary information while avoiding lengthy transaction details.
    """
    try:
        import PyPDF2

        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)

            extracted_pages = []

            # Extract first page
            if num_pages > 0:
                first_page = pdf_reader.pages[0]
                first_text = first_page.extract_text()
                if first_text.strip():
                    extracted_pages.append(f"=== First Page ===\n{first_text.strip()}")

            # Extract last pages (up to num_last_pages)
            if num_pages > 1:
                pages_to_extract = min(num_last_pages, num_pages - 1)  # Don't double-extract first page
                start_page = max(1, num_pages - pages_to_extract)  # Start from appropriate page

                for i in range(start_page, num_pages):
                    page = pdf_reader.pages[i]
                    page_text = page.extract_text()
                    if page_text.strip():
                        page_label = f"Last Page {i - start_page + 1}" if pages_to_extract > 1 else "Last Page"
                        extracted_pages.append(f"=== {page_label} ===\n{page_text.strip()}")

            if extracted_pages:
                return "\n\n".join(extracted_pages) + f"\n[First and Last {num_last_pages} Pages Extracted]"
            else:
                return "ERROR: No text found in first/last pages"

    except Exception as e:
        return f"ERROR: Failed to extract first/last pages: {str(e)}"

def extract_financial_keywords(text_content):
    """
    Extract lines containing key financial terms like totals, revenue, assets, profit/loss.
    Returns a filtered text containing only relevant financial information.
    """
    if not text_content or text_content.startswith("ERROR:"):
        return text_content

    lines = text_content.split('\n')
    financial_lines = []

    # Look for lines containing financial keywords
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue

        # Check if line contains any financial keywords
        line_lower = line_clean.lower()
        for keyword in FINANCIAL_KEYWORDS:
            if keyword in line_lower:
                # Include the line and potentially context lines
                financial_lines.append(line_clean)

                # Look for numerical values in nearby lines (context)
                line_index = lines.index(line)

                # Check previous line for context
                if line_index > 0:
                    prev_line = lines[line_index - 1].strip()
                    if prev_line and re.search(r'\d+', prev_line):
                        if prev_line not in financial_lines:
                            financial_lines.insert(-1, prev_line)

                # Check next line for context
                if line_index < len(lines) - 1:
                    next_line = lines[line_index + 1].strip()
                    if next_line and re.search(r'\d+', next_line):
                        if next_line not in financial_lines:
                            financial_lines.append(next_line)
                break

    # Remove duplicates while preserving order
    unique_financial_lines = []
    seen = set()
    for line in financial_lines:
        if line not in seen:
            unique_financial_lines.append(line)
            seen.add(line)

    if unique_financial_lines:
        return "\n".join(unique_financial_lines) + "\n[Key Financial Information Extracted]"
    else:
        # Fallback: return original content truncated
        return text_content[:3000] + "...\n[No specific financial keywords found]"

def extract_pdf_with_ocr(pdf_path, first_last_only=True, num_last_pages=2):
    """
    Extract text from image-based PDFs using OCR.
    Converts PDF pages to images and applies OCR to extract text.
    If first_last_only=True, only processes first and last pages.
    """
    try:
        # Try to import required libraries
        import pytesseract
        from PIL import Image

        # Try pdf2image first (more reliable)
        try:
            from pdf2image import convert_from_path

            if first_last_only:
                # Get total page count first
                try:
                    info_pages = convert_from_path(str(pdf_path), first_page=1, last_page=1, dpi=150)
                    # Get first page
                    first_pages = convert_from_path(str(pdf_path), first_page=1, last_page=1, dpi=200)

                    # Get last pages
                    last_pages = []
                    try:
                        # Try to get specific last pages
                        for i in range(num_last_pages):
                            page_num = -(i + 1)  # -1 for last page, -2 for second to last, etc.
                            page = convert_from_path(str(pdf_path), first_page=page_num, last_page=page_num, dpi=200)
                            last_pages.extend(page)
                    except:
                        # Fallback: get last few pages
                        last_pages = convert_from_path(str(pdf_path), first_page=-num_last_pages, last_page=-1, dpi=200)

                    pages = first_pages + last_pages
                except:
                    # Final fallback: just get first few pages
                    pages = convert_from_path(str(pdf_path), first_page=1, last_page=3, dpi=200)
            else:
                # Convert first 3 pages to images
                pages = convert_from_path(str(pdf_path), first_page=1, last_page=3, dpi=200)

            extracted_texts = []
            for i, page in enumerate(pages):
                # Apply OCR to each page
                text = pytesseract.image_to_string(page)
                if text.strip():
                    if first_last_only and len(pages) > 1:
                        page_label = "First Page" if i == 0 else f"Last Page {i}"
                    else:
                        page_label = f"Page {i+1}"
                    extracted_texts.append(f"=== {page_label} ===\n{text.strip()}")

            if extracted_texts:
                return "\n\n".join(extracted_texts) + "\n[Extracted via OCR]"
            else:
                return "No text found via OCR"

        except ImportError:
            # Fallback: try using PyMuPDF if available
            try:
                import fitz  # PyMuPDF

                doc = fitz.open(str(pdf_path))
                extracted_texts = []

                pages_to_process = []
                if first_last_only:
                    # First page
                    pages_to_process.append(0)
                    # Last pages
                    for i in range(min(num_last_pages, len(doc))):
                        page_num = len(doc) - 1 - i
                        if page_num > 0:  # Don't duplicate first page
                            pages_to_process.append(page_num)
                else:
                    pages_to_process = list(range(min(3, len(doc))))

                for page_num in pages_to_process:
                    page = doc[page_num]
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scaling for better OCR
                    img_data = pix.tobytes("ppm")

                    # Convert to PIL Image
                    from io import BytesIO
                    img = Image.open(BytesIO(img_data))

                    # Apply OCR
                    text = pytesseract.image_to_string(img)
                    if text.strip():
                        page_label = f"Page {page_num + 1}"
                        extracted_texts.append(f"=== {page_label} ===\n{text.strip()}")

                doc.close()

                if extracted_texts:
                    return "\n\n".join(extracted_texts) + "\n[Extracted via OCR - PyMuPDF]"
                else:
                    return "No text found via OCR"

            except ImportError:
                return "OCR libraries not available (pdf2image, PyMuPDF, or pytesseract missing)"

    except Exception as e:
        return f"OCR extraction failed: {str(e)}"

def clean_financial_text(text_content, doc_type, filename):
    """
    Clean and process financial document text based on document type.
    For M-Pesa statements, extract SUMMARY section.
    For other documents, extract key financial information.
    """
    if not text_content or text_content.startswith("ERROR:"):
        return f"ERROR: Could not extract text from {filename}"

    # Remove common PDF artifacts
    text_content = text_content.replace('\x00', '').strip()

    # Handle M-Pesa statements specially - extract content between SUMMARY and DETAILED STATEMENT
    if doc_type == 'mpesa_statements':
        # Look for SUMMARY section specifically
        summary_start_patterns = ['SUMMARY', 'Summary', 'ACCOUNT SUMMARY', 'Account Summary']
        detailed_start_patterns = ['DETAILED STATEMENT', 'Detailed Statement', 'TRANSACTION DETAILS', 'Transaction Details', 'TRANSACTIONS']

        # Find the SUMMARY section start
        summary_start_pos = -1
        for pattern in summary_start_patterns:
            pos = text_content.find(pattern)
            if pos != -1:
                summary_start_pos = pos
                break

        if summary_start_pos != -1:
            # Find the DETAILED STATEMENT section start (end of summary)
            detailed_start_pos = len(text_content)  # Default to end of text
            for pattern in detailed_start_patterns:
                pos = text_content.find(pattern, summary_start_pos)
                if pos != -1 and pos < detailed_start_pos:
                    detailed_start_pos = pos
                    break

            # Extract the summary section content
            summary_content = text_content[summary_start_pos:detailed_start_pos].strip()

            if summary_content and len(summary_content) > 50:  # Make sure we got meaningful content
                return summary_content + "\n[M-Pesa Summary Section Extracted]"

        # Fallback: Look for key M-Pesa information patterns if SUMMARY section not found
        lines = text_content.split('\n')
        summary_lines = []

        # Common M-Pesa summary patterns
        summary_keywords = [
            'Statement Period:', 'Customer Name:', 'Phone Number:',
            'Opening Balance:', 'Closing Balance:', 'Total Received:',
            'Total Paid:', 'Total Charges:', 'Account Balance:'
        ]

        for line in lines[:150]:  # Check first 150 lines
            line_clean = line.strip()

            # Capture lines with key M-Pesa information
            if any(keyword in line_clean for keyword in summary_keywords):
                summary_lines.append(line_clean)
                # Also capture the next line which often contains the value
                line_index = lines.index(line)
                if line_index + 1 < len(lines):
                    next_line = lines[line_index + 1].strip()
                    if next_line and not any(keyword in next_line for keyword in summary_keywords):
                        summary_lines.append(next_line)

        if summary_lines:
            return '\n'.join(summary_lines) + "\n[M-Pesa Key Information Extracted]"
        else:
            # Final fallback: take first 2000 characters if no summary found
            return text_content[:2000] + "...\n[First page summary only]"

    # For other financial documents, extract key financial information
    else:
        # First try to extract lines with financial keywords
        financial_content = extract_financial_keywords(text_content)

        # If we found good financial keywords, return that
        if not financial_content.endswith("[No specific financial keywords found]"):
            return financial_content

        # Fallback: apply general processing based on document type
        if doc_type in ['balance_sheets', 'income_statements']:
            # These are usually shorter and more structured
            if len(text_content) > 5000:
                return text_content[:5000] + "...\n[Truncated for length]"
            return text_content
        else:
            # For bank statements and other docs, apply general length limit
            if len(text_content) > 4000:
                return text_content[:4000] + "...\n[Truncated for length]"
            return text_content

def find_financial_documents(app_folder):
    """
    Find all financial documents in an application folder.
    Returns a list of (pdf_path, doc_type) tuples.
    """
    financial_docs = []

    # Look for PDFs in the application folder and subdirectories
    for pdf_path in app_folder.rglob("*.pdf"):
        # Skip application_info files and registration files
        filename_lower = pdf_path.name.lower()
        if (pdf_path.name.startswith("application_info_") or
            pdf_path.name.startswith("Registration_Certificate_") or
            "registration" in filename_lower or
            "certificate" in filename_lower or
            "license" in filename_lower or
            "permit" in filename_lower):
            continue

        # Check if this looks like a financial document
        doc_type, _ = classify_financial_document(pdf_path.name)        # Only include actual financial documents
        if doc_type != 'other_financial' or any(keyword in pdf_path.name.lower()
                                              for keyword in ['statement', 'balance', 'income', 'financial', 'bank', 'mpesa', 'cash']):
            financial_docs.append((pdf_path, doc_type))

    return financial_docs