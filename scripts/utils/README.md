# Scripts/Utils

This directory contains utility and debugging scripts for the KJET project.

## Files

### `extract_application_data.sh`
A quick utility script for debugging and manual inspection of application data.

**Purpose**:
- Extracts key information from application PDFs using `pdftotext` and `grep`
- Shows what documents are available in each application folder
- Outputs directly to terminal for quick inspection

**Usage**:
```bash
cd /path/to/KJET
./scripts/utils/extract_application_data.sh
```

**Note**: This is a debugging tool, not part of the main extraction pipeline. The main extraction is handled by `scripts/extraction/extract_all_documents.py`.