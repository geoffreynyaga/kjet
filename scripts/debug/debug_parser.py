#!/usr/bin/env python3
"""
Debug script to test financial parsing
"""

import subprocess
import re
from pathlib import Path

def test_mpesa_parsing():
    pdf_path = "/Users/geoff/Downloads/KJET/data/Baringo/application_220_bundle/Mpesa Statements_6856c907b4bb3_MPESA_Statement_2024-06-21_to_2025-06-21.pdf"
    
    # Extract text
    result = subprocess.run(
        ['pdftotext', '-layout', pdf_path, '-'],
        capture_output=True, text=True, timeout=15
    )
    
    if result.returncode == 0:
        text = result.stdout.strip()
        print(f"Text length: {len(text)}")
        print(f"First 500 chars:\\n{text[:500]}")
        print("\\n" + "="*50)
        
        # Test financial data detection
        financial_keywords = [
            'kes', 'ksh', 'amount', 'balance', 'payment', 'receipt', 
            'mpesa', 'bank', 'account', 'transaction', 'total', 'sum',
            'income', 'revenue', 'turnover', 'sales'
        ]
        text_lower = text.lower()
        found_keywords = [kw for kw in financial_keywords if kw in text_lower]
        print(f"Financial keywords found: {found_keywords}")
        
        # Test MPESA parsing
        if 'mpesa' in text.lower() or 'safaricom' in text.lower():
            print("\\nTesting MPESA parsing...")
            
            # Look for totals
            patterns = [
                r'total.*?([0-9,]+\.?\d*)',
                r'([0-9,]+\.?\d*).*?total',
                r'paid in.*?([0-9,]+\.?\d*)',
                r'paid out.*?([0-9,]+\.?\d*)'
            ]
            
            for i, pattern in enumerate(patterns):
                matches = re.findall(pattern, text, re.IGNORECASE)
                print(f"Pattern {i+1}: {matches[:5]}")  # First 5 matches
            
            # Look for all amounts
            all_amounts = re.findall(r'([0-9,]+\.[0-9]{2})', text)
            print(f"\\nAll decimal amounts found: {len(all_amounts)}")
            if all_amounts:
                print("First 10:", all_amounts[:10])
                print("Last 10:", all_amounts[-10:])

if __name__ == "__main__":
    test_mpesa_parsing()