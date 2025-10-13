#!/usr/bin/env python3
"""
Extract JSON data from kjet-human.csv containing application ID, county, weighted score, and ranking.
"""

import csv
import json
import os
import sys

# Import standardized counties list
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'utils'))
from counties import counties

def standardize_county_names(applicants):
    """
    Standardize county names to match the official county list.

    Args:
        applicants (list): List of applicant dictionaries

    Returns:
        list: Updated applicants list with standardized county names
    """
    # Define county name mappings for common variations
    county_mappings = {
        'Elgeyo-Marakwet': 'Elgeiyo Marakwet',
        'Nairobi .': 'Nairobi',
        'kiambu': 'Kiambu',
        'kitui': 'Kitui',
        'MIGORI': 'Migori',
        'Mgori': 'Migori',
        'N/A': 'Unknown',  # Assign to Unknown county instead of filtering out
        'Unknown': 'Unknown',  # Handle already assigned Unknown
    }

    fixed_count = 0
    problematic_applicants = []

    for applicant in applicants:
        original_county = applicant['county']

        if original_county in county_mappings:
            applicant['county'] = county_mappings[original_county]
            fixed_count += 1
            print(f"✅ Fixed: '{original_county}' → '{county_mappings[original_county]}' for {applicant['application_id']}")

    if fixed_count > 0:
        print(f"\n🔧 Standardized {fixed_count} county names")

    if problematic_applicants:
        print(f"\n⚠️  Found {len(problematic_applicants)} applicants with problematic county data that need manual review")

    return applicants

def add_county_rankings(applicants):
    """
    Add county_rank field to each applicant based on their ranking within their county.
    Applicants with score 0 are ranked at the end.

    Args:
        applicants (list): List of applicant dictionaries

    Returns:
        list: Updated applicants list with county_rank field
    """
    # Track unmatched county names
    unmatched_counties = set()
    matched_counties = set()

    # Group applicants by county
    county_groups = {}
    for applicant in applicants:
        county = applicant['county']
        if county not in county_groups:
            county_groups[county] = []
        county_groups[county].append(applicant)

        # Check if county matches standardized list
        if county in counties:
            matched_counties.add(county)
        else:
            unmatched_counties.add(county)

    # Rank applicants within each county
    county_rank_validation_errors = []

    for county, county_applicants in county_groups.items():
        total_applicants_in_county = len(county_applicants)

        # Separate applicants with scores > 0 and scores = 0
        with_scores = [app for app in county_applicants if app['weighted_score'] > 0]
        without_scores = [app for app in county_applicants if app['weighted_score'] == 0]

        # Sort applicants with scores by weighted_score (descending - highest first)
        with_scores.sort(key=lambda x: x['weighted_score'], reverse=True)

        # Assign county rankings
        rank = 1

        # First, rank those with scores
        for applicant in with_scores:
            if rank > total_applicants_in_county:
                county_rank_validation_errors.append({
                    'county': county,
                    'applicant_id': applicant['application_id'],
                    'assigned_rank': rank,
                    'max_possible_rank': total_applicants_in_county
                })
            applicant['county_rank'] = rank
            rank += 1

        # Then, add those without scores at the end
        for applicant in without_scores:
            if rank > total_applicants_in_county:
                county_rank_validation_errors.append({
                    'county': county,
                    'applicant_id': applicant['application_id'],
                    'assigned_rank': rank,
                    'max_possible_rank': total_applicants_in_county
                })
            applicant['county_rank'] = rank
            rank += 1

        # Validate that the final rank equals total applicants (since ranks should be 1 to N)
        max_rank_assigned = max([app['county_rank'] for app in county_applicants]) if county_applicants else 0
        if max_rank_assigned != total_applicants_in_county:
            print(f"⚠️  WARNING: County '{county}' has {total_applicants_in_county} applicants but max rank assigned is {max_rank_assigned}")

    # Report any ranking validation errors
    if county_rank_validation_errors:
        print(f"\n❌ CRITICAL ERROR: Found {len(county_rank_validation_errors)} county ranking validation errors:")
        for error in county_rank_validation_errors:
            print(f"  - {error['applicant_id']} in {error['county']}: rank {error['assigned_rank']} > max possible {error['max_possible_rank']}")
        print("This indicates a logic error in the ranking algorithm!")
    else:
        print(f"\n✅ County ranking validation passed: All ranks are within valid ranges")

    # Print county validation results
    print(f"\n=== County Validation Results ===")
    print(f"Total counties found in data: {len(county_groups)}")
    print(f"Expected counties from standardized list: {len(counties)}")
    print(f"Matched counties: {len(matched_counties)}")
    print(f"Unmatched counties: {len(unmatched_counties)}")

    if unmatched_counties:
        print(f"\n⚠️  WARNING: Found {len(unmatched_counties)} county names that don't match the standardized list:")
        for county in sorted(unmatched_counties):
            print(f"  - '{county}'")
        print("\nThese counties should be standardized to match the official county names.")

    # Show missing counties from the standardized list
    missing_counties = set(counties) - matched_counties
    if missing_counties:
        print(f"\nℹ️  INFO: {len(missing_counties)} standardized counties not found in data:")
        for county in sorted(missing_counties):
            print(f"  - '{county}'")

    # Summary statistics
    print(f"\n=== County Statistics Summary ===")
    print(f"Counties in data: {len(county_groups)}")
    print(f"Counties matching standard list: {len(matched_counties)}")
    print(f"Counties with data issues: {len(unmatched_counties)}")
    print(f"Counties with bad data: {unmatched_counties}")
    print(f"Expected total counties (Kenya): 47")

    if len(matched_counties) == 47:
        print("✅ SUCCESS: All 47 expected counties are present and matched!")
    elif len(county_groups) == 47:
        print("⚠️  WARNING: 47 counties found but some names don't match standardized list")
    else:
        print(f"❌ ERROR: Expected 47 counties, but found {len(county_groups)}")

    return applicants

