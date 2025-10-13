#!/usr/bin/env python3
"""
Debug script to analyze the 6 missing applicants and why they're not being processed.
"""

import json

# The 6 missing applicants
missing_applicants = [
    "Applicant 440",
    "Applicant 442",
    "Applicant 574",
    "Applicant 579",
    "Applicant 583",
    "Applicant 674"
]

print("=== ANALYSIS OF 6 MISSING APPLICANTS ===\n")

# Load original comparison data
try:
    with open('code/public/comparison_data.json', 'r') as f:
        original_data = json.load(f)

    print(f"Original comparison data has {len(original_data)} records")

    # Find these applicants in the original data
    missing_records = []
    for applicant in missing_applicants:
        for record in original_data:
            if record.get("Application ID") == applicant:
                missing_records.append(record)
                break

    print(f"Found {len(missing_records)} of the missing applicants in original data\n")

    # Print details of each missing applicant
    for i, record in enumerate(missing_records, 1):
        print(f"{i}. {record['Application ID']}")
        print(f"   County: {record.get('County', 'N/A')}")
        print(f"   First Score: {record.get('ONLY PASS', 'N/A')}")
        print(f"   Final Score: {record.get('ALL SCORED', 'N/A')}")
        print(f"   First Rank: {record.get('FIRST RANK', 'N/A')}")
        print(f"   Final Rank: {record.get('FINAL RANK', 'N/A')}")
        print()

except Exception as e:
    print(f"Error reading original data: {e}")

# Load baseline data to confirm they're missing
try:
    with open('code/public/baseline-combined.json', 'r') as f:
        baseline_data = json.load(f)

    baseline_ids = [record['application_id'].replace('_', ' ') for record in baseline_data]

    print(f"Baseline data has {len(baseline_data)} records")
    print("Confirming these applicants are missing from baseline:")

    for applicant in missing_applicants:
        if applicant in baseline_ids:
            print(f"   ❌ ERROR: {applicant} found in baseline (should be missing)")
        else:
            print(f"   ✅ CONFIRMED: {applicant} missing from baseline")

except Exception as e:
    print(f"Error reading baseline data: {e}")

print("\n=== ROOT CAUSE ANALYSIS ===")
print("These applicants are missing because:")
print("1. CSV parsing errors due to unescaped newlines in quoted fields")
print("2. Malformed CSV structure breaking line-by-line processing")
print("3. The baseline.py script cannot handle multi-line CSV fields properly")

print("\n=== SOLUTION REQUIRED ===")
print("Need to enhance the CSV parsing in baseline.py to handle:")
print("- Multi-line quoted fields")
print("- Proper CSV parsing instead of line-by-line processing")
print("- Better error handling for malformed records")