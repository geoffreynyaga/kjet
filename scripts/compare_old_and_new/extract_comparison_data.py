#!/usr/bin/env python3
"""
Script to extract data from comparison.csv file and convert to JSON format.
Skips the first row and uses the second row as column headers.
"""

import csv
import json
import os
import re
from pathlib import Path

def extract_applicant_id(bundle_link):
    """Extract applicant ID from bundle link."""
    # Pattern to match application_XXX_bundle format
    match = re.search(r'application_(\d+)_bundle', bundle_link)
    if match:
        return f"Applicant {match.group(1)}"
    return bundle_link  # Return original if no match found

def extract_comparison_data():
    """Extract data from comparison.csv and convert to JSON format."""

    # Get the script directory and CSV file path
    script_dir = Path(__file__).parent
    csv_file = script_dir / "comparison.csv"

    # Save output to code/public/ folder
    workspace_root = script_dir.parent.parent  # Go up two levels from scripts/compare_old_and_new/
    output_dir = workspace_root / "code" / "public"
    output_dir.mkdir(parents=True, exist_ok=True)  # Create directory if it doesn't exist
    output_file = output_dir / "comparison_data.json"

    if not csv_file.exists():
        print(f"Error: {csv_file} not found!")
        return

    data = []

    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file)

            # Skip the first row
            next(csv_reader)

            # Get the headers from the second row
            headers = next(csv_reader)

            # Clean up headers - remove empty strings and strip whitespace
            headers = [header.strip() for header in headers if header.strip()]

            print(f"Headers found: {headers}")

            # Read data rows
            for row_num, row in enumerate(csv_reader, start=3):  # Start from row 3 for error reporting
                if any(cell.strip() for cell in row):  # Skip empty rows
                    # Create a dictionary for this row
                    row_data = {}

                    # Map each value to its corresponding header
                    for i, header in enumerate(headers):
                        if i < len(row):
                            # Convert numeric values if possible
                            cell_value = row[i].strip()

                            # Special handling for the bundle link column
                            if header == "Link to application bundle":
                                row_data["Application ID"] = extract_applicant_id(cell_value)
                            elif cell_value.isdigit():
                                row_data[header] = int(cell_value)
                            else:
                                row_data[header] = cell_value
                        else:
                            if header == "Link to application bundle":
                                row_data["Application ID"] = ""
                            else:
                                row_data[header] = ""

                    data.append(row_data)

        # Write to JSON file
        with open(output_file, 'w', encoding='utf-8') as json_file:
            json.dump(data, json_file, indent=2, ensure_ascii=False)

        print(f"Successfully extracted {len(data)} records from {csv_file}")
        print(f"Output saved to: {output_file}")

        # Display first few records as preview
        if data:
            print("\nFirst 3 records preview:")
            for i, record in enumerate(data[:3]):
                print(f"Record {i+1}: {record}")

        return data

    except Exception as e:
        print(f"Error processing file: {e}")
        return None

if __name__ == "__main__":
    extract_comparison_data()