def extract_applicants_data(csv_file_path):
    """
    Extract applicant data from final results CSV file using proper CSV parsing.

    Args:
        csv_file_path (str): Path to the CSV file to process

    Returns:
        list: List of dictionaries containing application_id, county, weighted_score, and ranking
    """

    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        return []

    applicants = []

    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            # Read all content first to handle multi-line quoted fields
            content = file.read()

            # Fix known malformed patterns before CSV parsing
            content = content.replace("application_162_bundle.zip Applicant 162,Applicant_162", "application_162_bundle.zip,Applicant_162")

            # Parse using proper CSV reader
            import io
            reader = csv.reader(io.StringIO(content))

            rows = list(reader)
            print(f"Read {len(rows)} total rows from CSV")

        # Find data start row (look for first row with application_ pattern)
        data_start_row = None
        for i, row in enumerate(rows):
            if len(row) > 0 and row[0].startswith('application_') and len(row) > 1 and 'Applicant_' in row[1]:
                data_start_row = i
                break

        if data_start_row is None:
            print("Error: Could not find data start row")
            return []

        print(f"Found data starting at row {data_start_row + 1}")

        # Process each data row
        processed_count = 0
        skipped_count = 0

        for row_num in range(data_start_row, len(rows)):
            row = rows[row_num]

            # Skip empty rows or rows that don't start with application_
            if not row or len(row) < 4 or not row[0].startswith('application_'):
                continue

            # Extract the fields we know
            try:
                application_id = row[1].strip() if len(row) > 1 else ""
                county = row[3].strip() if len(row) > 3 else ""
            except:
                skipped_count += 1
                continue

            # Skip only if application_id is missing (county can be fixed later)
            if not application_id:
                skipped_count += 1
                continue

            # If county is missing or problematic, try to fix it
            if not county or county in ['N/A', '']:
                county = 'Unknown'

            # Based on the actual CSV structure:
            # ..., TOTAL, Penalty Points, Sum of weighted scores - Penalty(if any), Ranking from composite score, Evaluator's Name, (empty)
            # Example: [..., 46, 5, 41, 474, , ]
            # So: weighted_score is at row[-4] and ranking is at row[-3]

            weighted_score = 0.0
            ranking = None

            # Get the columns from the end
            if len(row) >= 6:  # Need at least 6 columns to have the scoring data
                try:
                    # Sum of weighted scores is 4th from the end (row[-4])
                    weighted_score_str = row[-4].strip() if len(row) >= 4 and row[-4] else ""
                    weighted_score = float(weighted_score_str) if weighted_score_str and weighted_score_str != '#N/A' else 0.0
                except:
                    weighted_score = 0.0

                try:
                    # Ranking is 3rd from the end (row[-3])
                    ranking_str = row[-3].strip() if len(row) >= 3 and row[-3] else ""
                    ranking = int(ranking_str) if ranking_str and ranking_str != '#N/A' else None
                except:
                    ranking = None

            applicant_data = {
                "application_id": application_id,
                "county": county,
                "weighted_score": weighted_score,
                "ranking": ranking
            }

            applicants.append(applicant_data)
            processed_count += 1

        print(f"Processed {processed_count} records, skipped {skipped_count} invalid records")

        # Deduplicate by application_id (keep the last occurrence)
        unique_applicants = {}
        for applicant in applicants:
            unique_applicants[applicant['application_id']] = applicant

        deduplicated_applicants = list(unique_applicants.values())

        if len(applicants) != len(deduplicated_applicants):
            print(f"⚠️  Removed {len(applicants) - len(deduplicated_applicants)} duplicate records")

        print(f"Successfully extracted {len(deduplicated_applicants)} applicants")
        return deduplicated_applicants

    except Exception as e:
        print(f"Error reading CSV file: {e}")
        import traceback
        traceback.print_exc()
        return []

