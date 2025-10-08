#!/usr/bin/env python3
"""
Utility functions for KJET document extraction.
Contains reusable functions for text processing, PDF extraction, and data parsing.
"""

import re
import subprocess
from pathlib import Path


def extract_application_id_from_folder_name(folder_name):
    """
    Extract application ID from folder name, handling edge cases like:
    - application_387_bundle
    - application_387_bundle (1)
    - application_387_bundle (2)
    """
    # Use regex to extract the numeric ID from folder names like application_XXX_bundle or application_XXX_bundle (N)
    pattern = r'application_(\d+)_bundle'
    match = re.search(pattern, folder_name)
    if match:
        return match.group(1)

    # Fallback: try to extract any numbers from the folder name
    numbers = re.findall(r'\d+', folder_name)
    if numbers:
        return numbers[0]  # Take the first number found

    return None


def clean_extracted_text(text):
    """Clean and normalize extracted text for better LLM processing"""
    if not text:
        return ""

    # Clean common PDF extraction artifacts
    text = text.replace('\n\n\n', '\n\n')  # Reduce excessive line breaks
    text = text.replace('\r\n', '\n')      # Normalize line endings
    text = text.replace('\r', '\n')        # Handle old Mac line endings

    # Remove common OCR artifacts and noise (keep punctuation useful for LLMs)
    text = re.sub(r'[^\w\s\-\.\,\;\:\?\!\@\#\$\%\^\&\*\(\)\[\]\{\}\_\+\=\/\\|\'"<>]', ' ', text)

    # Clean up excessive whitespace but preserve paragraph structure
    text = re.sub(r'[ \t]+', ' ', text)    # Multiple spaces/tabs to single space
    text = re.sub(r'\n{3,}', '\n\n', text) # Max 2 consecutive newlines

    return text.strip()


def extract_with_pypdf2_lenient(pdf_path):
    """Extract text using PyPDF2 with lenient error handling."""
    import PyPDF2
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file, strict=False)
            text = ""
            for page in reader.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                except Exception as e:
                    # Skip problematic pages but continue
                    continue
            return text
    except Exception as e:
        # Handle cases where file is corrupted or not a valid PDF
        if "Multiple definitions" in str(e) or "startxref" in str(e):
            # Common PDF format issues - not critical errors
            return None
        raise e


def extract_with_pypdf2_strict(pdf_path):
    """Extract text using PyPDF2 with strict error handling."""
    import PyPDF2
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
    except Exception as e:
        raise e


def extract_with_pdftotext(pdf_path):
    """Extract text using pdftotext command line tool as fallback."""
    try:
        result = subprocess.run(['pdftotext', str(pdf_path), '-'],
                              capture_output=True, text=True, timeout=30)
        return result.stdout if result.returncode == 0 else None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def extract_pdf_text(pdf_path):
    """Extract text from PDF using multiple methods with fallbacks."""
    # Try PyPDF2 lenient first (handles most PDFs gracefully)
    try:
        text = extract_with_pypdf2_lenient(pdf_path)
        if text and text.strip():
            return clean_extracted_text(text)
    except Exception as e:
        pass

    # Try PyPDF2 strict
    try:
        text = extract_with_pypdf2_strict(pdf_path)
        if text and text.strip():
            return clean_extracted_text(text)
    except Exception as e:
        pass

    # Try pdftotext as final fallback
    try:
        text = extract_with_pdftotext(pdf_path)
        if text and text.strip():
            return clean_extracted_text(text)
    except Exception as e:
        pass

    return "PDF appears to be image-based or corrupted - no extractable text found"


def extract_image_text(image_path):
    """Extract text from image using OCR."""
    try:
        import pytesseract
        from PIL import Image

        # Open and process image
        image = Image.open(image_path)

        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Extract text using OCR
        text = pytesseract.image_to_string(image)

        return clean_extracted_text(text) if text else "No text extracted from image"

    except ImportError:
        return "OCR not available - pytesseract not installed"
    except Exception as e:
        return f"OCR extraction failed: {str(e)}"


