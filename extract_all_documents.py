#!/usr/bin/env python3
"""
Comprehensive document extraction script for KJET application evaluation.
Extracts text from PDFs, performs OCR on images, and consolidates all content
into a structured format for LLM analysis.
"""

import os
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from tqdm import tqdm
import threading
import time

class ProgressTracker:
    """Enhanced progress tracker that shows current file and retains only errors"""
    
    def __init__(self):
        self.current_file = ""
        self.errors = []
        self.pdf_issues = []
        self.lock = threading.Lock()
        self.pbar = None
    
    def set_progress_bar(self, pbar):
        self.pbar = pbar
    
    def update_current_file(self, file_path):
        with self.lock:
            self.current_file = file_path
            if self.pbar:
                # Show current file in description
                file_name = Path(file_path).name if file_path else ""
                if len(file_name) > 40:
                    file_name = "..." + file_name[-37:]
                self.pbar.set_description(f"Processing: {file_name}")
    
    def add_error(self, error_msg, file_path=""):
        with self.lock:
            # Categorize PDF errors vs other errors
            if any(term in error_msg.lower() for term in ["floatobject", "multiple definitions", "startxref", "trailer", "pdf"]):
                self.pdf_issues.append(f"📄 PDF Issue: {error_msg}")
                # For PDF issues, just log but don't print immediately (too verbose)
            else:
                self.errors.append(f"❌ {error_msg}")
                # Print non-PDF errors immediately
                tqdm.write(f"❌ {error_msg}")
    
    def file_completed_successfully(self, file_path):
        with self.lock:
            # Successful files just disappear - no message retained
            pass
    
    def get_errors(self):
        with self.lock:
            return self.errors.copy()
    
    def get_pdf_issues(self):
        with self.lock:
            return self.pdf_issues.copy()
    
    def get_all_issues(self):
        with self.lock:
            return self.errors.copy() + self.pdf_issues.copy()
    
    def clear_errors(self):
        with self.lock:
            self.errors.clear()
            self.pdf_issues.clear()

# Global progress tracker
progress_tracker = ProgressTracker()

def check_dependencies():
    """Check and install required dependencies using virtual environment if needed"""
    current_dir = Path(__file__).parent
    venv_path = current_dir / "venv"
    
    # Check if virtual environment exists, create if not
    if not venv_path.exists():
        print("Creating virtual environment...")
        subprocess.check_call([sys.executable, "-m", "venv", str(venv_path)])
    
    # Use virtual environment python and pip
    venv_python = venv_path / "bin" / "python"
    venv_pip = venv_path / "bin" / "pip"
    
    required_packages = {
        'PyPDF2': 'PyPDF2',
        'PIL': 'Pillow',
        'pytesseract': 'pytesseract',
        'tqdm': 'tqdm'
    }
    
    for module, package in required_packages.items():
        try:
            # Try to import with current Python first
            __import__(module)
        except ImportError:
            try:
                # Try with virtual environment
                result = subprocess.run([str(venv_python), "-c", f"import {module}"], 
                                      capture_output=True)
                if result.returncode != 0:
                    print(f"Installing {package} in virtual environment...")
                    subprocess.check_call([str(venv_pip), "install", package])
            except Exception as e:
                print(f"Warning: Could not install {package}: {e}")
                print("Falling back to system tools where possible")

def install_package(package):
    """Install a Python package using virtual environment"""
    current_dir = Path(__file__).parent
    venv_pip = current_dir / "venv" / "bin" / "pip"
    if venv_pip.exists():
        subprocess.check_call([str(venv_pip), "install", package])
    else:
        # Fallback to system installation with --user flag
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", package])

def extract_with_pypdf2_lenient(pdf_path):
    """Extract text using PyPDF2 with lenient error handling."""
    import PyPDF2
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file, strict=False)
        
        text = ""
        total_pages = len(reader.pages)
        
        for page_num, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():  # Only add non-empty pages
                    text += f"\n--- PAGE {page_num + 1} of {total_pages} ---\n{page_text}\n"
            except Exception as page_error:
                # Log page-specific errors but continue with other pages
                text += f"\n--- PAGE {page_num + 1} of {total_pages} ---\n[ERROR: Could not extract text from this page: {str(page_error)}]\n"
        
        # Clean and normalize text
        if text.strip():
            text = clean_extracted_text(text)
            return text.strip()
        else:
            return "PDF appears to be image-based or corrupted - no extractable text found"


def extract_with_pypdf2_strict(pdf_path):
    """Extract text using PyPDF2 with strict error handling."""
    import PyPDF2
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file, strict=True)
        
        text = ""
        total_pages = len(reader.pages)
        
        for page_num, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():  # Only add non-empty pages
                    text += f"\n--- PAGE {page_num + 1} of {total_pages} ---\n{page_text}\n"
            except Exception as page_error:
                # Log page-specific errors but continue with other pages
                text += f"\n--- PAGE {page_num + 1} of {total_pages} ---\n[ERROR: Could not extract text from this page: {str(page_error)}]\n"
        
        # Clean and normalize text
        if text.strip():
            text = clean_extracted_text(text)
            return text.strip()
        else:
            return "PDF appears to be image-based or corrupted - no extractable text found"