def extract_first_results_data(csv_file_path):
    """
    Extract applicant data from first results CSV file using proper CSV parsing.

    Args:
        csv_file_path (str): Path to the first results CSV file to process

    Returns:
        list: List of dictionaries containing application_id, county, weighted_score, and ranking
    """

    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        return []

    applicants = []

    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            # Read all content first to handle multi-line quoted fields
            content = file.read()

            # Fix known malformed patterns before CSV parsing
            content = content.replace("application_162_bundle.zip Applicant 162,Applicant_162", "application_162_bundle.zip,Applicant_162")

            # Parse using proper CSV reader
            import io
            reader = csv.reader(io.StringIO(content))

            rows = list(reader)
            print(f"Read {len(rows)} total rows from CSV")

        # Find data start row (look for first row with application_ pattern)
        data_start_row = None
        for i, row in enumerate(rows):
            if len(row) > 0 and row[0].startswith('application_') and len(row) > 1 and 'Applicant_' in row[1]:
                data_start_row = i
                break

        if data_start_row is None:
            print("Error: Could not find data start row")
            return []

        print(f"Found data starting at row {data_start_row + 1}")

        # Process each data row
        processed_count = 0
        skipped_count = 0

        for row_num in range(data_start_row, len(rows)):
            row = rows[row_num]

            # Skip empty rows or rows that don't start with application_
            if not row or len(row) < 4 or not row[0].startswith('application_'):
                continue

            # Extract the fields we know
            try:
                application_id = row[1].strip() if len(row) > 1 else ""
                county = row[3].strip() if len(row) > 3 else ""
            except:
                skipped_count += 1
                continue

            # Skip only if application_id is missing (county can be fixed later)
            if not application_id:
                skipped_count += 1
                continue

            # If county is missing or problematic, try to fix it
            if not county or county in ['N/A', '']:
                county = 'Unknown'

            # For first results, the structure is different
            # Looking at the sample: [...,46,5,41,151]
            # Where: 46 = TOTAL, 5 = Penalty Points, 41 = Sum of weighted scores, 151 = Ranking
            # So the last 4 columns are: TOTAL, Penalty Points, Sum of weighted scores, Ranking

            weighted_score = 0.0
            ranking = None

            # Get the last 4 columns for the scoring data
            if len(row) >= 4:
                try:
                    # Sum of weighted scores is 2nd to last column
                    weighted_score_str = row[-2].strip() if len(row) >= 2 and row[-2] else ""
                    weighted_score = float(weighted_score_str) if weighted_score_str and weighted_score_str != '#N/A' else 0.0
                except:
                    weighted_score = 0.0

                try:
                    # Ranking is last column
                    ranking_str = row[-1].strip() if len(row) >= 1 and row[-1] else ""
                    ranking = int(ranking_str) if ranking_str and ranking_str != '#N/A' else None
                except:
                    ranking = None

            applicant_data = {
                "application_id": application_id,
                "county": county,
                "weighted_score": weighted_score,
                "ranking": ranking
            }

            applicants.append(applicant_data)
            processed_count += 1

        print(f"Processed {processed_count} records, skipped {skipped_count} invalid records")

        # Deduplicate by application_id (keep the last occurrence)
        unique_applicants = {}
        for applicant in applicants:
            unique_applicants[applicant['application_id']] = applicant

        deduplicated_applicants = list(unique_applicants.values())

        if len(applicants) != len(deduplicated_applicants):
            print(f"⚠️  Removed {len(applicants) - len(deduplicated_applicants)} duplicate records")

        print(f"Successfully extracted {len(deduplicated_applicants)} applicants")
        return deduplicated_applicants

    except Exception as e:
        print(f"Error reading CSV file: {e}")
        import traceback
        traceback.print_exc()
        return []

