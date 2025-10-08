#!/usr/bin/env python3
"""
Comprehensive document extraction script for KJET application evaluation.
Extracts text from PDFs, performs OCR on images, and consolidates all content
into a structured format for LLM analysis.

This script uses utility functions from utils.py for text processing, PDF extraction,
and data parsing to maintain modularity and code organization.
"""

import os
import json
import subprocess
import sys
import re
from pathlib import Path
from datetime import datetime
from tqdm import tqdm
import threading
import time

# Import utility functions
from utils import (
    extract_application_id_from_folder_name,
    clean_extracted_text,
    extract_pdf_text,
    extract_image_text,
    discover_counties_and_applications,
    check_dependencies
)


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


def process_application_folder(folder_path, county_name=None):
    """Process all documents in an application folder"""
    application_data = {
        "application_id": "",
        "county": county_name or "Unknown",
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

    # Extract application ID from folder name (handles cases like application_387_bundle (1))
    if folder_path.name.startswith("application_"):
        base_id = extract_application_id_from_folder_name(folder_path.name)
        if base_id:
            # Prepend county name if available
            if county_name:
                application_data["application_id"] = f"{county_name}_{base_id}"
            else:
                application_data["application_id"] = base_id
        else:
            # Fallback to using the full folder name if ID extraction fails
            application_data["application_id"] = folder_path.name

    # Process all files in the folder
    extracted_content_summary = {
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

                # Categorize documents with CSV file references
                if "application_info" in file_name_lower:
                    # For application info files, reference the CSV file instead of storing content
                    document_entry = {
                        "file_type": file_extension,
                        "file_name": file_name,
                        "csv_data_reference": f"{county_name or 'Unknown'}_kjet_forms.csv",
                        "extraction_status": "success" if not content.startswith("ERROR:") else "error"
                    }
                    application_data["application_info"][file_name] = document_entry
                    extracted_content_summary["content_by_type"]["application_form"] = f"Data available in {document_entry['csv_data_reference']}"
                elif any(term in file_name_lower for term in ["registration", "certificate", "incorporation"]):
                    # For registration documents, create minimal entry
                    document_entry = {
                        "file_type": file_extension,
                        "file_name": file_name,
                        "extraction_status": "success" if not content.startswith("ERROR:") else "error"
                    }
                    application_data["registration_documents"][file_name] = document_entry
                    extracted_content_summary["content_by_type"]["registration"] = "Registration document processed"
                elif any(term in file_name_lower for term in ["balance", "income", "financial", "cashflow", "bank", "statement"]):
                    # For financial documents, create minimal entry
                    document_entry = {
                        "file_type": file_extension,
                        "file_name": file_name,
                        "extraction_status": "success" if not content.startswith("ERROR:") else "error"
                    }
                    application_data["financial_documents"][file_name] = document_entry
                    if "financial" not in extracted_content_summary["content_by_type"]:
                        extracted_content_summary["content_by_type"]["financial"] = []
                    extracted_content_summary["content_by_type"]["financial"].append("Financial document processed")
                else:
                    # For other documents, create minimal entry
                    document_entry = {
                        "file_type": file_extension,
                        "file_name": file_name,
                        "extraction_status": "success" if not content.startswith("ERROR:") else "error"
                    }
                    application_data["other_documents"][file_name] = document_entry

                # Key information is now available in separate CSV files

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
            "structured_data_location": f"{county_name or 'Unknown'}_kjet_forms.csv",
            "completeness_score": sum([
                1 if application_data["document_summary"]["has_application_form"] else 0,
                1 if application_data["document_summary"]["has_registration_cert"] else 0,
                1 if application_data["document_summary"]["has_financial_statements"] else 0,
                1 if application_data["document_summary"]["has_bank_statements"] else 0
            ]) / 4 * 100
        }
    }

    return application_data


def main():
    """Main execution function"""
    print("KJET Document Extraction Script")
    print("=" * 40)

    # Check dependencies
    print("Checking dependencies...")
    check_dependencies()

    # Set up paths
    current_dir = Path(__file__).parent.parent.parent  # Go up from scripts/extraction/ to project root
    data_dir = current_dir / "data"
    if not data_dir.exists():
        print(f"Error: Data directory not found: {data_dir}")
        sys.exit(1)

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
            "applications": county_apps
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
    print(f"└── applications (county-specific applications only)")
    print(f"    ├── application_id (with county prefix)")
    print(f"    ├── county")
    print(f"    ├── application_info (forms)")
    print(f"    ├── financial_documents")
    print(f"    ├── registration_documents")
    print(f"    ├── other_documents")
    print(f"    ├── document_summary")
    print(f"    └── processing_errors")

if __name__ == "__main__":
    main()