def extract_with_pdftotext(pdf_path):
    """Extract text using system pdftotext command."""
    result = subprocess.run(['pdftotext', '-layout', '-enc', 'UTF-8', str(pdf_path), '-'], 
                          capture_output=True, text=True, timeout=60)
    if result.returncode == 0 and result.stdout.strip():
        cleaned_text = clean_extracted_text(result.stdout.strip())
        return cleaned_text
    else:
        raise Exception(f"pdftotext failed: {result.stderr[:200]}")


def extract_pdf_text(pdf_path):
    """Extract text from PDF with multiple fallback strategies."""
    extractors = [
        ('PyPDF2-lenient', extract_with_pypdf2_lenient),
        ('PyPDF2-strict', extract_with_pypdf2_strict),
        ('pdftotext', extract_with_pdftotext),
    ]
    
    errors = []
    
    for name, extractor in extractors:
        try:
            result = extractor(pdf_path)
            if result and result.strip():
                # Add error context if this is a fallback method
                if errors and "PyPDF2" not in name:
                    error_msg = str(errors[0]).lower()
                    # Categorize the PyPDF2 error for better debugging
                    if "floatobject" in error_msg:
                        fallback_reason = "corrupted float values in PDF structure"
                    elif "multiple definitions" in error_msg:
                        fallback_reason = "duplicate dictionary keys in PDF"
                    elif "startxref" in error_msg:
                        fallback_reason = "corrupted cross-reference table"
                    elif "trailer" in error_msg:
                        fallback_reason = "missing or corrupted PDF trailer"
                    else:
                        fallback_reason = f"PDF parsing error: {str(errors[0])[:100]}"
                    
                    return f"[EXTRACTED VIA {name.upper()} - PyPDF2 failed due to {fallback_reason}]\n\n{result}"
                return result
        except Exception as e:
            errors.append(e)
            continue
    
    # All methods failed
    error_details = "; ".join([f"{extractors[i][0]}: {str(e)}" for i, e in enumerate(errors)])
    return f"ERROR: All extraction methods failed - {error_details}"

def clean_extracted_text(text):
    """Clean and normalize extracted text for better LLM processing"""
    if not text:
        return ""

    # Remove excessive whitespace and normalize line breaks
    import re

    # Replace multiple spaces with single space
    text = re.sub(r' +', ' ', text)

    # Replace multiple newlines with double newline (paragraph break)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)

    # Remove trailing whitespace from lines
    text = '\n'.join(line.rstrip() for line in text.split('\n'))

    # Remove common OCR artifacts and noise (keep punctuation useful for LLMs)
    text = re.sub(r'[^\w\s\.\,\;\:\!\?\(\)\[\]\{\}\-\+\=\@\#\$\%\&\*\/\\]', ' ', text)

    # Normalize currency symbols
    text = re.sub(r'(?i)ksh?s?\.?', 'KSH', text)
    text = re.sub(r'(?i)usd\$?', 'USD', text)

    return text.strip()


def _normalize_line(line: str) -> str:
    """Normalize a single line of text for heuristics (strip, collapse spaces)."""
    return " ".join(line.strip().split())

def guess_business_name(content: str, file_name: str):
    """Heuristically guess the business/applicant name from extracted content.

    For application_info_*.pdf files, extract the name between specific markers.
    """
    import re

    if not content:
        return None

    # Special handling for application_info_*.pdf files
    if not  file_name.lower().startswith("application_info_"):
        return None
    selected_str = content.split("4. What is your registration status?")[0].split("3. What is the name of your cluster?")[1]

    # print(selected_str,"selected str")

    return selected_str.strip()


def guess_application_number(content: str, file_name: str):
    """Heuristically guess the business/applicant name from extracted content.

    For application_info_*.pdf files, extract the name between specific markers.
    """
    import re

    if not content:
        return None

    # Special handling for application_info_*.pdf files
    if not  file_name.lower().startswith("application_info_"):
        return None
    selected_str = content.split("3. What is the name of your cluster?")[0].split("2. Application Number")[1]

    # print(selected_str,"selected str")

    return selected_str.strip()


def guess_email_address(content: str, file_name: str):
    """Heuristically guess the email address from extracted content.

    For application_info_*.pdf files, extract the email address between specific markers.
    """
    import re

    if not content:
        return None



    # Special handling for application_info_*.pdf files
    if not  file_name.lower().startswith("application_info_"):
        return None
    selected_str = content.split("14. Who is the Chairperson?")[0].split("13. What is your email address?")[1]

    # print(selected_str,"selected str")

    return selected_str.strip()