def guess_business_name(content: str, file_name: str):
    """Extract business name from content."""
    if not file_name.lower().startswith("application_info_"):
        return None

    # Look for business name patterns
    patterns = [
        r"name of your cluster[?:]?\s*([^\n\r?]+)",
        r"cluster name[?:]?\s*([^\n\r?]+)",
        r"business name[?:]?\s*([^\n\r?]+)",
        r"enterprise name[?:]?\s*([^\n\r?]+)"
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            # Clean up the match
            name = matches[0].strip()
            name = re.sub(r'^[:\-\s]+', '', name)  # Remove leading colons, dashes, spaces
            if len(name) > 3 and not name.isdigit():  # Filter out numbers and very short strings
                return name

    return None


def guess_application_number(content: str, file_name: str):
    """Extract application number from content."""
    if not file_name.lower().startswith("application_info_"):
        return None

    # Look for application number patterns
    patterns = [
        r"application number[?:]?\s*([A-Z0-9\-]+)",
        r"KJET[-\s]*([A-Z0-9\-]+)",
        r"application id[?:]?\s*([A-Z0-9\-]+)"
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            return matches[0].strip()

    return None


def guess_email_address(content: str, file_name: str):
    """Extract email address from content."""
    if not file_name.lower().startswith("application_info_"):
        return None

    # Look for email patterns
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    matches = re.findall(email_pattern, content)

    if matches:
        return matches[0]  # Return first email found

    return None


def guess_phone_number(content: str, file_name: str):
    """Extract phone number from content."""
    if not file_name.lower().startswith("application_info_"):
        return None

    # Look for phone number patterns (Kenyan format)
    patterns = [
        r'\b0[17][0-9]{8}\b',  # 07xxxxxxxx or 01xxxxxxxx
        r'\b\+254[17][0-9]{8}\b',  # +25407xxxxxxxx or +25401xxxxxxxx
        r'\b254[17][0-9]{8}\b'  # 25407xxxxxxxx or 25401xxxxxxxx
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content)
        if matches:
            return matches[0]

    return None


def guess_business_type(content: str, file_name: str):
    """Extract business type from content."""
    if not file_name.lower().startswith("application_info_"):
        return None

    # Look for business type patterns
    patterns = [
        r"registration status[?:]?\s*([^\n\r?]+)",
        r"business type[?:]?\s*([^\n\r?]+)",
        r"entity type[?:]?\s*([^\n\r?]+)"
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            business_type = matches[0].strip()
            business_type = re.sub(r'^[:\-\s]+', '', business_type)
            if len(business_type) > 2:
                return business_type

    return None


def guess_woman_owned(content: str, file_name: str):
    """Extract woman-owned status from content."""
    if not file_name.lower().startswith("application_info_"):
        return None

    # Look for woman-owned patterns
    if re.search(r'woman[^\n]*enterprise[^\n]*yes', content, re.IGNORECASE):
        return "Yes"
    elif re.search(r'woman[^\n]*owned[^\n]*yes', content, re.IGNORECASE):
        return "Yes"
    elif re.search(r'woman[^\n]*enterprise[^\n]*no', content, re.IGNORECASE):
        return "No"
    elif re.search(r'woman[^\n]*owned[^\n]*no', content, re.IGNORECASE):
        return "No"

    return None


def guess_woman_owned_proof(content: str, file_name: str):
    """Extract woman-owned proof from content."""
    if not file_name.lower().startswith("application_info_"):
        return None

    # Look for explanations of woman-owned criteria
    patterns = [
        r"explain.*woman.*enterprise[?:]?\s*([^\n\r]+)",
        r"woman.*criteria[?:]?\s*([^\n\r]+)"
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            proof = matches[0].strip()
            if len(proof) > 5:  # Filter out very short responses
                return proof

    return None


def extract_structured_data(content, doc_type, file_name):
    """Extract structured information from document content for LLM analysis"""

    data = {
        "structured_data": {},
    }

    if not content:
        return data

    try:
        structured_data = {}

        # Extract emails
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', content)
        if emails:
            structured_data["email_addresses"] = list(set(emails))

        phones = re.findall(r'\b(?:\+254|254|0)[17][0-9]{8}\b', content)
        if phones:
            structured_data["phone_numbers"] = list(set(phones[:2]))  # Keep up to 2 phone numbers

        # Extract financial amounts (KES format)
        amounts = re.findall(r'KE?S\s*[\d,]+', content, re.IGNORECASE)
        if amounts:
            structured_data["financial_amounts"] = list(set(amounts))

        # Try to extract business name using the guess function
        business_name = guess_business_name(content, file_name)
        if business_name:
            structured_data["business_name"] = business_name

        # Try to extract application number
        app_number = guess_application_number(content, file_name)
        if app_number:
            structured_data["application_number"] = app_number

        # Try to extract email using the guess function (more targeted)
        email = guess_email_address(content, file_name)
        if email:
            structured_data["email_address"] = email

        # Try to extract business type
        business_type = guess_business_type(content, file_name)
        if business_type:
            structured_data["business_type"] = business_type

        # Try to extract woman-owned status
        woman_owned = guess_woman_owned(content, file_name)
        if woman_owned:
            structured_data["woman_owned"] = woman_owned

        # Extract value chain mentions
        value_chains = [
            "agriculture", "livestock", "dairy", "poultry", "fisheries", "aquaculture",
            "manufacturing", "textiles", "leather", "wood", "furniture", "metal",
            "construction", "mining", "energy", "water", "transport", "logistics",
            "ict", "technology", "telecommunications", "financial", "banking",
            "insurance", "real estate", "professional", "consulting", "legal",
            "accounting", "engineering", "health", "education", "tourism",
            "hospitality", "entertainment", "media", "retail", "wholesale",
            "trade", "import", "export", "services", "repair", "maintenance",
            "security", "cleaning", "catering", "beauty", "salon", "barber",
            "tailoring", "crafts", "pottery", "jewelry", "art", "music",
            "sports", "fitness", "wellness", "spa", "massage", "photography",
            "printing", "publishing", "advertising", "marketing", "sales",
            "distribution", "supply", "chain", "warehouse", "storage",
            "packaging", "recycling", "waste", "environment", "renewable",
            "solar", "wind", "biogas", "organic", "sustainable", "green",
            "eco", "climate", "carbon", "emission", "pollution", "conservation"
        ]

        mentioned_chains = []
        content_lower = content.lower()
        for chain in value_chains:
            if chain in content_lower:
                mentioned_chains.append(chain)

        if mentioned_chains:
            structured_data["value_chains_mentioned"] = mentioned_chains

        # Extract registration numbers
        reg_patterns = [
            r'\b[A-Z]{2,3}[-/\s]*[0-9A-Z]{4,}\b',  # General registration patterns
            r'\bBN[-\s]*[A-Z0-9]{6,}\b',           # Business name patterns
            r'\bC/S[-\s]*[0-9]{3,}\b'              # Cooperative society patterns
        ]

        all_matches = []
        for pattern in reg_patterns:
            matches = re.findall(pattern, content)
            all_matches.extend(matches)

        if all_matches:
            structured_data["registration_numbers"] = list(set(matches))

        data["structured_data"] = structured_data

    except Exception as e:
        # Don't fail extraction if structured data parsing fails
        pass

    return data


def load_selection_criteria():
    """Load and parse the selection criteria from rules.md"""
    current_dir = Path(__file__).parent.parent.parent  # Go up from scripts/extraction/ to project root
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
    # Use regex to handle folders like application_387_bundle (1)
    direct_applications = [item for item in items if item.is_dir() and re.match(r'application_\d+_bundle', item.name)]

    # Look for county subfolders
    county_folders = [item for item in items if item.is_dir() and not re.match(r'application_\d+_bundle', item.name) and not item.name.startswith(".")]

    if direct_applications and not county_folders:
        # Legacy structure: applications directly in data folder
        print("Found applications directly in data folder (no county subfolders)")
        counties_data["Unknown"] = direct_applications
    else:
        # New structure: county subfolders containing applications
        print("Scanning for county subfolders...")
        for item in items:
            if item.is_dir() and not item.name.startswith("."):
                # Check if this folder contains application folders (handle folders with (1) suffix)
                sub_applications = [sub for sub in item.iterdir()
                                 if sub.is_dir() and re.match(r'application_\d+_bundle', sub.name)]
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


def check_dependencies():
    """Check if required dependencies are available"""
    current_dir = Path(__file__).parent.parent.parent  # Go up from scripts/extraction/ to project root
    venv_path = current_dir / "venv"

    required_packages = {
        'tqdm': 'tqdm',
        'PyPDF2': 'PyPDF2',
        'Pillow': 'Pillow',
        'pytesseract': 'pytesseract',
    }

    missing_packages = []

    for import_name, package_name in required_packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append(package_name)

    if missing_packages:
        print(f"⚠️  Missing packages: {', '.join(missing_packages)}")
        if venv_path.exists():
            print("Installing missing packages...")
            for package in missing_packages:
                install_package(package)
        else:
            print("Please install the missing packages or create a virtual environment.")
            return False

    return True


def install_package(package):
    """Install a Python package using virtual environment"""
    current_dir = Path(__file__).parent.parent.parent  # Go up from scripts/extraction/ to project root
    venv_pip = current_dir / "venv" / "bin" / "pip"

    if not venv_pip.exists():
        print(f"Virtual environment not found at {venv_pip}")
        return False

    try:
        result = subprocess.run([str(venv_pip), 'install', package],
                              capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print(f"✅ Installed {package}")
            return True
        else:
            print(f"❌ Failed to install {package}: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print(f"❌ Timeout installing {package}")
        return False
    except Exception as e:
        print(f"❌ Error installing {package}: {str(e)}")
        return False