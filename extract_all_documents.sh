#!/bin/bash

# Simple bash script to extract all document contents
# Uses available system tools for text extraction and OCR

DATA_DIR="/Users/geoff/Downloads/KJET/data"
OUTPUT_DIR="/Users/geoff/Downloads/KJET"
OUTPUT_FILE="$OUTPUT_DIR/all_applications_extracted.txt"

echo "KJET Application Document Extraction" > "$OUTPUT_FILE"
echo "=====================================" >> "$OUTPUT_FILE"
echo "Extraction Date: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check available tools
PDFTOTEXT_AVAILABLE=false
TESSERACT_AVAILABLE=false

if command -v pdftotext >/dev/null 2>&1; then
    PDFTOTEXT_AVAILABLE=true
    echo "✓ pdftotext found"
else
    echo "⚠ pdftotext not found - PDF extraction may be limited"
fi

if command -v tesseract >/dev/null 2>&1; then
    TESSERACT_AVAILABLE=true
    echo "✓ tesseract found"
else
    echo "⚠ tesseract not found - OCR not available"
fi

echo ""

cd "$DATA_DIR" || exit 1

# Process each application folder
for app_folder in application_*_bundle; do
    if [ -d "$app_folder" ]; then
        app_id=${app_folder#application_}
        app_id=${app_id%_bundle}
        
        echo "Processing Application $app_id..."
        
        echo "" >> "$OUTPUT_FILE"
        echo "APPLICATION ID: $app_id" >> "$OUTPUT_FILE"
        echo "=============================" >> "$OUTPUT_FILE"
        echo "Folder: $app_folder" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        
        # Process all files in the folder
        find "$app_folder" -type f | while read -r file; do
            filename=$(basename "$file")
            extension="${filename##*.}"
            extension_lower=$(echo "$extension" | tr '[:upper:]' '[:lower:]')
            
            echo "  Processing: $filename"
            
            echo "" >> "$OUTPUT_FILE"
            echo "DOCUMENT: $filename" >> "$OUTPUT_FILE"
            echo "------------------------" >> "$OUTPUT_FILE"
            echo "File Type: $extension_lower" >> "$OUTPUT_FILE"
            echo "File Size: $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown") bytes" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            echo "CONTENT:" >> "$OUTPUT_FILE"
            
            case "$extension_lower" in
                pdf)
                    if [ "$PDFTOTEXT_AVAILABLE" = true ]; then
                        pdftotext "$file" - >> "$OUTPUT_FILE" 2>/dev/null || echo "ERROR: Could not extract PDF text" >> "$OUTPUT_FILE"
                    else
                        echo "ERROR: pdftotext not available for PDF extraction" >> "$OUTPUT_FILE"
                    fi
                    ;;
                png|jpg|jpeg|tiff|bmp|gif)
                    if [ "$TESSERACT_AVAILABLE" = true ]; then
                        tesseract "$file" stdout 2>/dev/null >> "$OUTPUT_FILE" || echo "ERROR: Could not perform OCR" >> "$OUTPUT_FILE"
                    else
                        echo "ERROR: tesseract not available for OCR" >> "$OUTPUT_FILE"
                    fi
                    ;;
                txt|md)
                    cat "$file" >> "$OUTPUT_FILE" 2>/dev/null || echo "ERROR: Could not read text file" >> "$OUTPUT_FILE"
                    ;;
                *)
                    echo "UNSUPPORTED FILE TYPE: $extension_lower" >> "$OUTPUT_FILE"
                    echo "File exists at: $file" >> "$OUTPUT_FILE"
                    ;;
            esac
            
            echo "" >> "$OUTPUT_FILE"
            echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        done
        
        echo "" >> "$OUTPUT_FILE"
        echo "============================================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

echo ""
echo "Extraction complete!"
echo "Output file: $OUTPUT_FILE"
echo "File size: $(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "unknown") bytes"

# Create a summary
echo ""
echo "EXTRACTION SUMMARY" >> "$OUTPUT_FILE"
echo "==================" >> "$OUTPUT_FILE"
echo "Total applications: $(find "$DATA_DIR" -name "application_*_bundle" -type d | wc -l)" >> "$OUTPUT_FILE"
echo "Total files processed: $(find "$DATA_DIR" -name "application_*_bundle" -type d -exec find {} -type f \; | wc -l)" >> "$OUTPUT_FILE"
echo "Extraction completed: $(date)" >> "$OUTPUT_FILE"