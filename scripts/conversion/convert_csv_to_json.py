#!/usr/bin/env python3
"""
Script to convert CSV files in the gemini folder to JSON format for LLM analysis dashboard.
"""

import csv
import json
import os
import sys
import argparse
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
            # --- START FIX ---
            try:
                # 1. Strip whitespace
                score_str = row[score_key].strip()
                # 2. Attempt conversion to float
                score = float(score_str)
            except ValueError:
                # 3. Handle non-numeric values (e.g., 'minutes)' or empty strings)
                # Default to 0.0 if conversion fails
                score = 0.0
            # --- END FIX ---

            reason = row[reason_key] if reason_key in row else ""

            breakdown[prefix] = {
                "score": score,
                "reason": reason
            }
    return breakdown

def convert_csv_to_json(csv_file_path, cohort="latest"):
    """Convert a single CSV file to JSON format"""
    county_name = extract_county_name(os.path.basename(csv_file_path))

    applications = []

    # Define the criteria prefixes
    criteria_prefixes = [
        "S1_Registration_Track_Record_5%",
        "S2_Financial_Position_20%",
        "S3_Market_Demand_Competitiveness_20%",
        "S4_Business_Proposal_Viability_25%",
        "S5_Value_Chain_Alignment_10%",
        "S6_Inclusivity_Sustainability_20%"
    ]

    # Selection criteria weights
    if cohort == "c1":
        selection_criteria_weights = {
            "S1_Registration_Track_Record_5%": 0.10,
            "S2_Financial_Position_20%": 0.20,
            "S3_Market_Demand_Competitiveness_20%": 0.20,
            "S4_Business_Proposal_Viability_25%": 0.25,
            "S5_Value_Chain_Alignment_10%": 0.15,
            "S6_Inclusivity_Sustainability_20%": 0.10
        }
    else:
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

            row_count = 0
            for row in reader:
                row_count += 1
                # Skip empty rows
                if not row.get('Application ID', '').strip():
                    continue

                rank = row.get('Rank', '').strip()
                application_id = row.get('Application ID', '').strip()
                applicant_name = row.get('Applicant Name', '').strip()
                eligibility_status = row.get('Eligibility Status', '').strip()

                # Skip rows with missing essential data
                if (not application_id or application_id.upper() == 'MISSING DATA' or
                    not applicant_name or applicant_name.upper() == 'MISSING DATA' or
                    not eligibility_status or eligibility_status.upper() == 'MISSING DATA'):
                    continue

                # Handle eligibility status case variations
                eligibility_status = eligibility_status.upper()

                # --- FIX FOR COMPOSITE SCORE ---
                composite_score_str = row.get('Composite Score', '').strip()
                try:
                    # Attempt conversion to float
                    composite_score = float(composite_score_str) if composite_score_str.upper() != 'MISSING DATA' else 0.0
                except ValueError:
                    # If conversion fails (e.g., 'MISSING DATA' or ' minutes)'), default to 0.0
                    composite_score = 0.0

                # Create a unified applicant record for all applications
                applicant = {
                    "application_id": application_id,
                    "applicant_name": applicant_name,
                    "eligibility_status": eligibility_status,
                }

                if eligibility_status == 'ELIGIBLE' and rank and rank.upper() != 'MISSING DATA':
                    # This is a ranked applicant - add ranking and scoring details
                    score_breakdown = parse_score_breakdown(row, criteria_prefixes)

                    try:
                        rank_value = int(float(rank))
                    except ValueError:
                        rank_value = None

                    applicant.update({
                        "rank": rank_value,
                        "composite_score": composite_score,
                        "score_breakdown": score_breakdown
                    })

                elif eligibility_status == 'INELIGIBLE':
                    # This is an ineligible applicant - add ineligibility details
                    ineligibility_criterion = row.get('Ineligibility Criterion Failed', '').strip()
                    reason = row.get('Reason', '').strip()

                    applicant.update({
                        "rank": None,
                        "composite_score": None,
                        "score_breakdown": None,
                        "ineligibility_criterion_failed": ineligibility_criterion,
                        "reason": reason
                    })

                applications.append(applicant)

        # Sort applications: ranked applicants first (by rank), then ineligible applicants
        applications.sort(key=lambda x: (x.get('rank') is None, x.get('rank') if x.get('rank') is not None else 0))

        # Create the JSON structure
        json_data = {
            "report_title": f"KJET {county_name} County Application Ranking and Evaluation",
            "selection_criteria_weights": selection_criteria_weights,
            "applications": applications
        }

        return json_data

    except Exception as e:
        print(f"Error processing {csv_file_path}: {str(e)}")
        return None

def main():
    """Main function to process all CSV files in the cohort folder"""
    parser = argparse.ArgumentParser(description="Convert CSV files to JSON for dashboard")
    parser.add_argument("--cohort", type=str, default="latest", help="Cohort name (c1 or latest)")
    parser.add_argument("--base-dir", type=str, default="ui/public", help="Base directory for JSON data")
    
    args = parser.parse_args()
    
    # Get the directory of this project
    project_dir = Path(__file__).parent.parent.parent
    gemini_dir = project_dir / args.base_dir / args.cohort / "gemini"

    if not gemini_dir.exists():
        print(f"Cohort directory not found at {gemini_dir}")
        # Fallback to gemini folder if exists
        gemini_dir = project_dir / args.base_dir / "gemini"
        if not gemini_dir.exists():
            print(f"Fallback gemini directory also not found at {gemini_dir}")
            sys.exit(1)

    print(f"Processing CSV files in: {gemini_dir}")

    # Find all CSV files
    csv_files = list(gemini_dir.glob("*.csv"))

    if not csv_files:
        print(f"No CSV files found in {gemini_dir}.")
        return

    print(f"Found {len(csv_files)} CSV file(s) to process:")
    
    county_names = []
    for csv_file in csv_files:
        county_name = extract_county_name(csv_file.name)
        county_names.append(county_name)
        print(f"  - {csv_file.name}")

        # Convert CSV to JSON
        json_data = convert_csv_to_json(csv_file, cohort=args.cohort)

        if json_data:
            # Create output JSON file path
            json_file_path = csv_file.with_suffix('.json')

            # Write JSON file
            with open(json_file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(json_data, jsonfile, indent=2, ensure_ascii=False)

            print(f"  ✓ Converted {csv_file.name} -> {json_file_path.name}")
        else:
            print(f"  ✗ Failed to convert {csv_file.name}")

    # Write counties.json manifest for the UI
    county_names.sort()
    counties_manifest_path = gemini_dir.parent / "counties.json"
    with open(counties_manifest_path, 'w', encoding='utf-8') as f:
        json.dump({"counties": county_names}, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Generated manifest: {counties_manifest_path.name}")
    print("Conversion complete!")

if __name__ == "__main__":
    main()