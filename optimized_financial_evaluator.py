#!/usr/bin/env python3
"""
Optimized KJET Financial Evaluation Script with Smart OCR
Processes all applications efficiently with OCR fallback only when needed
"""

import os
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
import traceback
import tempfile
from concurrent.futures import ThreadPoolExecutor
import signal
import sys

class OptimizedKJETEvaluator:
    def __init__(self, data_dir, output_dir):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.evaluation_date = datetime.now().strftime("%Y-%m-%d")
        
        # Financial scoring thresholds from rules.md
        self.financial_thresholds = {
            5: 10_000_000,  # ≥ KES 10M
            4: 5_000_000,   # 5-<10M  
            3: 1_000_000,   # 1-<5M
            2: 100_000,     # 100K-1M
            1: 10_000,      # 10K-100K
            0: 0            # No evidence
        }
        
        self.warnings = []
        self.processed_count = 0
        self.success_count = 0
        self.na_count = 0
        self.ocr_attempts = 0
        self.ocr_successes = 0
        
        # Setup signal handler for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        
    def signal_handler(self, sig, frame):
        print("\\n🛑 Interrupted! Generating summary of processed results...")
        self.generate_summary_report()
        sys.exit(0)
        
    def extract_text_smart(self, pdf_path):
        """Smart text extraction: try pdftotext first, OCR only if needed"""
        try:
            # First try pdftotext for machine-readable PDFs
            result = subprocess.run(
                ['pdftotext', '-layout', str(pdf_path), '-'],
                capture_output=True, text=True, timeout=15
            )
            
            if result.returncode == 0 and result.stdout.strip():
                text = result.stdout.strip()
                # Check if it's meaningful content (not just scanned gibberish)
                word_count = len(text.split())
                
                if word_count > 20:
                    # Check for common scanned document indicators
                    scanned_indicators = ['camscanner', 'scanner', 'scanned']
                    if not any(indicator in text.lower() for indicator in scanned_indicators):
                        return text, 'pdftotext'
                    
                    # Even if scanned, check if there's actual financial data
                    if self.has_financial_data(text):
                        return text, 'pdftotext'
            
            # Only use OCR for documents that seem to have financial content but poor text extraction
            if self.should_try_ocr(pdf_path):
                return self.ocr_extract_optimized(pdf_path)
            else:
                return None, 'skipped_ocr'
            
        except Exception as e:
            self.warnings.append(f"Text extraction failed for {pdf_path}: {str(e)}")
            return None, 'failed'
    
    def has_financial_data(self, text):
        """Quick check if text contains financial indicators"""
        financial_keywords = [
            'kes', 'ksh', 'amount', 'balance', 'payment', 'receipt', 
            'mpesa', 'bank', 'account', 'transaction', 'total', 'sum',
            'income', 'revenue', 'turnover', 'sales'
        ]
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in financial_keywords)
    
    def should_try_ocr(self, pdf_path):
        """Decide if OCR is worth trying based on file characteristics"""
        try:
            # Check file size (very large files might be image-heavy)
            file_size = pdf_path.stat().st_size
            if file_size > 10_000_000:  # 10MB
                return False
                
            # Check filename for financial indicators
            filename_lower = pdf_path.name.lower()
            financial_indicators = ['mpesa', 'bank', 'financial', 'statement', 'income']
            if any(indicator in filename_lower for indicator in financial_indicators):
                return True
                
            return False
            
        except:
            return False
    
    def ocr_extract_optimized(self, pdf_path):
        """Optimized OCR extraction with timeouts and page limits"""
        self.ocr_attempts += 1
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Convert only first 2 pages to images (faster)
                result = subprocess.run([
                    'pdftoppm', '-png', '-r', '200', '-f', '1', '-l', '2',
                    str(pdf_path), f"{temp_dir}/page"
                ], capture_output=True, timeout=30)
                
                if result.returncode != 0:
                    return None, 'pdf_conversion_failed'
                
                # Find generated images
                image_files = sorted(Path(temp_dir).glob("page-*.png"))
                if not image_files:
                    return None, 'no_images_generated'
                
                # OCR the images with timeout
                all_text = []
                for img_file in image_files[:2]:  # Max 2 pages
                    try:
                        ocr_result = subprocess.run([
                            'tesseract', str(img_file), '-', '-l', 'eng',
                            '--psm', '6'  # Uniform block of text
                        ], capture_output=True, text=True, timeout=20)
                        
                        if ocr_result.returncode == 0 and ocr_result.stdout.strip():
                            text = ocr_result.stdout.strip()
                            if len(text) > 50:  # Meaningful amount of text
                                all_text.append(text)
                    except subprocess.TimeoutExpired:
                        continue
                
                if all_text:
                    combined_text = '\\n\\n'.join(all_text)
                    self.ocr_successes += 1
                    return combined_text, 'ocr'
                else:
                    return None, 'ocr_no_text'
                    
        except Exception as e:
            self.warnings.append(f"OCR failed for {pdf_path}: {str(e)}")
            return None, 'ocr_error'
    
    def find_financial_documents(self, bundle_path):
        """Find financial documents in application bundle"""
        financial_docs = []
        
        for file in bundle_path.glob("*.pdf"):
            filename_lower = file.name.lower()
            
            # Skip non-financial documents
            if any(skip in filename_lower for skip in [
                'application_info', 'registration_certificate', 'business registration'
            ]):
                continue
                
            # Identify financial documents
            if any(fin_type in filename_lower for fin_type in [
                'mpesa', 'bank', 'financial', 'statement', 'income', 'balance', 'cashflow'
            ]):
                financial_docs.append(file)
        
        return financial_docs
    
    def extract_financial_metrics(self, text, extraction_method):
        """Extract financial metrics from text"""
        if not text or len(text.strip()) < 50:
            return None
            
        try:
            # MPESA Statement parsing (most common and reliable)
            if 'mpesa' in text.lower() or 'safaricom' in text.lower():
                return self.parse_mpesa_statement(text)
            
            # Bank statement parsing
            elif any(bank in text.lower() for bank in ['bank', 'account', 'balance']):
                return self.parse_bank_statement(text)
            
            # Financial statement parsing
            elif any(fs in text.lower() for fs in ['income', 'revenue', 'turnover', 'sales']):
                return self.parse_financial_statement(text)
            
            # Generic financial document
            else:
                return self.parse_generic_financial(text)
                
        except Exception as e:
            self.warnings.append(f"Financial metrics extraction error: {str(e)}")
            return None
    
    def parse_mpesa_statement(self, text):
        """Parse MPESA statement - most reliable method"""
        try:
            # Look for summary totals in various formats
            patterns = [
                r'total.*?([0-9,]+\.?\d*)',
                r'([0-9,]+\.?\d*).*?total',
                r'paid in.*?([0-9,]+\.?\d*)',
                r'paid out.*?([0-9,]+\.?\d*)'
            ]
            
            amounts = []
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    try:
                        val = float(match.replace(',', ''))
                        if 1000 <= val <= 100_000_000:
                            amounts.append(val)
                    except:
                        continue
            
            if len(amounts) >= 2:
                amounts.sort(reverse=True)
                paid_in = amounts[0]
                paid_out = amounts[1]
            else:
                # Fallback: find all monetary amounts
                all_amounts = re.findall(r'([0-9,]+\.\d{2})', text)
                if len(all_amounts) >= 5:
                    float_amounts = []
                    for amt in all_amounts:
                        try:
                            val = float(amt.replace(',', ''))
                            if val >= 1000:
                                float_amounts.append(val)
                        except:
                            continue
                    
                    if float_amounts:
                        float_amounts.sort(reverse=True)
                        paid_in = float_amounts[0]
                        paid_out = float_amounts[1] if len(float_amounts) > 1 else paid_in * 0.8
                    else:
                        return None
                else:
                    return None
            
            # Determine confidence
            confidence = 'high' if 'verification code' in text.lower() else 'medium'
            
            return {
                'type': 'MPESA_STATEMENT',
                'total_inflow': paid_in,
                'total_outflow': paid_out,
                'net_position': paid_in - paid_out,
                'period': 'Unknown',
                'confidence': confidence
            }
            
        except Exception:
            return None
    
    def parse_bank_statement(self, text):
        """Parse bank statement"""
        try:
            amounts = re.findall(r'([0-9,]+\.?\d*)', text)
            if len(amounts) < 5:
                return None
            
            float_amounts = []
            for amount in amounts:
                try:
                    val = float(amount.replace(',', ''))
                    if 1000 <= val <= 100_000_000:
                        float_amounts.append(val)
                except:
                    continue
            
            if len(float_amounts) < 3:
                return None
            
            total_turnover = sum(float_amounts[:10])  # Top 10 amounts
            
            return {
                'type': 'BANK_STATEMENT',
                'total_inflow': total_turnover,
                'total_outflow': total_turnover * 0.8,
                'net_position': total_turnover * 0.2,
                'period': 'Unknown',
                'confidence': 'medium'
            }
            
        except Exception:
            return None
    
    def parse_financial_statement(self, text):
        """Parse formal financial statements"""
        try:
            # Look for revenue/income figures
            revenue_patterns = [
                r'revenue:?\s*([0-9,]+\.?\d*)',
                r'income:?\s*([0-9,]+\.?\d*)', 
                r'turnover:?\s*([0-9,]+\.?\d*)',
                r'sales:?\s*([0-9,]+\.?\d*)'
            ]
            
            revenues = []
            for pattern in revenue_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    try:
                        val = float(match.replace(',', ''))
                        if 10_000 <= val <= 1_000_000_000:
                            revenues.append(val)
                    except:
                        continue
            
            if not revenues:
                return None
            
            max_revenue = max(revenues)
            
            return {
                'type': 'FINANCIAL_STATEMENT',
                'total_inflow': max_revenue,
                'total_outflow': max_revenue * 0.7,
                'net_position': max_revenue * 0.3,
                'period': 'Unknown',
                'confidence': 'high'
            }
            
        except Exception:
            return None
    
    def parse_generic_financial(self, text):
        """Parse generic financial document"""
        try:
            amounts = re.findall(r'([0-9,]+\.?\d*)', text)
            
            float_amounts = []
            for amount in amounts:
                try:
                    val = float(amount.replace(',', ''))
                    if 1000 <= val <= 50_000_000:
                        float_amounts.append(val)
                except:
                    continue
            
            if len(float_amounts) < 2:
                return None
            
            max_amount = max(float_amounts)
            
            return {
                'type': 'GENERIC_FINANCIAL',
                'total_inflow': max_amount,
                'total_outflow': max_amount * 0.5,
                'net_position': max_amount * 0.5,
                'period': 'Unknown',
                'confidence': 'low'
            }
            
        except Exception:
            return None
    
    def calculate_financial_score(self, financial_data):
        """Calculate financial score based on rules.md"""
        if not financial_data:
            return "N/A", "No financial evidence", "N/A"
            
        turnover = max(financial_data.get('total_inflow', 0), 
                      financial_data.get('total_outflow', 0))
        
        confidence = financial_data.get('confidence', 'low')
        
        # Determine score based on turnover
        if turnover >= self.financial_thresholds[5]:
            score = 5
            reason = f"Turnover ≥ KES 10M ({turnover:,.0f})"
        elif turnover >= self.financial_thresholds[4]:
            score = 4
            reason = f"Turnover 5-10M ({turnover:,.0f})"
        elif turnover >= self.financial_thresholds[3]:
            score = 3
            reason = f"Turnover 1-5M ({turnover:,.0f})"
        elif turnover >= self.financial_thresholds[2]:
            score = 2
            reason = f"Turnover 100K-1M ({turnover:,.0f})"
        elif turnover >= self.financial_thresholds[1]:
            score = 1
            reason = f"Turnover 10K-100K ({turnover:,.0f})"
        else:
            score = "N/A"
            reason = "Insufficient financial evidence"
        
        # Adjust based on confidence for low confidence scores
        if confidence == 'low' and isinstance(score, int) and score > 2:
            score = max(2, score - 1)
            reason += " (adjusted for low confidence)"
        
        if score == "N/A":
            status = "N/A"
        elif isinstance(score, int):
            status = "PASS" if score >= 3 else "FAIL"
        else:
            status = "N/A"
        
        return f"{score}/5" if isinstance(score, int) else "N/A", reason, status
    
    def evaluate_application(self, county, application_bundle):
        """Evaluate a single application"""
        bundle_path = self.data_dir / county / application_bundle
        
        if not bundle_path.exists():
            return None
        
        # Extract application ID
        app_id_match = re.search(r'application_(\\d+)_bundle', application_bundle)
        app_id = app_id_match.group(1) if app_id_match else "unknown"
        
        try:
            # Find financial documents
            financial_docs = self.find_financial_documents(bundle_path)
            
            if not financial_docs:
                return {
                    "application_id": app_id,
                    "county": county,
                    "evaluation_date": self.evaluation_date,
                    "overall_assessment": {"financial_evaluation": "N/A"},
                    "primary_criteria_scores": {
                        "A3_2_financial_position": {
                            "score": "N/A",
                            "result": "N/A", 
                            "reason": "No financial documents found"
                        }
                    }
                }
            
            # Analyze financial documents
            best_financial_data = None
            processing_method = None
            
            for doc in financial_docs:
                text, method = self.extract_text_smart(doc)
                
                if text:
                    financial_data = self.extract_financial_metrics(text, method)
                    if financial_data:
                        if (not best_financial_data or 
                            financial_data.get('total_inflow', 0) > best_financial_data.get('total_inflow', 0)):
                            best_financial_data = financial_data
                            processing_method = method
                        break  # Use first successful document
            
            # Calculate scores
            score, reason, status = self.calculate_financial_score(best_financial_data)
            
            # Create result
            result = {
                "application_id": app_id,
                "county": county,
                "evaluation_date": self.evaluation_date,
                "primary_criteria_scores": {
                    "A3_2_financial_position": {
                        "score": score,
                        "result": status,
                        "reason": reason
                    }
                },
                "overall_assessment": {
                    "financial_evaluation": status,
                    "processing_method": processing_method or "N/A"
                }
            }
            
            if best_financial_data:
                result["financial_details"] = {
                    "total_inflow": best_financial_data.get('total_inflow', 0),
                    "document_type": best_financial_data['type'],
                    "confidence": best_financial_data.get('confidence', 'unknown')
                }
            
            return result
            
        except Exception as e:
            self.warnings.append(f"Error evaluating {county}/{application_bundle}: {str(e)}")
            return None
    
    def process_all_applications(self):
        """Process all applications"""
        print(f"🚀 Starting optimized financial evaluation...")
        print(f"📁 Data directory: {self.data_dir}")
        print(f"📁 Output directory: {self.output_dir}")
        
        # Create output directory
        self.output_dir.mkdir(exist_ok=True)
        
        # Process each county
        for county_dir in sorted(self.data_dir.iterdir()):
            if not county_dir.is_dir() or county_dir.name.startswith('.'):
                continue
                
            county = county_dir.name
            print(f"\\n🏛️  Processing county: {county}")
            
            # Create county output directory
            county_output_dir = self.output_dir / county
            county_output_dir.mkdir(exist_ok=True)
            
            # Get applications
            applications = [d for d in county_dir.iterdir() 
                          if d.is_dir() and 'application' in d.name.lower()]
            
            for app_bundle in sorted(applications):
                self.processed_count += 1
                print(f"  📋 {self.processed_count}: {app_bundle.name}", end=" ... ")
                
                result = self.evaluate_application(county, app_bundle.name)
                
                if result:
                    # Save result
                    output_file = county_output_dir / f"{result['application_id']}_financial_evaluation.json"
                    with open(output_file, 'w') as f:
                        json.dump(result, f, indent=2)
                    
                    status = result['overall_assessment']['financial_evaluation']
                    score = result['primary_criteria_scores']['A3_2_financial_position']['score']
                    
                    if status == "N/A":
                        self.na_count += 1
                        print(f"N/A ({score})")
                    elif status == "PASS":
                        self.success_count += 1
                        print(f"PASS ({score})")
                    else:
                        print(f"FAIL ({score})")
                else:
                    print("ERROR")
        
        # Generate summary
        self.generate_summary_report()
        
        print(f"\\n{'='*60}")
        print(f"🎯 PROCESSING COMPLETE")
        print(f"{'='*60}")
        print(f"📊 Total applications: {self.processed_count}")
        print(f"✅ Successful evaluations: {self.success_count}")
        print(f"⚪ N/A evaluations: {self.na_count}")
        print(f"❌ Failed evaluations: {self.processed_count - self.success_count - self.na_count}")
        print(f"🔍 OCR attempts: {self.ocr_attempts}")
        print(f"🎯 OCR successes: {self.ocr_successes}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print(f"📁 Results saved to: {self.output_dir}")
    
    def generate_summary_report(self):
        """Generate summary report"""
        summary = {
            "evaluation_date": self.evaluation_date,
            "total_processed": self.processed_count,
            "successful_evaluations": self.success_count,
            "na_evaluations": self.na_count,
            "failed_evaluations": self.processed_count - self.success_count - self.na_count,
            "ocr_attempts": self.ocr_attempts,
            "ocr_successes": self.ocr_successes,
            "ocr_success_rate": f"{(self.ocr_successes/max(self.ocr_attempts,1))*100:.1f}%",
            "warnings_count": len(self.warnings),
            "methodology": {
                "text_extraction": ["pdftotext (primary)", "OCR (fallback)"],
                "scoring_criteria": {
                    "5_points": "≥ KES 10M turnover",
                    "4_points": "KES 5-10M turnover",
                    "3_points": "KES 1-5M turnover", 
                    "2_points": "KES 100K-1M turnover",
                    "1_point": "KES 10K-100K turnover",
                    "N/A": "No readable financial documents"
                }
            },
            "warnings": self.warnings[:25]  # First 25 warnings
        }
        
        with open(self.output_dir / "optimized_evaluation_summary.json", 'w') as f:
            json.dump(summary, f, indent=2)

def main():
    evaluator = OptimizedKJETEvaluator(
        data_dir="/Users/geoff/Downloads/KJET/data",
        output_dir="/Users/geoff/Downloads/KJET/fin_results_optimized"
    )
    evaluator.process_all_applications()

if __name__ == "__main__":
    main()