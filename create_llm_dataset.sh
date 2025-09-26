#!/bin/bash

# LLM-optimized extraction script that includes selection criteria and structured data
# for comprehensive application evaluation

DATA_DIR="/Users/geoff/Downloads/Nakuru/data"
OUTPUT_DIR="/Users/geoff/Downloads/Nakuru"
OUTPUT_FILE="$OUTPUT_DIR/llm_evaluation_dataset.txt"
RULES_FILE="/Users/geoff/Downloads/Nakuru/rules.md"

echo "KJET APPLICATION EVALUATION DATASET FOR LLM ANALYSIS" > "$OUTPUT_FILE"
echo "=====================================================" >> "$OUTPUT_FILE"
echo "Extraction Date: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# First, include the selection criteria
echo "SELECTION CRITERIA AND SCORING RUBRICS" >> "$OUTPUT_FILE"
echo "=======================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [ -f "$RULES_FILE" ]; then
    cat "$RULES_FILE" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "=========================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
else
    echo "ERROR: Selection criteria file not found at $RULES_FILE" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

echo "APPLICATION DATA" >> "$OUTPUT_FILE"
echo "================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cd "$DATA_DIR" || exit 1

# Process each application folder
for app_folder in application_*_bundle; do
    if [ -d "$app_folder" ]; then
        app_id=${app_folder#application_}
        app_id=${app_id%_bundle}
        
        echo "Processing Application $app_id..."
        
        echo "" >> "$OUTPUT_FILE"
        echo "╔══════════════════════════════════════════════════════════╗" >> "$OUTPUT_FILE"
        echo "║                    APPLICATION $app_id                     ║" >> "$OUTPUT_FILE"
        echo "╚══════════════════════════════════════════════════════════╝" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        
        # Get list of documents for summary
        echo "DOCUMENTS AVAILABLE:" >> "$OUTPUT_FILE"
        find "$app_folder" -type f -name "*.pdf" -o -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | while read -r file; do
            filename=$(basename "$file")
            echo "  • $filename" >> "$OUTPUT_FILE"
        done
        echo "" >> "$OUTPUT_FILE"
        
        # Process all files in the folder
        find "$app_folder" -type f | sort | while read -r file; do
            filename=$(basename "$file")
            extension="${filename##*.}"
            extension_lower=$(echo "$extension" | tr '[:upper:]' '[:lower:]')
            
            # Skip system files
            if [ "$filename" = ".DS_Store" ]; then
                continue
            fi
            
            echo "" >> "$OUTPUT_FILE"
            echo "┌─────────────────────────────────────────────────────────┐" >> "$OUTPUT_FILE"
            echo "│ DOCUMENT: $filename" >> "$OUTPUT_FILE"
            echo "└─────────────────────────────────────────────────────────┘" >> "$OUTPUT_FILE"
            echo "File Type: $extension_lower" >> "$OUTPUT_FILE"
            echo "File Size: $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown") bytes" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            
            case "$extension_lower" in
                pdf)
                    echo "EXTRACTED TEXT:" >> "$OUTPUT_FILE"
                    echo "───────────────" >> "$OUTPUT_FILE"
                    pdftotext "$file" - >> "$OUTPUT_FILE" 2>/dev/null || echo "ERROR: Could not extract PDF text" >> "$OUTPUT_FILE"
                    ;;
                png|jpg|jpeg|tiff|bmp|gif)
                    echo "OCR EXTRACTED TEXT:" >> "$OUTPUT_FILE"
                    echo "───────────────────" >> "$OUTPUT_FILE"
                    tesseract "$file" stdout 2>/dev/null >> "$OUTPUT_FILE" || echo "ERROR: Could not perform OCR" >> "$OUTPUT_FILE"
                    ;;
                txt|md)
                    echo "FILE CONTENT:" >> "$OUTPUT_FILE"
                    echo "─────────────" >> "$OUTPUT_FILE"
                    cat "$file" >> "$OUTPUT_FILE" 2>/dev/null || echo "ERROR: Could not read text file" >> "$OUTPUT_FILE"
                    ;;
                *)
                    echo "BINARY FILE - CONTENT NOT EXTRACTED" >> "$OUTPUT_FILE"
                    echo "File type: $extension_lower not supported for text extraction" >> "$OUTPUT_FILE"
                    ;;
            esac
            
            echo "" >> "$OUTPUT_FILE"
        done
        
        echo "" >> "$OUTPUT_FILE"
        echo "╔══════════════════════════════════════════════════════════╗" >> "$OUTPUT_FILE"
        echo "║              END OF APPLICATION $app_id                   ║" >> "$OUTPUT_FILE"
        echo "╚══════════════════════════════════════════════════════════╝" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# Add extraction summary
echo "" >> "$OUTPUT_FILE"
echo "╔══════════════════════════════════════════════════════════╗" >> "$OUTPUT_FILE"
echo "║                   EXTRACTION SUMMARY                     ║" >> "$OUTPUT_FILE"
echo "╚══════════════════════════════════════════════════════════╝" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "Total applications processed: $(find "$DATA_DIR" -name "application_*_bundle" -type d | wc -l)" >> "$OUTPUT_FILE"
echo "Total files processed: $(find "$DATA_DIR" -name "application_*_bundle" -type d -exec find {} -type f \; | grep -v ".DS_Store" | wc -l)" >> "$OUTPUT_FILE"
echo "File size: $(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "unknown") bytes" >> "$OUTPUT_FILE"
echo "Extraction completed: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "INSTRUCTIONS FOR LLM ANALYSIS:" >> "$OUTPUT_FILE"
echo "===============================" >> "$OUTPUT_FILE"
echo "1. Review the selection criteria and scoring rubrics above" >> "$OUTPUT_FILE"
echo "2. For each application, evaluate against eligibility criteria (E1-E5)" >> "$OUTPUT_FILE"
echo "3. Score eligible applications using the primary criteria rubrics (A2)" >> "$OUTPUT_FILE"
echo "4. Calculate composite scores using the specified weights" >> "$OUTPUT_FILE"
echo "5. Provide recommendations for each application" >> "$OUTPUT_FILE"

echo ""
echo "LLM-optimized extraction complete!"
echo "Output file: $OUTPUT_FILE"
echo "File size: $(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "unknown") bytes"