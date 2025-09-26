#!/usr/bin/env python3
"""
KJET Evaluation Summary Generator
Aggregates evaluation results across all counties
"""

import json
import os
from datetime import datetime

def generate_evaluation_summary():
    """Generate comprehensive summary of all county evaluations"""

    output_dir = "/Users/geoff/Downloads/Nakuru/output-results"
    summary = {
        "summary_metadata": {
            "generation_date": datetime.now().isoformat(),
            "total_counties": 47,
            "evaluation_period": "KJET Program Applications",
            "rules_version": "rules.md - Annex A & B"
        },
        "national_summary": {
            "total_applications": 0,
            "total_eligible": 0,
            "total_ineligible": 0,
            "national_eligibility_rate": 0.0,
            "total_scored": 0,
            "national_average_score": 0.0,
            "highest_county_score": 0.0,
            "lowest_county_score": 100.0
        },
        "eligibility_breakdown": {
            "E1_registration_legality_failures": 0,
            "E2_county_mapping_failures": 0,
            "E3_priority_value_chain_failures": 0,
            "E4_financial_evidence_failures": 0,
            "E5_consent_contactability_failures": 0
        },
        "county_summaries": {},
        "top_performing_counties": [],
        "counties_needing_attention": []
    }

    county_scores = []
    all_scores = []

    # Process each county evaluation file
    for filename in os.listdir(output_dir):
        if filename.endswith('_evaluation_results.json'):
            county_path = os.path.join(output_dir, filename)
            county_name = filename.replace('_evaluation_results.json', '')

            try:
                with open(county_path, 'r', encoding='utf-8') as f:
                    county_data = json.load(f)

                # Extract county summary
                county_summary = {
                    "county": county_name,
                    "total_applications": county_data["eligibility_summary"]["total_applications"],
                    "eligible_applications": county_data["eligibility_summary"]["eligible_applications"],
                    "ineligible_applications": county_data["eligibility_summary"]["ineligible_applications"],
                    "eligibility_rate": county_data["eligibility_summary"]["eligibility_rate"],
                    "scored_applications": county_data["scoring_summary"]["total_scored"],
                    "average_score": county_data["scoring_summary"]["average_score"],
                    "highest_score": county_data["scoring_summary"]["highest_score"],
                    "lowest_score": county_data["scoring_summary"]["lowest_score"],
                    "score_distribution": county_data["scoring_summary"]["score_distribution"]
                }

                summary["county_summaries"][county_name] = county_summary

                # Update national totals
                summary["national_summary"]["total_applications"] += county_summary["total_applications"]
                summary["national_summary"]["total_eligible"] += county_summary["eligible_applications"]
                summary["national_summary"]["total_ineligible"] += county_summary["ineligible_applications"]
                summary["national_summary"]["total_scored"] += county_summary["scored_applications"]

                # Update eligibility breakdown
                failures = county_data["eligibility_summary"]["criteria_failure_breakdown"]
                summary["eligibility_breakdown"]["E1_registration_legality_failures"] += failures["E1_registration_legality"]
                summary["eligibility_breakdown"]["E2_county_mapping_failures"] += failures["E2_county_mapping"]
                summary["eligibility_breakdown"]["E3_priority_value_chain_failures"] += failures["E3_priority_value_chain"]
                summary["eligibility_breakdown"]["E4_financial_evidence_failures"] += failures["E4_financial_evidence"]
                summary["eligibility_breakdown"]["E5_consent_contactability_failures"] += failures["E5_consent_contactability"]

                # Collect scores for averages
                if county_summary["scored_applications"] > 0:
                    county_scores.append(county_summary["average_score"])
                    all_scores.extend([county_summary["average_score"]] * county_summary["scored_applications"])

                    # Track highest/lowest county averages
                    if county_summary["average_score"] > summary["national_summary"]["highest_county_score"]:
                        summary["national_summary"]["highest_county_score"] = county_summary["average_score"]
                    if county_summary["average_score"] < summary["national_summary"]["lowest_county_score"]:
                        summary["national_summary"]["lowest_county_score"] = county_summary["average_score"]

            except Exception as e:
                print(f"Error processing {county_name}: {str(e)}")

    # Calculate national averages
    if summary["national_summary"]["total_applications"] > 0:
        summary["national_summary"]["national_eligibility_rate"] = round(
            summary["national_summary"]["total_eligible"] / summary["national_summary"]["total_applications"] * 100, 2
        )

    if all_scores:
        summary["national_summary"]["national_average_score"] = round(sum(all_scores) / len(all_scores), 2)

    # Identify top and bottom performing counties
    county_list = []
    for county_name, county_data in summary["county_summaries"].items():
        if county_data["scored_applications"] > 0:
            county_list.append({
                "county": county_name,
                "average_score": county_data["average_score"],
                "eligibility_rate": county_data["eligibility_rate"],
                "total_applications": county_data["total_applications"]
            })

    # Sort by average score
    county_list.sort(key=lambda x: x["average_score"], reverse=True)

    # Top 10 performing counties
    summary["top_performing_counties"] = county_list[:10]

    # Counties needing attention (low eligibility rate or low scores)
    attention_counties = []
    for county in county_list:
        if county["eligibility_rate"] < 50 or county["average_score"] < 60:
            attention_counties.append(county)

    summary["counties_needing_attention"] = attention_counties

    # Save summary
    summary_path = os.path.join(output_dir, "national_evaluation_summary.json")
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("✓ National evaluation summary generated successfully!")
    print(f"📊 Total Applications: {summary['national_summary']['total_applications']}")
    print(f"✅ Eligible Applications: {summary['national_summary']['total_eligible']} ({summary['national_summary']['national_eligibility_rate']}%)")
    print(f"📈 National Average Score: {summary['national_summary']['national_average_score']}")
    print(f"🏆 Top County: {summary['top_performing_counties'][0]['county']} ({summary['top_performing_counties'][0]['average_score']})")

    return summary

if __name__ == "__main__":
    generate_evaluation_summary()