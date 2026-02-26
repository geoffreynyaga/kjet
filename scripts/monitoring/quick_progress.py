#!/usr/bin/env python3
"""
Simple progress checker for KJET evaluation
"""

import json
import time
from pathlib import Path
from collections import defaultdict

def check_progress():
    """Check current progress"""
    results_dir = Path("/Users/geoff/Downloads/KJET/fin_results_optimized")
    
    if not results_dir.exists():
        print("❌ Results directory not found")
        return
    
    # Count results by status
    total = 0
    pass_count = 0
    fail_count = 0 
    na_count = 0
    counties_processed = set()
    
    for county_dir in results_dir.iterdir():
        if county_dir.is_dir() and not county_dir.name.startswith('.'):
            counties_processed.add(county_dir.name)
            
            for json_file in county_dir.glob("*_financial_evaluation.json"):
                total += 1
                try:
                    with open(json_file, 'r') as f:
                        data = json.load(f)
                    
                    result = data.get('overall_assessment', {}).get('financial_evaluation', 'N/A')
                    if result == 'PASS':
                        pass_count += 1
                    elif result == 'FAIL':
                        fail_count += 1
                    else:
                        na_count += 1
                except:
                    continue
    
    print(f"📊 Current Progress: {total} applications processed")
    print(f"   ✅ PASS: {pass_count} ({pass_count/max(total,1)*100:.1f}%)")
    print(f"   ❌ FAIL: {fail_count} ({fail_count/max(total,1)*100:.1f}%)")
    print(f"   ⚪ N/A:  {na_count} ({na_count/max(total,1)*100:.1f}%)")
    print(f"🏛️  Counties processed: {len(counties_processed)} - {', '.join(sorted(counties_processed))}")
    
    # Check log file for latest progress
    log_file = Path("/Users/geoff/Downloads/KJET/evaluation_progress.log")
    if log_file.exists():
        with open(log_file, 'r') as f:
            lines = f.readlines()
            
        # Find the last county line
        for line in reversed(lines[-20:]):  # Last 20 lines
            if "Processing county:" in line:
                print(f"🔄 Currently processing: {line.strip().split('Processing county: ')[1]}")
                break
    
    print(f"⏰ Updated: {time.strftime('%H:%M:%S')}")

if __name__ == "__main__":
    check_progress()