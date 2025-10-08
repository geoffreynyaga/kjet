# KJET Extraction Utilities

This module contains utility functions for the KJET document extraction pipeline.

## Functions Overview

### Core Utilities
- `extract_application_id_from_folder_name()` - Extract application IDs from folder names with edge case handling
- `clean_extracted_text()` - Clean and normalize text for better LLM processing
- `discover_counties_and_applications()` - Scan data directory for counties and applications
- `load_selection_criteria()` - Load evaluation criteria from rules.md

### PDF Processing
- `extract_pdf_text()` - Main PDF text extraction with multiple fallbacks
- `extract_with_pypdf2_lenient()` - PyPDF2 extraction with error tolerance
- `extract_with_pypdf2_strict()` - PyPDF2 extraction with strict validation
- `extract_with_pdftotext()` - System pdftotext fallback

### Image Processing
- `extract_image_text()` - OCR text extraction from images

### Data Extraction
- `extract_structured_data()` - Extract structured information for LLM analysis
- `guess_business_name()` - Extract business name from application forms
- `guess_application_number()` - Extract application number
- `guess_email_address()` - Extract email addresses
- `guess_phone_number()` - Extract phone numbers
- `guess_business_type()` - Extract business type/registration status
- `guess_woman_owned()` - Extract woman-owned enterprise status
- `guess_woman_owned_proof()` - Extract woman-owned criteria explanation

### Environment Management
- `check_dependencies()` - Check and install required Python packages
- `install_package()` - Install packages in virtual environment

## Usage

```python
from utils import extract_pdf_text, clean_extracted_text

# Extract and clean text from PDF
text = extract_pdf_text(pdf_path)
cleaned_text = clean_extracted_text(text)
```

All functions are designed to be robust with proper error handling and fallback mechanisms.