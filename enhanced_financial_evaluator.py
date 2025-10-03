#!/usr/bin/env python3
"""
Enhanced KJET Financial Evaluation Script with OCR Support
Processes all applications with improved OCR for scanned documents
"""

import os
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
import traceback
import tempfile

class EnhancedKJETEvaluator:
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
        
    def extract_text_with_ocr(self, pdf_path):
        """Extract text using both pdftotext and OCR fallback"""
        try:
            # First try pdftotext for machine-readable PDFs
            result = subprocess.run(
                ['pdftotext', '-layout', str(pdf_path), '-'],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0 and result.stdout.strip():
                text = result.stdout.strip()
                # Check if it's just scanned content (CamScanner, etc.)
                if len(text.split()) > 10 and not all(word in ['CamScanner', 'camscanner', ''] for word in text.split()[:20]):
                    return text, 'pdftotext'
            
            # Fallback to OCR using Tesseract
            return self.ocr_extract(pdf_path)
            
        except Exception as e:
            self.warnings.append(f"Text extraction failed for {pdf_path}: {str(e)}")
            return None, 'failed'
    
    def ocr_extract(self, pdf_path):
        """Extract text using OCR (Tesseract)"""
        try:
            # Convert PDF to images and OCR
            with tempfile.TemporaryDirectory() as temp_dir:
                # Convert PDF to PNG using pdftoppm
                result = subprocess.run([
                    'pdftoppm', '-png', '-r', '300', str(pdf_path), 
                    f"{temp_dir}/page"
                ], capture_output=True, timeout=60)
                
                if result.returncode != 0:
                    return None, 'pdf_conversion_failed'
                
                # Find generated images
                image_files = sorted(Path(temp_dir).glob("page-*.png"))
                if not image_files:
                    return None, 'no_images_generated'
                
                # OCR each page (limit to first 3 pages for performance)
                all_text = []
                for img_file in image_files[:3]:
                    ocr_result = subprocess.run([
                        'tesseract', str(img_file), '-', '-l', 'eng'
                    ], capture_output=True, text=True, timeout=30)
                    
                    if ocr_result.returncode == 0 and ocr_result.stdout.strip():
                        all_text.append(ocr_result.stdout.strip())
                
                if all_text:
                    combined_text = '\\n\\n'.join(all_text)
                    return combined_text, 'ocr'
                else:
                    return None, 'ocr_failed'
                    
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
            # MPESA Statement parsing
            if 'mpesa' in text.lower() or 'safaricom' in text.lower():
                return self.parse_mpesa_statement(text)
            
            # Bank statement parsing
            elif any(bank in text.lower() for bank in ['bank', 'account', 'balance', 'deposit', 'withdrawal']):
                return self.parse_bank_statement(text)
            
            # Financial statement parsing (Income, Balance Sheet, etc.)
            elif any(fs in text.lower() for fs in ['income', 'revenue', 'profit', 'loss', 'assets', 'liabilities']):
                return self.parse_financial_statement(text)
            
            # Generic financial document
            else:
                return self.parse_generic_financial(text)
                
        except Exception as e:
            self.warnings.append(f"Financial metrics extraction error: {str(e)}")
            return None
    
    def parse_mpesa_statement(self, text):
        """Parse MPESA statement"""
        try:
            # Look for summary totals
            paid_in_pattern = r'TOTAL:?\s*([0-9,]+\.?\d*)'
            matches = re.findall(paid_in_pattern, text)
            
            if len(matches) >= 2:
                paid_in = float(matches[-2].replace(',', ''))
                paid_out = float(matches[-1].replace(',', ''))
            else:
                # Alternative parsing
                amounts = re.findall(r'([0-9,]+\.\d{2})', text)
                if len(amounts) >= 10:
                    # Take largest amounts as potential totals
                    float_amounts = [float(a.replace(',', '')) for a in amounts]
                    float_amounts.sort(reverse=True)
                    paid_in = float_amounts[0]
                    paid_out = float_amounts[1] if len(float_amounts) > 1 else 0
                else:
                    return None
            
            # Extract period
            period_match = re.search(r'Statement Period:?\s*(.+)', text)
            period = period_match.group(1).strip() if period_match else "Unknown"
            
            # Count business indicators
            business_count = len(re.findall(r'Business|Salary|Merchant|Payment', text, re.IGNORECASE))
            
            return {
                'type': 'MPESA_STATEMENT',
                'total_inflow': paid_in,
                'total_outflow': paid_out,
                'net_position': paid_in - paid_out,
                'period': period,
                'business_indicators': business_count,
                'confidence': 'high' if 'verification code' in text.lower() else 'medium'
            }
            
        except Exception as e:
            self.warnings.append(f"MPESA parsing error: {str(e)}")
            return None
    
    def parse_bank_statement(self, text):
        """Parse bank statement"""
        try:
            # Extract monetary amounts
            amounts = re.findall(r'([0-9,]+\.?\d*)', text)
            if len(amounts) < 5:
                return None
            
            # Convert to floats and analyze
            float_amounts = []
            for amount in amounts:
                try:
                    val = float(amount.replace(',', ''))
                    if 1000 <= val <= 100_000_000:  # Reasonable range
                        float_amounts.append(val)
                except:
                    continue
            
            if len(float_amounts) < 3:
                return None
            
            # Estimate turnover as sum of significant transactions
            total_turnover = sum(float_amounts)
            avg_transaction = sum(float_amounts) / len(float_amounts)
            
            # Extract account info
            account_match = re.search(r'account\s*(?:no|number)?:?\s*([0-9]+)', text, re.IGNORECASE)
            account_info = account_match.group(1) if account_match else "Unknown"
            
            return {
                'type': 'BANK_STATEMENT',
                'total_inflow': total_turnover,
                'total_outflow': total_turnover * 0.8,  # Estimate
                'net_position': total_turnover * 0.2,   # Estimate
                'period': 'Unknown',
                'business_indicators': len(re.findall(r'salary|business|payment|deposit', text, re.IGNORECASE)),
                'confidence': 'medium',
                'account_info': account_info
            }
            
        except Exception as e:
            self.warnings.append(f"Bank statement parsing error: {str(e)}")
            return None
    
    def parse_financial_statement(self, text):
        """Parse formal financial statements (Income, Balance Sheet, etc.)"""
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
                        if 10_000 <= val <= 1_000_000_000:  # Reasonable range
                            revenues.append(val)
                    except:
                        continue
            
            if not revenues:
                return None
            
            max_revenue = max(revenues)
            
            # Look for expenses
            expense_patterns = [
                r'expenses?:?\s*([0-9,]+\.?\d*)',
                r'costs?:?\s*([0-9,]+\.?\d*)'
            ]
            
            expenses = []
            for pattern in expense_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    try:
                        val = float(match.replace(',', ''))
                        if val <= max_revenue * 2:  # Reasonable expense
                            expenses.append(val)
                    except:
                        continue
            
            total_expenses = max(expenses) if expenses else max_revenue * 0.7
            
            return {
                'type': 'FINANCIAL_STATEMENT',
                'total_inflow': max_revenue,
                'total_outflow': total_expenses,
                'net_position': max_revenue - total_expenses,
                'period': 'Unknown',
                'business_indicators': 5,  # Formal statements indicate business activity
                'confidence': 'high'
            }
            
        except Exception as e:
            self.warnings.append(f"Financial statement parsing error: {str(e)}")
            return None
    
    def parse_generic_financial(self, text):
        """Parse generic financial document"""
        try:
            # Extract all monetary amounts
            amounts = re.findall(r'([0-9,]+\.?\d*)', text)
            
            float_amounts = []
            for amount in amounts:
                try:
                    val = float(amount.replace(',', ''))
                    if 1000 <= val <= 100_000_000:
                        float_amounts.append(val)
                except:
                    continue
            
            if len(float_amounts) < 2:
                return None
            
            # Use largest amount as primary indicator
            max_amount = max(float_amounts)
            
            return {
                'type': 'GENERIC_FINANCIAL',
                'total_inflow': max_amount,
                'total_outflow': max_amount * 0.5,
                'net_position': max_amount * 0.5,
                'period': 'Unknown',
                'business_indicators': 1,
                'confidence': 'low'
            }
            
        except Exception as e:
            return None
    
    def calculate_financial_score(self, financial_data):
        """Calculate financial score based on rules.md"""
        if not financial_data:
            return 0, "No financial evidence", "N/A"
            
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
            score = 0
            reason = "Insufficient financial evidence"
        
        # Adjust based on confidence
        if confidence == 'low' and score > 2:
            score = max(2, score - 1)
            reason += " (adjusted for low confidence)"
        
        status = "PASS" if score >= 3 else "FAIL" if score > 0 else "N/A"
        
        return score, reason, status
    
    def extract_application_info(self, bundle_path):
        """Extract application information"""
        info_file = None
        
        for file in bundle_path.glob("*.pdf"):
            if 'application_info' in file.name.lower():
                info_file = file
                break
        
        if not info_file:
            return {"cluster_name": "Unknown", "application_number": "Unknown"}
        
        text, method = self.extract_text_with_ocr(info_file)
        if not text:
            return {"cluster_name": "Unknown", "application_number": "Unknown"}
        
        # Extract cluster name
        cluster_patterns = [
            r'name of your cluster[?:]*\s*(.+)',
            r'cluster name[?:]*\s*(.+)',
            r'organization name[?:]*\s*(.+)'
        ]
        
        cluster_name = "Unknown"
        for pattern in cluster_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                cluster_name = match.group(1).strip()[:100]  # Limit length
                break
        
        # Extract application number
        app_patterns = [
            r'application number[?:]*\s*([A-Z0-9-]+)',
            r'app(?:lication)?\s*no[?:]*\s*([A-Z0-9-]+)'
        ]
        
        app_number = "Unknown"
        for pattern in app_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                app_number = match.group(1).strip()
                break
        
        return {
            "cluster_name": cluster_name,
            "application_number": app_number
        }
    
    def evaluate_application(self, county, application_bundle):
        """Evaluate a single application"""
        bundle_path = self.data_dir / county / application_bundle
        
        if not bundle_path.exists():
            return None
        
        # Extract application ID
        app_id_match = re.search(r'application_(\d+)_bundle', application_bundle)
        app_id = app_id_match.group(1) if app_id_match else "unknown"
        
        try:
            # Get application info
            app_info = self.extract_application_info(bundle_path)
            
            # Find financial documents
            financial_docs = self.find_financial_documents(bundle_path)
            
            if not financial_docs:
                return {
                    "application_id": app_id,
                    "cluster_name": app_info["cluster_name"],
                    "county": county,
                    "evaluation_date": self.evaluation_date,
                    "eligibility_assessment": {
                        "E4_minimum_financial_evidence": {
                            "result": "N/A",
                            "reason": "No financial documents found"
                        }
                    },
                    "primary_criteria_scores": {
                        "A3_2_financial_position": {
                            "score": "N/A",
                            "result": "N/A", 
                            "reason": "No financial documents to evaluate"
                        }
                    },
                    "overall_assessment": {
                        "financial_evaluation": "N/A",
                        "key_strengths": [],
                        "limitations": ["No financial documents provided"]
                    }
                }
            
            # Analyze financial documents
            best_financial_data = None
            doc_results = []
            
            for doc in financial_docs:
                print(f"    Analyzing: {doc.name}")
                text, method = self.extract_text_with_ocr(doc)
                
                if text:
                    financial_data = self.extract_financial_metrics(text, method)
                    if financial_data:
                        doc_results.append({
                            'document': doc.name,
                            'method': method,
                            'data': financial_data
                        })
                        
                        # Keep best financial data
                        if (not best_financial_data or 
                            financial_data.get('total_inflow', 0) > best_financial_data.get('total_inflow', 0)):
                            best_financial_data = financial_data
                else:
                    doc_results.append({
                        'document': doc.name,
                        'method': 'failed',
                        'data': None
                    })
            
            if not best_financial_data:
                return {
                    "application_id": app_id,
                    "cluster_name": app_info["cluster_name"],
                    "county": county,
                    "evaluation_date": self.evaluation_date,
                    "eligibility_assessment": {
                        "E4_minimum_financial_evidence": {
                            "result": "N/A",
                            "reason": f"Financial documents could not be processed: {[d.name for d in financial_docs]}"
                        }
                    },
                    "primary_criteria_scores": {
                        "A3_2_financial_position": {
                            "score": "N/A",
                            "result": "N/A",
                            "reason": "Financial documents unreadable"
                        }
                    },
                    "overall_assessment": {
                        "financial_evaluation": "N/A",
                        "key_strengths": [],
                        "limitations": ["Financial documents could not be processed"]
                    },
                    "processing_details": doc_results
                }
            
            # Calculate scores
            score, reason, status = self.calculate_financial_score(best_financial_data)
            
            # Create result
            result = {
                "application_id": app_id,
                "cluster_name": app_info["cluster_name"],
                "county": county,
                "evaluation_date": self.evaluation_date,
                "eligibility_assessment": {
                    "E4_minimum_financial_evidence": {
                        "result": "PASS" if score > 0 else "N/A",
                        "reason": f"{best_financial_data['type']} processed via {doc_results[0]['method']}"
                    }
                },
                "primary_criteria_scores": {
                    "A3_2_financial_position": {
                        "score": f"{score}/5" if score > 0 else "N/A",
                        "result": status,
                        "reason": reason
                    }
                },
                "overall_assessment": {
                    "financial_evaluation": status,
                    "key_strengths": [
                        f"Turnover: KES {best_financial_data.get('total_inflow', 0):,.0f}",
                        f"Document type: {best_financial_data['type']}",
                        f"Processing method: {doc_results[0]['method']}"
                    ] if score > 0 else [],
                    "limitations": [
                        f"Confidence level: {best_financial_data.get('confidence', 'unknown')}",
                        "Assessment limited to financial criteria only"
                    ]
                },
                "financial_details": {
                    "total_inflow": best_financial_data.get('total_inflow', 0),
                    "total_outflow": best_financial_data.get('total_outflow', 0),
                    "net_position": best_financial_data.get('net_position', 0),
                    "confidence": best_financial_data.get('confidence', 'unknown')
                } if score > 0 else {}
            }
            
            return result
            
        except Exception as e:
            self.warnings.append(f"Error evaluating {county}/{application_bundle}: {str(e)}")
            return None
    
    def process_all_applications(self):
        """Process all applications"""
        print(f"🚀 Starting enhanced financial evaluation with OCR support...")
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
                print(f"  📋 Processing: {app_bundle.name}")
                
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
                        print(f"    ⚪ N/A - Score: {score}")
                    elif status == "PASS":
                        self.success_count += 1
                        print(f"    ✅ PASS - Score: {score}")
                    else:
                        print(f"    ❌ FAIL - Score: {score}")
                else:
                    print(f"    💥 Processing failed")
        
        # Generate summary
        self.generate_summary_report()
        
        print(f"\\n{'='*60}")
        print(f"🎯 PROCESSING COMPLETE")
        print(f"{'='*60}")
        print(f"📊 Total applications: {self.processed_count}")
        print(f"✅ Successful evaluations: {self.success_count}")
        print(f"⚪ N/A evaluations: {self.na_count}")
        print(f"❌ Failed evaluations: {self.processed_count - self.success_count - self.na_count}")
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
            "warnings_count": len(self.warnings),
            "methodology": {
                "text_extraction": ["pdftotext", "OCR (Tesseract)"],
                "document_types": ["MPESA statements", "Bank statements", "Financial statements", "Generic financial documents"],
                "scoring_criteria": {
                    "5_points": "≥ KES 10M turnover",
                    "4_points": "KES 5-10M turnover",
                    "3_points": "KES 1-5M turnover", 
                    "2_points": "KES 100K-1M turnover",
                    "1_point": "KES 10K-100K turnover",
                    "0_points": "< KES 10K or no evidence",
                    "N/A": "Documents unreadable or missing"
                }
            },
            "warnings": self.warnings[:50]  # First 50 warnings
        }
        
        with open(self.output_dir / "enhanced_evaluation_summary.json", 'w') as f:
            json.dump(summary, f, indent=2)

def main():
    evaluator = EnhancedKJETEvaluator(
        data_dir="/Users/geoff/Downloads/KJET/data",
        output_dir="/Users/geoff/Downloads/KJET/fin_results_enhanced"
    )
    evaluator.process_all_applications()

if __name__ == "__main__":
    main()