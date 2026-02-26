#!/usr/bin/env python3
"""
Script to combine baseline-first-results.json and baseline-final-results.json
into a single file called baseline-combined.json.

The script merges the two files, ensuring unique application_ids and combining
first and final results data.
"""

import json
import os
import argparse
from collections import defaultdict

def load_json_file(filepath):
    """Load JSON data from file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {filepath}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        return []

def combine_baseline_files(cohort: str = 'latest'):
    """Combine first and final results into a single file."""

    # Define file paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    output_dir = os.path.join(project_root, 'ui', 'public', cohort)

    first_results_path = os.path.join(output_dir, 'baseline-first-results.json')
    final_results_path = os.path.join(output_dir, 'baseline-final-results.json')
    combined_output_path = os.path.join(output_dir, 'baseline-combined.json')

    print(f"Loading first results from: {first_results_path}")
    first_results = load_json_file(first_results_path)

    print(f"Loading final results from: {final_results_path}")
    final_results = load_json_file(final_results_path)

    if not first_results and not final_results:
        print("Error: No data loaded from either file.")
        return

    # Create a dictionary to store combined data by application_id
    combined_data = {}

    # Add first results data
    for record in first_results:
        app_id = record['application_id']
        combined_data[app_id] = {
            'application_id': app_id,
            'county': record['county'],
            'first_weighted_score': record['weighted_score'],
            'first_ranking': record['ranking'],
            'first_county_rank': record.get('county_rank', None),
            'final_weighted_score': None,
            'final_ranking': None,
            'final_county_rank': None
        }

    # Add final results data (merge with existing or create new)
    for record in final_results:
        app_id = record['application_id']
        if app_id in combined_data:
            # Update existing record with final results
            combined_data[app_id]['final_weighted_score'] = record['weighted_score']
            combined_data[app_id]['final_ranking'] = record['ranking']
            combined_data[app_id]['final_county_rank'] = record.get('county_rank', None)
        else:
            # Create new record for applicants only in final results
            combined_data[app_id] = {
                'application_id': app_id,
                'county': record['county'],
                'first_weighted_score': None,
                'first_ranking': None,
                'first_county_rank': None,
                'final_weighted_score': record['weighted_score'],
                'final_ranking': record['ranking'],
                'final_county_rank': record.get('county_rank', None)
            }

    # Convert to list and sort by application_id for consistency
    combined_list = list(combined_data.values())
    combined_list.sort(key=lambda x: x['application_id'])

    # Save combined data
    try:
        with open(combined_output_path, 'w', encoding='utf-8') as f:
            json.dump(combined_list, f, indent=2, ensure_ascii=False)
        print(f"Combined data saved to: {combined_output_path}")
    except Exception as e:
        print(f"Error saving combined file: {e}")
        return

    # Print statistics
    print(f"\nCombination Statistics:")
    print(f"Total unique applicants: {len(combined_list)}")

    # Count applicants by data availability
    both_results = sum(1 for record in combined_list
                      if record['first_weighted_score'] is not None
                      and record['final_weighted_score'] is not None)
    only_first = sum(1 for record in combined_list
                    if record['first_weighted_score'] is not None
                    and record['final_weighted_score'] is None)
    only_final = sum(1 for record in combined_list
                    if record['first_weighted_score'] is None
                    and record['final_weighted_score'] is not None)

    print(f"Applicants with both first and final results: {both_results}")
    print(f"Applicants with only first results: {only_first}")
    print(f"Applicants with only final results: {only_final}")

    # # Show sample of combined data
    # print(f"\nSample combined data (first 5 records):")
    # for i, record in enumerate(combined_list[:5], 1):
    #     print(f"{i}. {record}")

    # County distribution
    county_counts = defaultdict(int)
    for record in combined_list:
        county_counts[record['county']] += 1

    # print(f"\nApplicants by county:")
    # for county, count in sorted(county_counts.items()):
    #     print(f"  {county}: {count} applicants")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Combine baseline first/final results into cohort-scoped output')
    parser.add_argument('--cohort', default='latest', help='Cohort output folder (e.g. latest, c1)')
    args = parser.parse_args()
    combine_baseline_files(cohort=args.cohort)