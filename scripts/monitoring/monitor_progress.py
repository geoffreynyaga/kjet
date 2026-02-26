#!/usr/bin/env python3
"""
Monitor the progress of KJET financial evaluation
"""

import json
import time
from pathlib import Path

def monitor_progress():
    results_dir = Path("/Users/geoff/Downloads/KJET/fin_results_optimized")
    
    if not results_dir.exists():
        print("Results directory not found")
        return
    
    while True:
        total_files = 0
        pass_count = 0
        fail_count = 0
        na_count = 0
        
        # Count files in all county directories
        for county_dir in results_dir.iterdir():
            if county_dir.is_dir():
                json_files = list(county_dir.glob("*_financial_evaluation.json"))
                total_files += len(json_files)
                
                # Count results
                for json_file in json_files:
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
        
        print(f"\\r📊 Progress: {total_files} processed | ✅ {pass_count} PASS | ❌ {fail_count} FAIL | ⚪ {na_count} N/A", end="", flush=True)
        time.sleep(5)

if __name__ == "__main__":
    try:
        monitor_progress()
    except KeyboardInterrupt:
        print("\\n🛑 Monitoring stopped")