#!/usr/bin/env python3
"""
Real-time monitor for KJET financial evaluation progress
"""

import json
import time
import os
from pathlib import Path
from collections import defaultdict

def get_progress_stats():
    results_dir = Path("/Users/geoff/Downloads/KJET/fin_results_enhanced")
    
    if not results_dir.exists():
        return None
    
    stats = {
        'total_files': 0,
        'pass_count': 0,
        'fail_count': 0,
        'na_count': 0,
        'counties': defaultdict(lambda: {'total': 0, 'pass': 0, 'fail': 0, 'na': 0}),
        'score_distribution': defaultdict(int)
    }
    
    # Process each county
    for county_dir in results_dir.iterdir():
        if county_dir.is_dir() and not county_dir.name.startswith('.'):
            county = county_dir.name
            json_files = list(county_dir.glob("*_financial_evaluation.json"))
            
            for json_file in json_files:
                try:
                    with open(json_file, 'r') as f:
                        data = json.load(f)
                        
                    # Get overall result
                    result = data.get('overall_assessment', {}).get('financial_evaluation', 'N/A')
                    score = data.get('primary_criteria_scores', {}).get('A3_2_financial_position', {}).get('score', 'N/A')
                    
                    # Update totals
                    stats['total_files'] += 1
                    stats['counties'][county]['total'] += 1
                    
                    # Update counts
                    if result == 'PASS':
                        stats['pass_count'] += 1
                        stats['counties'][county]['pass'] += 1
                    elif result == 'FAIL':
                        stats['fail_count'] += 1
                        stats['counties'][county]['fail'] += 1
                    else:
                        stats['na_count'] += 1
                        stats['counties'][county]['na'] += 1
                    
                    # Score distribution
                    if score != 'N/A':
                        stats['score_distribution'][score] += 1
                    else:
                        stats['score_distribution']['N/A'] += 1
                        
                except Exception as e:
                    continue
    
    return stats

def display_progress():
    """Display progress in a nice format"""
    stats = get_progress_stats()
    
    if not stats:
        print("📂 Results directory not found. Script may still be initializing...")
        return
    
    total = stats['total_files']
    if total == 0:
        print("📊 No results found yet. Processing may be starting...")
        return
    
    # Header
    print(f"\\n{'='*80}")
    print(f"🎯 KJET FINANCIAL EVALUATION PROGRESS")
    print(f"{'='*80}")
    
    # Overall stats
    print(f"📊 Overall Progress: {total} applications processed")
    print(f"   ✅ PASS: {stats['pass_count']} ({stats['pass_count']/total*100:.1f}%)")
    print(f"   ❌ FAIL: {stats['fail_count']} ({stats['fail_count']/total*100:.1f}%)")
    print(f"   ⚪ N/A:  {stats['na_count']} ({stats['na_count']/total*100:.1f}%)")
    
    # Score distribution
    print(f"\\n📈 Score Distribution:")
    for score in ['5/5', '4/5', '3/5', '2/5', '1/5', 'N/A']:
        count = stats['score_distribution'].get(score, 0)
        if count > 0:
            print(f"   {score}: {count} applications ({count/total*100:.1f}%)")
    
    # County breakdown
    print(f"\\n🏛️  County Progress:")
    for county, county_stats in sorted(stats['counties'].items()):
        ct = county_stats['total']
        cp = county_stats['pass'] 
        cf = county_stats['fail']
        cn = county_stats['na']
        
        print(f"   {county:20} | {ct:3d} total | ✅{cp:2d} | ❌{cf:2d} | ⚪{cn:2d}")
    
    print(f"\\n🕐 Last updated: {time.strftime('%H:%M:%S')}")
    print(f"{'='*80}")

def main():
    print("🚀 Starting KJET Financial Evaluation Monitor...")
    print("Press Ctrl+C to stop monitoring\\n")
    
    try:
        while True:
            # Clear screen (works on most terminals)
            os.system('clear' if os.name == 'posix' else 'cls')
            
            display_progress()
            time.sleep(10)  # Update every 10 seconds
            
    except KeyboardInterrupt:
        print("\\n\\n🛑 Monitoring stopped.")
        # Final stats
        display_progress()

if __name__ == "__main__":
    main()