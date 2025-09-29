#!/usr/bin/env python3
"""
Script to convert CSV files in the gemini folder to JSON format for LLM analysis dashboard.
"""

import csv
import json
import os
import sys
from pathlib import Path

def extract_county_name(filename):
    """Extract county name from filename (remove .csv extension and capitalize)"""
    return filename.replace('.csv', '').replace('_', ' ').title()

def parse_score_breakdown(row, criteria_prefixes):
    """Parse score breakdown for each criterion"""
    breakdown = {}
    for prefix in criteria_prefixes:
        score_key = f"{prefix} Score"
        reason_key = f"{prefix} Reason"

        if score_key in row and row[score_key].strip():
            score = float(row[score_key]) if row[score_key] else 0.0
            reason = row[reason_key] if reason_key in row else ""
            breakdown[prefix] = {
                "score": score,
                "reason": reason
            }
    return breakdown

def convert_csv_to_json(csv_file_path):
    """Convert a single CSV file to JSON format"""
    county_name = extract_county_name(os.path.basename(csv_file_path))

    ranked_applicants = []
    ineligible_applicants = []

    # Define the criteria prefixes
    criteria_prefixes = [
        "S1_Registration_Track_Record_5%",
        "S2_Financial_Position_20%",
        "S3_Market_Demand_Competitiveness_20%",
        "S4_Business_Proposal_Viability_25%",
        "S5_Value_Chain_Alignment_10%",
        "S6_Inclusivity_Sustainability_20%"
    ]

    # Selection criteria weights (fixed for all counties based on the example)
    selection_criteria_weights = {
        "S1_Registration_Track_Record_5%": 0.05,
        "S2_Financial_Position_20%": 0.20,
        "S3_Market_Demand_Competitiveness_20%": 0.20,
        "S4_Business_Proposal_Viability_25%": 0.25,
        "S5_Value_Chain_Alignment_10%": 0.10,
        "S6_Inclusivity_Sustainability_20%": 0.20
    }

    try:
        with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                # Skip empty rows
                if not row.get('Application ID', '').strip():
                    continue

                rank = row.get('Rank', '').strip()
                application_id = row.get('Application ID', '').strip()
                applicant_name = row.get('Applicant Name', '').strip()
                eligibility_status = row.get('Eligibility Status', '').strip()
                composite_score = float(row.get('Composite Score', '0')) if row.get('Composite Score', '').strip() else 0.0

                if eligibility_status.lower() == 'eligible' and rank:
                    # This is a ranked applicant
                    score_breakdown = parse_score_breakdown(row, criteria_prefixes)

                    applicant = {
                        "rank": int(float(rank)),
                        "application_id": application_id,
                        "applicant_name": applicant_name,
                        "eligibility_status": eligibility_status,
                        "composite_score": composite_score,
                        "score_breakdown": score_breakdown
                    }
                    ranked_applicants.append(applicant)

                elif eligibility_status.lower() == 'ineligible':
                    # This is an ineligible applicant
                    ineligibility_criterion = row.get('Ineligibility Criterion Failed', '').strip()
                    reason = row.get('Reason', '').strip()

                    ineligible_applicant = {
                        "application_id": application_id,
                        "applicant_name": applicant_name,
                        "eligibility_status": eligibility_status,
                        "ineligibility_criterion_failed": ineligibility_criterion,
                        "reason": reason
                    }
                    ineligible_applicants.append(ineligible_applicant)

        # Sort ranked applicants by rank
        ranked_applicants.sort(key=lambda x: x['rank'])

        # Create the JSON structure
        json_data = {
            "report_title": f"KJET {county_name} County Application Ranking and Evaluation",
            "selection_criteria_weights": selection_criteria_weights,
            "ranked_applicants": ranked_applicants,
            "ineligible_applicants": ineligible_applicants
        }

        return json_data

    except Exception as e:
        print(f"Error processing {csv_file_path}: {str(e)}")
        return None

def main():
    """Main function to process all CSV files in the gemini folder"""
    # Get the directory of this script
    script_dir = Path(__file__).parent
    gemini_dir = script_dir / "public" / "gemini"

    # If running from a different location, adjust the path
    if not gemini_dir.exists():
        gemini_dir = Path.cwd() / "code" / "public" / "gemini"

    if not gemini_dir.exists():
        print(f"Gemini directory not found at {gemini_dir}")
        sys.exit(1)

    print(f"Processing CSV files in: {gemini_dir}")

    # Find all CSV files
    csv_files = list(gemini_dir.glob("*.csv"))

    if not csv_files:
        print("No CSV files found in the gemini directory.")
        return

    print(f"Found {len(csv_files)} CSV file(s) to process:")

    for csv_file in csv_files:
        print(f"  - {csv_file.name}")

        # Convert CSV to JSON
        json_data = convert_csv_to_json(csv_file)

        if json_data:
            # Create output JSON file path
            json_file_path = csv_file.with_suffix('.json')

            # Write JSON file
            with open(json_file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(json_data, jsonfile, indent=2, ensure_ascii=False)

            print(f"  ✓ Converted {csv_file.name} -> {json_file_path.name}")
        else:
            print(f"  ✗ Failed to convert {csv_file.name}")

    print("\nConversion complete!")

if __name__ == "__main__":
    main()