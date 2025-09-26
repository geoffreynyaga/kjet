#!/bin/bash

# Script to extract key information from all application PDFs
cd "/Users/geoff/Downloads/Nakuru/data"

echo "Extracting key data from all applications..."
echo "=========================================="

for app_dir in application_*_bundle; do
    app_id=${app_dir#application_}
    app_id=${app_id%_bundle}
    
    echo ""
    echo "APPLICATION $app_id"
    echo "=================="
    
    # Extract key fields
    pdftotext "$app_dir/application_info_$app_id.pdf" - | grep -A 1 -E "name of your cluster|registration number|county|value chain|2024.*turnover|2024.*profit" | head -20
    
    echo "Documents available:"
    ls "$app_dir" | grep -v "application_info"
    echo ""
done