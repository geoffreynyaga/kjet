#!/usr/bin/env python3
"""
Analyze the Top 2 county ranking changes to understand the discrepancy
between promoted (19) and kicked out (20) applicants.
"""

import json

def analyze_top2_changes():
    # Load the baseline data
    with open('/Users/geoff/Downloads/KJET/code/public/baseline-combined.json', 'r') as f:
        data = json.load(f)
    
    print("=== TOP 2 COUNTY RANKING ANALYSIS ===\n")
    
    # Find applicants promoted to top 2
    promoted = []
    for item in data:
        if item['first_county_rank'] > 2 and item['final_county_rank'] <= 2:
            promoted.append({
                'id': item['application_id'],
                'county': item['county'],
                'first_rank': item['first_county_rank'],
                'final_rank': item['final_county_rank'],
                'first_score': item['first_weighted_score'],
                'final_score': item['final_weighted_score']
            })
    
    # Find applicants kicked from top 2
    kicked = []
    for item in data:
        if item['first_county_rank'] <= 2 and item['final_county_rank'] > 2:
            kicked.append({
                'id': item['application_id'],
                'county': item['county'],
                'first_rank': item['first_county_rank'],
                'final_rank': item['final_county_rank'],
                'first_score': item['first_weighted_score'],
                'final_score': item['final_weighted_score']
            })
    
    print(f"PROMOTED TO TOP 2: {len(promoted)} applicants")
    print("=" * 50)
    for p in promoted:
        print(f"{p['id']} ({p['county']}) - Rank {p['first_rank']} → {p['final_rank']} | Score {p['first_score']} → {p['final_score']}")
    
    print(f"\nKICKED FROM TOP 2: {len(kicked)} applicants")
    print("=" * 50)
    for k in kicked:
        print(f"{k['id']} ({k['county']}) - Rank {k['first_rank']} → {k['final_rank']} | Score {k['first_score']} → {k['final_score']}")
    
    print(f"\nSUMMARY:")
    print(f"Promoted: {len(promoted)}")
    print(f"Kicked: {len(kicked)}")
    print(f"Net change: {len(promoted) - len(kicked)} (negative = net loss of top 2 positions)")
    
    # Group by county to see which counties had changes
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
    
    print(f"\nCOUNTY-WISE ANALYSIS:")
    print("=" * 50)
    for county, changes in sorted(county_changes.items()):
        net = changes['promoted'] - changes['kicked']
        print(f"{county}: +{changes['promoted']} promoted, -{changes['kicked']} kicked → Net: {net:+d}")
    
    # Find counties that lost net top 2 positions
    net_loss_counties = [county for county, changes in county_changes.items() 
                        if changes['promoted'] - changes['kicked'] < 0]
    
    if net_loss_counties:
        print(f"\nCOUNTIES WITH NET LOSS OF TOP 2 POSITIONS:")
        for county in net_loss_counties:
            changes = county_changes[county]
            net = changes['promoted'] - changes['kicked']
            print(f"  {county}: {net} net loss")

if __name__ == "__main__":
    analyze_top2_changes()