def save_json_output(applicants, output_file_path):
    """
    Save applicants data to JSON file.

    Args:
        applicants (list): List of applicant dictionaries
        output_file_path (str): Path to save the JSON file
    """
    try:
        with open(output_file_path, 'w', encoding='utf-8') as file:
            json.dump(applicants, file, indent=2, ensure_ascii=False)
        print(f"JSON data saved to: {output_file_path}")
    except Exception as e:
        print(f"Error saving JSON file: {e}")

def create_baseline(output_folder, input_csv, output_json_file):
    """Main function to extract and save applicant data."""

    print(f"Extracting applicant data from: {input_csv}")

    # Create output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)

    # Extract the data using appropriate function based on file type
    if "first-results" in input_csv:
        applicants = extract_first_results_data(input_csv)
    else:
        applicants = extract_applicants_data(input_csv)

    if not applicants:
        print("No data extracted. Skipping this file.")
        return

    # Standardize county names
    print("Standardizing county names...")
    applicants = standardize_county_names(applicants)

    # Add county rankings
    print("Calculating county rankings...")
    applicants = add_county_rankings(applicants)

    # Save to JSON
    save_json_output(applicants, output_json_file)

    # Display sample data
    # print("\nSample data (first 5 records):")
    # for i, applicant in enumerate(applicants[:5]):
    #     print(f"{i+1}. {applicant}")

    print(f"\nTotal applicants extracted: {len(applicants)}")

    # Also create a summary by county
    county_counts = {}
    county_avg_scores = {}
    for applicant in applicants:
        county = applicant['county']
        county_counts[county] = county_counts.get(county, 0) + 1
        if county not in county_avg_scores:
            county_avg_scores[county] = []
        county_avg_scores[county].append(applicant['weighted_score'])

    print(f"\nApplicants by county:")
    for county, count in sorted(county_counts.items()):
        avg_score = sum(county_avg_scores[county]) / len(county_avg_scores[county]) if county_avg_scores[county] else 0
        # print(f"  {county}: {count} applicants, avg score: {avg_score:.1f}")

    # Show score distribution
    scores = [app['weighted_score'] for app in applicants if app['weighted_score'] > 0]
    if scores:
        print(f"\nScore statistics:")
        print(f"  Total with scores: {len(scores)}")
        print(f"  Average score: {sum(scores)/len(scores):.1f}")
        print(f"  Highest score: {max(scores):.1f}")
        print(f"  Lowest score: {min(scores):.1f}")

if __name__ == "__main__":
    base_dir = os.getcwd()


    input_first_results = os.path.join(base_dir, "scripts/human/kjet-human-first-results.csv")
    input_final_results = os.path.join(base_dir, "scripts/human/kjet-human-final-results.csv")

    output_folder = os.path.join(base_dir, "code/public")

    output_json_first_result = os.path.join(output_folder, "baseline-first-results.json")
    output_json_final_result = os.path.join(output_folder, "baseline-final-results.json")

    # Extract data from CSV and save it as JSON
    create_baseline(output_folder, input_final_results, output_json_final_result)
    create_baseline(output_folder, input_first_results, output_json_first_result)