def guess_phone_number(content: str, file_name: str):
    """Heuristically guess the business/applicant name from extracted content.

    For application_info_*.pdf files, extract the name between specific markers.
    """
    import re

    if not content:
        return None



    # Special handling for application_info_*.pdf files
    if not  file_name.lower().startswith("application_info_"):
        return None
    selected_str = content.split("12. What is your alternate phone number?")[0].split("11. What is your phone number?")[1]

    # print(selected_str,"selected str")
    fin_selected_str = selected_str.split('\n', 1)[0]

    return fin_selected_str.strip()


def guess_business_type(content: str, file_name: str):
    """Heuristically guess the business/applicant name from extracted content.

    For application_info_*.pdf files, extract the name between specific markers.
    """
    import re

    if not content:
        return None


    # Special handling for application_info_*.pdf files
    if not  file_name.lower().startswith("application_info_"):
        return None
    selected_str = content.split("5. Registration Status (Other)")[0].split("4. What is your registration status?")[1]

    # print(selected_str,"selected str")

    return selected_str.strip()

def guess_woman_owned(content: str, file_name: str):
    """Heuristically guess if the business is woman-owned from extracted content.
 
    """
    import re

    if not content:
        return None


    # Special handling for application_info_*.pdf files
    if not  file_name.lower().startswith("application_info_"):
        return None
    selected_str = content.split("21. If yes, please explain how your enterprise meets the criteria")[0].split("of the board of directors composed of women (if a board exists).")[1]

    # print(selected_str,"selected str")

    return selected_str.strip()

def guess_woman_owned_proof(content: str, file_name: str):
    """Heuristically guess if the business is woman-owned from extracted content.
 
    """
    import re

    if not content:
        return None


    # Special handling for application_info_*.pdf files
    if not  file_name.lower().startswith("application_info_"):
        return None
    selected_str = content.split("22. Where is your place of operation?")[0].split("21. If yes, please explain how your enterprise meets the criteria:")[1]


    # Remove everything after the first line break
    fin_selected_str = selected_str.split('\n', 1)[0]
    
    # print(fin_selected_str,"selected str")

    return fin_selected_str.strip()


def extract_structured_data(content, doc_type, file_name):
    """Extract structured information from document content for LLM analysis"""
    # Initialize default return structure
    default_result = {
        "structured_data": {},
        "content_summary": "No content available",
        "content_length": 0,
        "word_count": 0
    }
    
    if not content or content.startswith("ERROR:"):
        return default_result
    
    try:
        import re
        structured_data = {}
        content_lower = content.lower()
        
        # Common patterns across all document types
        # Extract contact information
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'(?:\+254|254|0)?[17]\d{8}|(?:\+254|254|0)?[17]\d{2}[\s-]?\d{3}[\s-]?\d{3}'
        
        emails = re.findall(email_pattern, content, re.IGNORECASE)
        phones = re.findall(phone_pattern, content)
        
        if emails:
            structured_data["email_addresses"] = list(set(emails))
        if phones:
            structured_data["phone_numbers"] = list(set(phones[:2]))
        
        # Extract financial amounts (KSH, USD)
        money_pattern = r'(?:KSH|USD|Ksh|ksh|\$)\s*[\d,]+(?:\.\d{2})?'
        amounts = re.findall(money_pattern, content, re.IGNORECASE)
        if amounts:
            structured_data["financial_amounts"] = list(set(amounts))
        
        # Document-specific extraction
        if "application" in doc_type.lower():
            # Business name extraction
            business_patterns = [
                r'(?:business\s+name|company\s+name|organization\s+name)[\s:]+([^\n]+)',
                r'(?:name\s+of\s+(?:business|company|organization))[\s:]+([^\n]+)',
                r'applicant[\s:]+([^\n]+)'
            ]
            for pattern in business_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    structured_data["business_name"] = matches[0].strip()
                    break
            
            # Value chain/sector extraction
            value_chains = [
                "edible oils", "dairy", "textiles", "construction", "rice", "tea", 
                "blue economy", "minerals", "forestry", "leather", "agriculture",
                "livestock", "manufacturing", "technology", "retail", "services"
            ]
            mentioned_chains = [chain for chain in value_chains if chain in content_lower]
            if mentioned_chains:
                structured_data["value_chains_mentioned"] = mentioned_chains
        
        elif "registration" in doc_type.lower():
            # Registration details
            reg_patterns = [
                r'registration\s+(?:number|no)[\s:]+([A-Z0-9\-/]+)',
                r'certificate\s+(?:number|no)[\s:]+([A-Z0-9\-/]+)',
                r'(?:pvt|bn|cbo)[\s\-]+([A-Z0-9]+)',
            ]
            for pattern in reg_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    structured_data["registration_numbers"] = list(set(matches))
                    break
            
            # Business type identification
            if any(term in content_lower for term in ["cooperative", "co-operative", "coop"]):
                structured_data["business_type"] = "Cooperative"
            elif any(term in content_lower for term in ["limited", "ltd", "company"]):
                structured_data["business_type"] = "Company"
            elif any(term in content_lower for term in ["group", "self help", "women group"]):
                structured_data["business_type"] = "Group"
            elif any(term in content_lower for term in ["sacco", "savings"]):
                structured_data["business_type"] = "SACCO"
        
        elif "financial" in doc_type.lower() or "income" in file_name.lower() or "balance" in file_name.lower():
            # Financial statement analysis
            # Extract years mentioned
            year_pattern = r'20[12]\d'
            years = list(set(re.findall(year_pattern, content)))
            if years:
                structured_data["financial_years"] = sorted(years)
            
            # Extract key financial terms
            financial_terms = ["revenue", "income", "profit", "loss", "assets", "liabilities", "equity", "cash"]
            mentioned_terms = [term for term in financial_terms if term in content_lower]
            if mentioned_terms:
                structured_data["financial_terms_present"] = mentioned_terms
        
        # Create content summary for LLM
        content_words = content.split() if content else []
        if len(content_words) > 100:
            # Create summary of first 50 and last 50 words for very long content
            summary = " ".join(content_words[:50]) + " ... " + " ".join(content_words[-50:])
        else:
            summary = content
        
        return {
            "structured_data": structured_data,
            "content_summary": summary,
            "content_length": len(content),
            "word_count": len(content_words)
        }
        
    except Exception as e:
        # Return safe defaults if anything goes wrong
        print(f"Warning: Error in structured data extraction for {file_name}: {e}")
        return {
            "structured_data": {},
            "content_summary": content[:500] if content else "No content",
            "content_length": len(content) if content else 0,
            "word_count": len(content.split()) if content else 0
        }

