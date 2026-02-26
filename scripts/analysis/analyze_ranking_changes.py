#!/usr/bin/env python3
"""
Analyze county ranking changes to understand the discrepancy
between promoted and kicked out applicants across cohorts.
"""

import json
import argparse
from pathlib import Path

def analyze_ranking_changes(cohort="latest", top_n=6, base_dir="ui/public"):
    # Load the baseline data
    project_dir = Path(__file__).parent.parent.parent
    data_path = project_dir / base_dir / cohort / "baseline-combined.json"
    
    if not data_path.exists():
        # Fallback to general location
        data_path = project_dir / base_dir / "baseline-combined.json"
        if not data_path.exists():
            print(f"Error: Baseline data not found at {data_path}")
            return

    print(f"=== TOP {top_n} COUNTY RANKING ANALYSIS (Cohort: {cohort}) ===\n")
    print(f"Loading data from: {data_path}")
    
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return
    
    # Find applicants promoted to top N
    promoted = []
    for item in data:
        # Check if first_county_rank and final_county_rank exist
        first_rank = item.get('first_county_rank') or item.get('rank')
        final_rank = item.get('final_county_rank') or item.get('rank')
        
        if first_rank and final_rank:
            if first_rank > top_n and final_rank <= top_n:
                promoted.append({
                    'id': item.get('application_id', 'Unknown'),
                    'county': item.get('county', 'Unknown'),
                    'first_rank': first_rank,
                    'final_rank': final_rank,
                    'first_score': item.get('first_weighted_score', 0),
                    'final_score': item.get('final_weighted_score', 0)
                })
    
    # Find applicants kicked from top N
    kicked = []
    for item in data:
        first_rank = item.get('first_county_rank') or item.get('rank')
        final_rank = item.get('final_county_rank') or item.get('rank')
        
        if first_rank and final_rank:
            if first_rank <= top_n and final_rank > top_n:
                kicked.append({
                    'id': item.get('application_id', 'Unknown'),
                    'county': item.get('county', 'Unknown'),
                    'first_rank': first_rank,
                    'final_rank': final_rank,
                    'first_score': item.get('first_weighted_score', 0),
                    'final_score': item.get('final_weighted_score', 0)
                })
    
    print(f"PROMOTED TO TOP {top_n}: {len(promoted)} applicants")
    print("=" * 50)
    for p in promoted:
        print(f"{p['id']} ({p['county']}) - Rank {p['first_rank']} → {p['final_rank']} | Score {p['first_score']} → {p['final_score']}")
    
    print(f"\nKICKED FROM TOP {top_n}: {len(kicked)} applicants")
    print("=" * 50)
    for k in kicked:
        print(f"{k['id']} ({k['county']}) - Rank {k['first_rank']} → {k['final_rank']} | Score {k['first_score']} → {k['final_score']}")
    
    print(f"\nSUMMARY:")
    print(f"Promoted: {len(promoted)}")
    print(f"Kicked: {len(kicked)}")
    print(f"Net change: {len(promoted) - len(kicked)} (negative = net loss of top positions)")
    
    # Group by county
    county_changes = {}
    for p in promoted:
        county = p['county']
        if county not in county_changes:
            county_changes[county] = {'promoted': 0, 'kicked': 0}
        county_changes[county]['promoted'] += 1
    
    for k in kicked:
        county = k['county']
        if county not in county_changes:
            county_changes[county] = {'promoted': 0, 'kicked': 0}
        county_changes[county]['kicked'] += 1
    
    if county_changes:
        print(f"\nCOUNTY-WISE ANALYSIS:")
        print("=" * 50)
        for county, changes in sorted(county_changes.items()):
            net = changes['promoted'] - changes['kicked']
            print(f"{county}: +{changes['promoted']} promoted, -{changes['kicked']} kicked → Net: {net:+d}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze ranking changes")
    parser.add_argument("--cohort", type=str, default="latest", help="Cohort name")
    parser.add_argument("--top-n", type=int, default=6, help="Top N to analyze")
    
    args = parser.parse_args()
    analyze_ranking_changes(cohort=args.cohort, top_n=args.top_n)