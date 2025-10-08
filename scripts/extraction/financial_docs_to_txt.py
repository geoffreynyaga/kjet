#!/usr/bin/env python3
"""
Financial Documents Extraction Script for KJET Applications
Extracts text from all financial documents (bank statements, M-Pesa statements,
balance sheets, income statements) and saves as organized TXT files by county.

For M-Pesa statements, extracts SUMMARY section.
For other documents, extracts first and last two pages focusing on totals, revenue, assets, profit/loss.
"""

import os
import re
from pathlib import Path
from tqdm import tqdm
from utils import extract_pdf_text, discover_counties_and_applications, extract_application_id_from_folder_name
from utils_financial import (
    classify_financial_document,
    extract_first_and_last_pages,
    extract_pdf_with_ocr,
    clean_financial_text,
    find_financial_documents
)

def extract_financial_document(pdf_path, output_dir, county_name, app_id, doc_type):
    """
    Extract text from a single financial document PDF and save as TXT.
    For non-M-Pesa documents, extracts first and last two pages to avoid lengthy content.
    """
    try:
        # For non-M-Pesa documents, extract only first and last two pages
        if doc_type != 'mpesa_statements':
            text_content = extract_first_and_last_pages(pdf_path, num_last_pages=2)
            
            # If first/last page extraction failed, try full extraction as fallback
            if text_content.startswith("ERROR:"):
                text_content = extract_pdf_text(pdf_path)
        else:
            # For M-Pesa statements, use full extraction (will be filtered in clean_financial_text)
            text_content = extract_pdf_text(pdf_path)

        # If regular extraction failed or returned the "image-based" error, try OCR
        if (text_content.startswith("ERROR:") or
            "PDF appears to be image-based or corrupted" in text_content or
            not text_content.strip() or
            len(text_content.strip()) < 50):  # Very short content might indicate failed extraction

            print(f"🔄 Regular extraction failed for {pdf_path.name}, trying OCR...")
            # For non-M-Pesa documents, use first/last page OCR; for M-Pesa, use full OCR
            first_last_only = (doc_type != 'mpesa_statements')
            ocr_content = extract_pdf_with_ocr(pdf_path, first_last_only=first_last_only, num_last_pages=2)

            if ocr_content and not ocr_content.startswith("OCR") and len(ocr_content.strip()) > 50:
                text_content = ocr_content
                print(f"✅ OCR successful for {pdf_path.name}")
            else:
                print(f"❌ OCR also failed for {pdf_path.name}: {ocr_content}")
                return False

        # Clean and process the text based on document type
        processed_text = clean_financial_text(text_content, doc_type, pdf_path.name)

        # Create document header
        header = f"""Financial Document: {pdf_path.name}
Document Type: {doc_type.replace('_', ' ').title()}
Application ID: {app_id}
County: {county_name}
Extraction Date: {Path(__file__).stat().st_mtime}

{'='*60}

"""

        # Combine header and content
        final_content = header + processed_text

        # Create safe filename
        base_name = pdf_path.stem
        # Remove problematic characters
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', base_name)
        output_file = output_dir / f"{app_id}_{doc_type}_{safe_name}.txt"

        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)

        # Write to TXT file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(final_content)

        file_size = output_file.stat().st_size
        print(f"✅ {county_name}/{app_id}: {output_file.name} ({file_size:,} bytes)")
        return True

    except Exception as e:
        print(f"❌ Error processing {pdf_path.name}: {str(e)}")
        return False

def process_all_counties():
    """
    Process all counties and extract financial documents to TXT files.
    """
    print("KJET Financial Documents Extraction")
    print("=" * 50)

    # Set up paths
    current_dir = Path(__file__).parent.parent.parent  # Go up from scripts/extraction/ to project root
    data_dir = current_dir / "data"
    output_base_dir = current_dir / "output"

    if not data_dir.exists():
        print(f"❌ Error: Data directory not found: {data_dir}")
        return

    # Discover counties and applications
    print("Discovering counties and applications...")
    counties_data = discover_counties_and_applications(data_dir)

    total_applications = sum(len(apps) for apps in counties_data.values())
    total_docs_processed = 0
    total_docs_success = 0
    total_docs_failed = 0

    print(f"Found {len(counties_data)} counties with {total_applications} total applications")
    print()

    # Process each county
    for county_name, application_folders in tqdm(counties_data.items(), desc="Processing counties"):
        county_output_dir = output_base_dir / county_name / "financials"
        county_docs_processed = 0
        county_docs_success = 0
        county_docs_failed = 0

        if not application_folders:
            print(f"⚪ {county_name}: No applications found")
            continue

        # Process each application folder in the county
        for app_folder in tqdm(application_folders, desc=f"  {county_name}", leave=False):
            # Extract application ID from folder name
            app_id = extract_application_id_from_folder_name(app_folder.name)
            if not app_id:
                print(f"❌ Could not extract app ID from folder: {app_folder.name}")
                continue

            # Find all financial documents in this application
            financial_docs = find_financial_documents(app_folder)

            if not financial_docs:
                print(f"⚠️  {county_name}/{app_id}: No financial documents found")
                continue

            # Process each financial document
            for pdf_path, doc_type in financial_docs:
                total_docs_processed += 1
                county_docs_processed += 1

                success = extract_financial_document(
                    pdf_path, county_output_dir, county_name, app_id, doc_type
                )

                if success:
                    total_docs_success += 1
                    county_docs_success += 1
                else:
                    total_docs_failed += 1
                    county_docs_failed += 1

        # Print county summary
        if county_docs_processed > 0:
            success_rate = (county_docs_success / county_docs_processed) * 100
            print(f"📊 {county_name}: {county_docs_success}/{county_docs_processed} financial documents extracted ({success_rate:.1f}%)")

    # Print final summary
    print()
    print("=" * 50)
    print("FINANCIAL EXTRACTION COMPLETE")
    print(f"📊 Total: {total_docs_success}/{total_docs_processed} documents successful ({(total_docs_success/total_docs_processed)*100:.1f}%)")
    print(f"✅ Success: {total_docs_success}")
    print(f"❌ Failed: {total_docs_failed}")
    print(f"📁 Output directory: {output_base_dir}")
    print()
    print("Financial documents organized by county:")

    # Show output structure
    for county_name in sorted(counties_data.keys()):
        county_financials_dir = output_base_dir / county_name / "financials"
        if county_financials_dir.exists():
            txt_files = list(county_financials_dir.glob("*.txt"))
            if txt_files:
                total_size = sum(f.stat().st_size for f in txt_files)
                print(f"  📁 {county_name}/financials/: {len(txt_files)} TXT files ({total_size:,} bytes)")

                # Show document type breakdown
                doc_types = {}
                for txt_file in txt_files:
                    # Extract doc type from filename
                    parts = txt_file.stem.split('_')
                    if len(parts) >= 2:
                        doc_type = parts[1]
                        doc_types[doc_type] = doc_types.get(doc_type, 0) + 1

                for doc_type, count in sorted(doc_types.items()):
                    print(f"    📄 {doc_type.replace('_', ' ').title()}: {count} files")

# Example usage
if __name__ == "__main__":
    process_all_counties()