def extract_image_text(image_path):
    """Extract text from image using OCR (pytesseract or system tesseract) with enhanced processing"""
    try:
        # Try pytesseract first
        import pytesseract
        from PIL import Image
        
        image = Image.open(image_path)
        
        # Enhance image for better OCR
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Use custom OCR config for better results
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,;:!?()[]{}+-=@#$%&*/\\ '
        
        text = pytesseract.image_to_string(image, config=custom_config)
        
        # Clean and normalize text
        text = clean_extracted_text(text)
        return text.strip() if text.strip() else "No readable text found in image"
        
    except ImportError:
        # Fallback to system tesseract
        try:
            result = subprocess.run(['tesseract', str(image_path), 'stdout', '-l', 'eng'], 
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0 and result.stdout.strip():
                return clean_extracted_text(result.stdout.strip())
            else:
                return f"ERROR: tesseract failed: {result.stderr}"
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return "ERROR: Neither pytesseract nor tesseract available for OCR"
    except Exception as e:
        # Final fallback to system tesseract
        try:
            result = subprocess.run(['tesseract', str(image_path), 'stdout'], 
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0 and result.stdout.strip():
                return clean_extracted_text(result.stdout.strip())
        except:
            pass
        return f"ERROR: Could not perform OCR on image: {str(e)}"
    """Extract text from image using OCR (pytesseract or system tesseract) with enhanced processing"""
    try:
        # Try pytesseract first
        import pytesseract
        from PIL import Image
        
        image = Image.open(image_path)
        
        # Enhance image for better OCR
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Use custom OCR config for better results
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,;:!?()[]{}+-=@#$%&*/\\ '
        
        text = pytesseract.image_to_string(image, config=custom_config)
        
        # Clean and normalize text
        text = clean_extracted_text(text)
        return text.strip() if text.strip() else "No readable text found in image"
        
    except ImportError:
        # Fallback to system tesseract
        try:
            result = subprocess.run(['tesseract', str(image_path), 'stdout', '-l', 'eng'], 
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0 and result.stdout.strip():
                return clean_extracted_text(result.stdout.strip())
            else:
                return f"ERROR: tesseract failed: {result.stderr}"
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return "ERROR: Neither pytesseract nor tesseract available for OCR"
    except Exception as e:
        # Final fallback to system tesseract
        try:
            result = subprocess.run(['tesseract', str(image_path), 'stdout'], 
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0 and result.stdout.strip():
                return clean_extracted_text(result.stdout.strip())
        except:
            pass
        return f"ERROR: Could not perform OCR on image: {str(e)}"

def process_application_folder(folder_path, county_name=None):
    """Process all documents in an application folder"""
    application_data = {
        "application_id": "",
        "county": county_name or "Unknown",
        "folder_name": folder_path.name,
        "full_path": str(folder_path),
        "application_info": {},
        "financial_documents": {},
        "registration_documents": {},
        "other_documents": {},
        "document_summary": {
            "total_documents": 0,
            "pdf_count": 0,
            "image_count": 0,
            "has_application_form": False,
            "has_registration_cert": False,
            "has_financial_statements": False,
            "has_bank_statements": False
        },
        "processing_errors": []
    }
    
    # Extract application ID from folder name
    if folder_path.name.startswith("application_") and folder_path.name.endswith("_bundle"):
        base_id = folder_path.name.replace("application_", "").replace("_bundle", "")
        # Prepend county name if available
        if county_name:
            application_data["application_id"] = f"{county_name}_{base_id}"
        else:
            application_data["application_id"] = base_id
    
    # Process all files in the folder
    extracted_content_summary = {
        "total_content_length": 0,
        "total_word_count": 0,
        "content_by_type": {},
        "key_information_found": {}
    }
    
    for file_path in folder_path.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            file_extension = file_path.suffix.lower()
            
            # Skip system files
            if file_name == ".DS_Store":
                continue
            
            # Skip certificates of registration as they're already captured in application forms
            file_name_lower = file_name.lower()
            if any(term in file_name_lower for term in ["registration", "certificate", "incorporation"]) and not "application_info" in file_name_lower:
                application_data["document_summary"]["skipped_certificates"] = application_data["document_summary"].get("skipped_certificates", 0) + 1
                continue
            
            # Update progress tracker
            progress_tracker.update_current_file(str(file_path))
            
            application_data["document_summary"]["total_documents"] += 1
            
            # Count file types
            if file_extension == '.pdf':
                application_data["document_summary"]["pdf_count"] += 1
            elif file_extension in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
                application_data["document_summary"]["image_count"] += 1
            
            # Check document types
            if "application_info" in file_name_lower:
                application_data["document_summary"]["has_application_form"] = True
            if "registration" in file_name_lower or "certificate" in file_name_lower:
                application_data["document_summary"]["has_registration_cert"] = True
            if any(term in file_name_lower for term in ["balance", "income", "financial", "cashflow"]):
                application_data["document_summary"]["has_financial_statements"] = True
            if "bank" in file_name_lower and "statement" in file_name_lower:
                application_data["document_summary"]["has_bank_statements"] = True
            
            try:
                # Extract content based on file type
                content = ""
                if file_extension == '.pdf':
                    content = extract_pdf_text(file_path)
                elif file_extension in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
                    content = extract_image_text(file_path)
                elif file_extension in ['.txt', '.md']:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    content = clean_extracted_text(content)
                else:
                    content = f"UNSUPPORTED FILE TYPE: {file_extension}"
                
                # Extract structured data for LLM analysis
                structured_info = extract_structured_data(content, file_name_lower, file_name)

        
                
                # Fix the call to guess_business_name by passing file_name
                if file_name.lower().startswith("application_info_"):
                    guessed_name = guess_business_name(content, file_name)
                    if guessed_name:
                        structured_info.setdefault('structured_data', {})
                        structured_info['structured_data']['business_name'] = guessed_name

                    guessed_application_number = guess_application_number(content, file_name)
                    if guessed_application_number:
                        structured_info.setdefault('structured_data', {})
                        structured_info['structured_data']['application_number'] = guessed_application_number
                    
                    guessed_phone_number = guess_phone_number(content, file_name)
                    if guessed_phone_number:
                        structured_info.setdefault('structured_data', {})
                        structured_info['structured_data']['phone_number'] = guessed_phone_number

                    guessed_email = guess_email_address(content, file_name)
                    if guessed_email:
                        structured_info.setdefault('structured_data', {})
                        structured_info['structured_data']['email_address'] = guessed_email

                    guessed_business_type = guess_business_type(content, file_name)
                    if guessed_business_type:
                        structured_info.setdefault('structured_data', {})
                        structured_info['structured_data']['business_type'] = guessed_business_type

                    guessed_woman_owned = guess_woman_owned(content, file_name)
                    
                    if guessed_woman_owned:
                        structured_info.setdefault('structured_data', {})
                        structured_info['structured_data']['woman_owned'] = guessed_woman_owned

                        if guessed_woman_owned.lower() == "yes":
                            guessed_woman_owned_proof = guess_woman_owned_proof(content, file_name)
                            if guessed_woman_owned_proof:
                                structured_info.setdefault('structured_data', {})
                                structured_info['structured_data']['woman_owned_proof'] = guessed_woman_owned_proof
                        else:
                            structured_info.setdefault('structured_data', {})
                            structured_info['structured_data']['woman_owned_proof'] = "No"

                # Ensure all required fields are present
                if not isinstance(structured_info, dict):
                    structured_info = {"structured_data": {}, "content_summary": content[:500], "content_length": len(content), "word_count": len(content.split())}
                
                # Create enhanced document entry
                document_entry = {
                    "file_type": file_extension,
                    "file_name": file_name,
                    "content": content,
                    "structured_data": structured_info.get("structured_data", {}),
                    "content_summary": structured_info.get("content_summary", content[:500] if content else ""),
                    "content_length": structured_info.get("content_length", len(content) if content else 0),
                    "word_count": structured_info.get("word_count", len(content.split()) if content else 0),
                    "file_size": file_path.stat().st_size,
                    "extraction_status": "success" if not content.startswith("ERROR:") else "error",
                    "extraction_method": "PyPDF2" if file_extension == '.pdf' else "OCR" if file_extension in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'] else "direct_read"
                }
                
                # Categorize documents with enhanced metadata
                if "application_info" in file_name_lower:
                    application_data["application_info"][file_name] = document_entry
                    extracted_content_summary["content_by_type"]["application_form"] = document_entry["content_summary"]
                elif any(term in file_name_lower for term in ["registration", "certificate", "incorporation"]):
                    application_data["registration_documents"][file_name] = document_entry
                    extracted_content_summary["content_by_type"]["registration"] = document_entry["content_summary"]
                elif any(term in file_name_lower for term in ["balance", "income", "financial", "cashflow", "bank", "statement"]):
                    application_data["financial_documents"][file_name] = document_entry
                    if "financial" not in extracted_content_summary["content_by_type"]:
                        extracted_content_summary["content_by_type"]["financial"] = []
                    extracted_content_summary["content_by_type"]["financial"].append(document_entry["content_summary"])
                else:
                    application_data["other_documents"][file_name] = document_entry
                
                # Aggregate content statistics
                extracted_content_summary["total_content_length"] += document_entry.get("content_length", 0)
                extracted_content_summary["total_word_count"] += document_entry.get("word_count", 0)
                
                # Collect key information from structured data
                for key, value in document_entry.get("structured_data", {}).items():
                    if key not in extracted_content_summary["key_information_found"]:
                        extracted_content_summary["key_information_found"][key] = []
                    if isinstance(value, list):
                        extracted_content_summary["key_information_found"][key].extend(value)
                    else:
                        extracted_content_summary["key_information_found"][key].append(value)
                
                # Mark file as successfully processed (no message, just disappears)
                progress_tracker.file_completed_successfully(str(file_path))
                
            except Exception as e:
                error_msg = f"Error processing {file_name}: {str(e)}"
                application_data["processing_errors"].append(error_msg)
                progress_tracker.add_error(error_msg)
        
        elif file_path.is_dir():
            # Process subdirectories (like Basic Paper folders)
            subdir_data = {}
            for subfile in file_path.iterdir():
                if subfile.is_file() and subfile.name != ".DS_Store":
                    try:
                        subfile_extension = subfile.suffix.lower()
                        if subfile_extension == '.pdf':
                            subcontent = extract_pdf_text(subfile)
                        elif subfile_extension in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
                            subcontent = extract_image_text(subfile)
                        else:
                            with open(subfile, 'r', encoding='utf-8', errors='ignore') as f:
                                subcontent = f.read()
                        
                        subdir_data[subfile.name] = {
                            "file_type": subfile_extension,
                            "content": subcontent,
                            "file_size": subfile.stat().st_size,
                            "extraction_status": "success" if not subcontent.startswith("ERROR:") else "error"
                        }
                        application_data["document_summary"]["total_documents"] += 1
                        
                    except Exception as e:
                        error_msg = f"Error processing {file_path.name}/{subfile.name}: {str(e)}"
                        application_data["processing_errors"].append(error_msg)
                        progress_tracker.add_error(error_msg)
            
            if subdir_data:
                    application_data["other_documents"][file_path.name] = {
                        "file_type": "directory",
                        "content": subdir_data,
                        "file_size": 0,
                        "extraction_status": "success"
                    }
    
    # Add content summary for LLM analysis
    application_data["content_analysis"] = {
        "summary": extracted_content_summary,
        "llm_ready": {
            "application_overview": f"Application {application_data['application_id']} from {county_name or 'Unknown'} county with {application_data['document_summary']['total_documents']} documents",
            "key_documents_present": [
                doc_type for doc_type in ["application_info", "registration_documents", "financial_documents"] 
                if application_data[doc_type]
            ],
            "business_information": extracted_content_summary["key_information_found"].get("business_name", ["Not specified"])[0] if extracted_content_summary["key_information_found"].get("business_name") else "Not specified",
            "value_chains": list(set(
                chain for chains in extracted_content_summary["key_information_found"].get("value_chains_mentioned", [])
                for chain in (chains if isinstance(chains, list) else [chains])
            )),
            "completeness_score": sum([
                1 if application_data["document_summary"]["has_application_form"] else 0,
                1 if application_data["document_summary"]["has_registration_cert"] else 0,
                1 if application_data["document_summary"]["has_financial_statements"] else 0,
                1 if application_data["document_summary"]["has_bank_statements"] else 0
            ]) / 4 * 100
        }
    }
    
    return application_data

def load_selection_criteria():
    """Load and parse the selection criteria from rules.md"""
    current_dir = Path(__file__).parent
    rules_path = current_dir / "rules.md"
    if rules_path.exists():
        with open(rules_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "Selection criteria file not found"

def discover_counties_and_applications(data_dir):
    """Discover county subfolders and application folders"""
    counties_data = {}
    
    # Check if data_dir contains county subfolders or direct application folders
    items = list(data_dir.iterdir())
    
    # Look for application folders directly in data_dir (legacy structure)
    direct_applications = [item for item in items if item.is_dir() and item.name.startswith("application_")]
    
    # Look for county subfolders
    county_folders = [item for item in items if item.is_dir() and not item.name.startswith("application_") and not item.name.startswith(".")]
    
    if direct_applications and not county_folders:
        # Legacy structure: applications directly in data folder
        print("Found applications directly in data folder (no county subfolders)")
        counties_data["Unknown"] = direct_applications
    else:
        # New structure: county subfolders containing applications
        print("Scanning for county subfolders...")
        for item in items:
            if item.is_dir() and not item.name.startswith("."):
                # Check if this folder contains application folders
                sub_applications = [sub for sub in item.iterdir() 
                                 if sub.is_dir() and sub.name.startswith("application_")]
                county_name = item.name
                counties_data[county_name] = sub_applications
                if sub_applications:
                    print(f"  Found county: {county_name} with {len(sub_applications)} applications")
                else:
                    print(f"  Found county: {county_name} (empty)")
        
        # Also check for any direct application folders in root
        if direct_applications:
            if "Unknown" not in counties_data:
                counties_data["Unknown"] = []
            counties_data["Unknown"].extend(direct_applications)
    
    return counties_data

def main():
    """Main execution function"""
    print("KJET Document Extraction Script")
    print("=" * 40)
    
    # Check dependencies
    print("Checking dependencies...")
    check_dependencies()
    
    # Set up paths
    current_dir = Path(__file__).parent
    data_dir = current_dir / "data"
    if not data_dir.exists():
        print(f"Error: Data directory not found: {data_dir}")
        sys.exit(1)
    
    # Load selection criteria
    print("Loading selection criteria...")
    selection_criteria = load_selection_criteria()
    
    # Discover counties and applications
    counties_data = discover_counties_and_applications(data_dir)
    
    total_applications = sum(len(apps) for apps in counties_data.values())
    
    # Initialize comprehensive JSON output structure
    all_data = {
        "metadata": {
            "extraction_date": datetime.now().isoformat(),
            "extraction_tool": "KJET Document Extraction Script v2.1",
            "total_applications": total_applications,
            "total_counties": len(counties_data),
            "counties": list(counties_data.keys()),
            "purpose": "LLM-based application evaluation for KJET program"
        },
        "selection_criteria": {
            "source": "rules.md",
            "content": selection_criteria,
            "eligibility_criteria": {
                "E1": "Registration & Legality (Pass/Fail)",
                "E2": "County Mapping (Pass/Fail)", 
                "E3": "Priority Value Chain (Pass/Fail)",
                "E4": "Minimum Financial Evidence (Pass/Fail)",
                "E5": "Consent & Contactability (Pass/Fail)"
            },
            "primary_criteria_weights": {
                "registration_track_record": 0.05,
                "financial_position": 0.20,
                "market_demand_competitiveness": 0.20,
                "business_proposal_viability": 0.25,
                "value_chain_alignment": 0.10,
                "inclusivity_sustainability": 0.20
            },
            "scoring_scale": "0-5 scale converted to 0-100 (×20) then weighted"
        },
        "priority_value_chains": [
            "Edible Oils", "Dairy (excluding farming)", "Textiles", "Construction",
            "Rice", "Tea", "Blue Economy", "Minerals", "Forestry", "Leather"
        ],
        "counties": {},
        "applications": []
    }
    
    print(f"Found {len(counties_data)} counties with {total_applications} total applications")
    print()
    
    # Create output directory
    output_dir = current_dir / "output"
    output_dir.mkdir(exist_ok=True)
    print(f"Output directory: {output_dir}")
    print()
    
    # Initialize structure for summary reporting
    generated_files = []
    
    # Process each county and its applications with enhanced progress bar
    county_pbar = tqdm(counties_data.items(), desc="Processing counties")
    
    for county_name, application_folders in county_pbar:
        county_apps = []
        progress_tracker.clear_errors()  # Clear errors for each county
        
        # Process applications within county with enhanced progress bar
        if application_folders:
            app_pbar = tqdm(sorted(application_folders), 
                           desc=f"  {county_name} applications", 
                           unit="app", 
                           position=1,
                           leave=False)
            progress_tracker.set_progress_bar(app_pbar)
            
            for folder in app_pbar:
                app_data = process_application_folder(folder, county_name)
                county_apps.append(app_data)
                all_data["applications"].append(app_data)
                app_pbar.update(1)
        
        # Store county-level summary
        all_data["counties"][county_name] = {
            "name": county_name,
            "total_applications": len(county_apps),
            "application_ids": [app["application_id"] for app in county_apps]
        }
        
        # Create and save county-specific JSON file immediately
        county_data = {
            "metadata": {
                "extraction_date": datetime.now().isoformat(),
                "extraction_tool": "KJET Document Extraction Script v3.0 - LLM Enhanced",
                "county": county_name,
                "total_applications": len(county_apps),
                "purpose": "LLM-based application evaluation for KJET program",
                "data_quality": {
                    "total_documents": sum(app.get("document_summary", {}).get("total_documents", 0) for app in county_apps),
                    "successful_extractions": sum(1 for app in county_apps for doc_type in ["application_info", "financial_documents", "registration_documents", "other_documents"] for doc in app.get(doc_type, {}).values() if isinstance(doc, dict) and doc.get("extraction_status") == "success"),
                    "failed_extractions": sum(len(app.get("processing_errors", [])) for app in county_apps),
                    "avg_documents_per_app": sum(app.get("document_summary", {}).get("total_documents", 0) for app in county_apps) / len(county_apps) if county_apps else 0
                }
            },
            "selection_criteria": all_data["selection_criteria"],
            "priority_value_chains": all_data["priority_value_chains"],
            "county_summary": {
                "name": county_name,
                "total_applications": len(county_apps),
                "application_ids": [app["application_id"] for app in county_apps],
                "business_types_detected": list(set(
                    doc.get("structured_data", {}).get("business_type", "Unknown")
                    for app in county_apps
                    for doc_type in ["registration_documents"]
                    for doc in app.get(doc_type, {}).values()
                    if isinstance(doc, dict) and doc.get("structured_data", {}).get("business_type")
                )),
                "value_chains_mentioned": list(set(
                    chain
                    for app in county_apps
                    for doc_type in ["application_info", "registration_documents", "other_documents"]
                    for doc in app.get(doc_type, {}).values()
                    if isinstance(doc, dict)
                    for chain in doc.get("structured_data", {}).get("value_chains_mentioned", [])
                )),
                "financial_years_covered": list(set(
                    year
                    for app in county_apps
                    for doc_type in ["financial_documents"]
                    for doc in app.get(doc_type, {}).values()
                    if isinstance(doc, dict)
                    for year in doc.get("structured_data", {}).get("financial_years", [])
                ))
            },
            "applications": county_apps,
            "llm_analysis_prompt": {
                "task": "Evaluate applications against KJET eligibility criteria",
                "instructions": [
                    "Review each application's documents for completeness and compliance",
                    "Check eligibility criteria E1-E5 (Registration, County Mapping, Priority Value Chain, Financial Evidence, Consent)",
                    "Score primary criteria A2 using the 0-5 scale with specified weights",
                    "Extract key business information and assess viability",
                    "Identify any red flags or missing documentation",
                    "Provide recommendations for each application"
                ],
                "output_format": "Structured JSON with eligibility status, scores, and detailed reasoning for each application"
            }
        }
        
        # Save county JSON file immediately
        json_output_path = output_dir / f"{county_name}_kjet_applications_complete.json"
        
        with open(json_output_path, 'w', encoding='utf-8') as f:
            json.dump(county_data, f, indent=2, ensure_ascii=False)
        
        generated_files.append(json_output_path)
        
        # Show completion status for county
        file_size = json_output_path.stat().st_size
        county_errors = progress_tracker.get_errors()
        
        # Use tqdm.write to print without interfering with progress bars
        if county_errors:
            tqdm.write(f"  ⚠️  {county_name}: {len(county_apps)} apps, {len(county_errors)} errors ({file_size:,} bytes)")
        else:
            tqdm.write(f"  ✅ {county_name}: {len(county_apps)} apps, no errors ({file_size:,} bytes)")
        
        county_pbar.update(1)
    
    # Close progress bars
    county_pbar.close()
    
    print("=" * 40)
    print("EXTRACTION COMPLETE")
    print(f"Output directory: {output_dir}")
    print(f"Generated {len(generated_files)} county-specific JSON files:")
    
    # Summary with error counts
    total_errors = 0
    for file_path in generated_files:
        file_size = file_path.stat().st_size
        county_name = file_path.stem.replace("_kjet_applications_complete", "")
        county_app_count = all_data["counties"][county_name]["total_applications"]
        
        # Count errors for this county
        county_error_count = sum(len(app['processing_errors']) for app in all_data['applications'] if app['county'] == county_name)
        total_errors += county_error_count
        
        status_icon = "⚠️ " if county_error_count > 0 else "✅"
        error_text = f", {county_error_count} errors" if county_error_count > 0 else ""
        
        print(f"  {status_icon} {file_path.name} ({file_size:,} bytes, {county_app_count} apps{error_text})")
    
    print(f"\nTotal counties processed: {len(counties_data)}")
    print(f"Total applications processed: {len(all_data['applications'])}")
    
    if total_errors > 0:
        print(f"\n⚠️  TOTAL PROCESSING ERRORS: {total_errors}")
        print("   Errors are logged in individual county JSON files under 'processing_errors'")
    else:
        print(f"\n✅ ALL FILES PROCESSED SUCCESSFULLY - NO ERRORS!")
    
    print(f"\nEach JSON file structure:")
    print(f"├── metadata (extraction info + county-specific)")
    print(f"├── selection_criteria (evaluation rules)")
    print(f"├── priority_value_chains")
    print(f"├── county (county info)")
    print(f"└── applications (county-specific applications only)")
    print(f"    ├── application_id (with county prefix)")
    print(f"    ├── county")
    print(f"    ├── folder_name") 
    print(f"    ├── application_info (forms)")
    print(f"    ├── financial_documents")
    print(f"    ├── registration_documents")
    print(f"    ├── other_documents")
    print(f"    ├── document_summary")
    print(f"    └── processing_errors")

if __name__ == "__main__":
    main()