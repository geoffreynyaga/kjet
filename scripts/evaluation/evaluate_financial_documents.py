#!/usr/bin/env python3
"""
KJET Financial Evaluation Script
Processes all applications in data/ directory and evaluates financial documents
according to rules.md criteria, generating simplified JSON results.
"""

import os
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
import traceback

class KJETFinancialEvaluator:
    def __init__(self, data_dir, output_dir, rules_file):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.rules_file = Path(rules_file)
        self.evaluation_date = datetime.now().strftime("%Y-%m-%d")
        
        # Financial scoring thresholds from rules.md
        self.financial_thresholds = {
            5: 10_000_000,  # ≥ KES 10M
            4: 5_000_000,   # 5-<10M  
            3: 1_000_000,   # 1-<5M
            2: 1_000_000,   # <1M (but some records)
            1: 0,           # Minimal/irregular
            0: 0            # No evidence
        }
        
        self.warnings = []
        self.processed_count = 0
        self.success_count = 0
        self.error_count = 0
    
    def extract_pdf_text(self, pdf_path):
        """Extract text from PDF using pdftotext"""
        try:
            result = subprocess.run(
                ['pdftotext', '-layout', str(pdf_path), '-'],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode == 0:
                return result.stdout
            else:
                return None
        except Exception as e:
            self.warnings.append(f"PDF extraction failed for {pdf_path}: {str(e)}")
            return None
    
    def find_financial_documents(self, bundle_path):
        """Find financial documents in application bundle"""
        financial_docs = []
        
        # Refined skip list
        skip_patterns = [
            'application_info', 
            'registration_certificate', 
            'business registration',
            'compliance',
            'kjet_forms',
            'application_kjet',
            'supporting_documents_registration',
            'memo_and_articles',
            'cr12',
            'cr13'
        ]
        
        for file in bundle_path.glob("*.pdf"):
            filename_lower = file.name.lower()
            
            # Skip application info and registration certificate
            if any(skip in filename_lower for skip in skip_patterns):
                continue
                
            # Identify financial documents
            if any(fin_type in filename_lower for fin_type in [
                'mpesa', 'bank', 'financial', 'statement', 'income', 'balance'
            ]):
                financial_docs.append(file)
        
        return financial_docs
    
    def parse_mpesa_statement(self, text):
        """Parse MPESA statement to extract financial metrics"""
        if not text:
            return None
            
        try:
            # Extract summary section
            paid_in_match = re.search(r'TOTAL:\s*([0-9,]+\.?\d*)', text)
            paid_out_match = re.search(r'TOTAL:\s*[0-9,]+\.?\d*\s*([0-9,]+\.?\d*)', text)
            
            # Alternative parsing for summary table
            if not paid_in_match:
                amounts = re.findall(r'([0-9,]+\.\d{2})', text)
                if len(amounts) >= 2:
                    paid_in = float(amounts[-2].replace(',', ''))
                    paid_out = float(amounts[-1].replace(',', ''))
                else:
                    return None
            else:
                paid_in = float(paid_in_match.group(1).replace(',', ''))
                paid_out = float(paid_out_match.group(1).replace(',', '')) if paid_out_match else 0
            
            # Extract period
            period_match = re.search(r'Statement Period:\s*(.+)', text)
            period = period_match.group(1).strip() if period_match else "Unknown"
            
            # Extract customer name
            name_match = re.search(r'Customer Name:\s*(.+)', text)
            customer = name_match.group(1).strip() if name_match else "Unknown"
            
            # Check for business transactions
            business_indicators = len(re.findall(r'Business Payment|Salary Payment|Merchant Payment', text))
            
            return {
                'type': 'MPESA_STATEMENT',
                'total_inflow': paid_in,
                'total_outflow': paid_out,
                'net_position': paid_in - paid_out,
                'period': period,
                'customer_name': customer,
                'business_indicators': business_indicators,
                'has_verification': 'Statement Verification Code' in text
            }
            
        except Exception as e:
            self.warnings.append(f"MPESA parsing error: {str(e)}")
            return None
    
    def parse_bank_statement(self, text):
        """Parse bank statement to extract financial metrics"""
        if not text:
            return None
            
        try:
            # Look for common bank statement patterns
            balances = re.findall(r'([0-9,]+\.\d{2})', text)
            if len(balances) < 3:
                return None
                
            # Simple heuristic: assume last few numbers are relevant balances
            total_credits = sum(float(b.replace(',', '')) for b in balances[::2])  # Even positions
            total_debits = sum(float(b.replace(',', '')) for b in balances[1::2])   # Odd positions
            
            return {
                'type': 'BANK_STATEMENT',
                'total_inflow': total_credits,
                'total_outflow': total_debits,
                'net_position': total_credits - total_debits,
                'period': 'Unknown',
                'business_indicators': len(re.findall(r'SALARY|BUSINESS|PAYMENT|DEPOSIT', text.upper())),
                'has_verification': False
            }
            
        except Exception as e:
            self.warnings.append(f"Bank statement parsing error: {str(e)}")
            return None
    
    def analyze_financial_document(self, doc_path):
        """Analyze a financial document and extract metrics"""
        text = self.extract_pdf_text(doc_path)
        if not text:
            return None
            
        filename_lower = doc_path.name.lower()
        
        if 'mpesa' in filename_lower:
            return self.parse_mpesa_statement(text)
        elif any(bank_type in filename_lower for bank_type in ['bank', 'statement']):
            return self.parse_bank_statement(text)
        else:
            # Generic financial document
            amounts = re.findall(r'([0-9,]+\.\d{2})', text)
            if amounts:
                total_amount = sum(float(a.replace(',', '')) for a in amounts[:10])  # Limit to first 10
                return {
                    'type': 'FINANCIAL_DOCUMENT',
                    'total_inflow': total_amount,
                    'total_outflow': 0,
                    'net_position': total_amount,
                    'period': 'Unknown',
                    'business_indicators': 0,
                    'has_verification': False
                }
            return None
    
    def calculate_financial_score(self, financial_data):
        """Calculate financial score based on rules.md criteria"""
        if not financial_data:
            return 0, "No financial evidence"
            
        turnover = max(financial_data.get('total_inflow', 0), 
                      financial_data.get('total_outflow', 0))
        
        if turnover >= self.financial_thresholds[5]:
            return 5, f"Turnover ≥ KES 10M ({turnover:,.0f}), complete financial evidence"
        elif turnover >= self.financial_thresholds[4]:
            return 4, f"Turnover 5-10M ({turnover:,.0f}), stable financial evidence"
        elif turnover >= self.financial_thresholds[3]:
            return 3, f"Turnover 1-5M ({turnover:,.0f}), basic financial evidence"
        elif turnover >= 100_000:  # Some reasonable minimum
            return 2, f"Turnover <1M ({turnover:,.0f}), sporadic records"
        elif turnover > 0:
            return 1, f"Minimal transactions ({turnover:,.0f})"
        else:
            return 0, "No financial evidence"
    
    def extract_application_info(self, bundle_path):
        """Extract basic application information"""
        info_file = None
        
        # Look for application info file
        for file in bundle_path.glob("*.pdf"):
            if 'application_info' in file.name.lower():
                info_file = file
                break
        
        if not info_file:
            return {"cluster_name": "Unknown", "application_number": "Unknown"}
            
        text = self.extract_pdf_text(info_file)
        if not text:
            return {"cluster_name": "Unknown", "application_number": "Unknown"}
        
        # Extract cluster name
        cluster_match = re.search(r'What is the name of your cluster\?\s*(.+)', text, re.IGNORECASE)
        cluster_name = cluster_match.group(1).strip() if cluster_match else "Unknown"
        
        # Extract application number
        app_num_match = re.search(r'Application Number\s*([A-Z0-9-]+)', text, re.IGNORECASE)
        app_number = app_num_match.group(1).strip() if app_num_match else "Unknown"
        
        return {
            "cluster_name": cluster_name,
            "application_number": app_number
        }
    
    def evaluate_application(self, county, application_bundle):
        """Evaluate a single application"""
        bundle_path = self.data_dir / county / application_bundle
        
        if not bundle_path.exists():
            self.warnings.append(f"Bundle not found: {bundle_path}")
            return None
        
        # Extract application ID from bundle name
        app_id_match = re.search(r'application_(\d+)_bundle', application_bundle)
        app_id = app_id_match.group(1) if app_id_match else "unknown"
        
        try:
            # Get application info
            app_info = self.extract_application_info(bundle_path)
            
            # Find financial documents
            financial_docs = self.find_financial_documents(bundle_path)
            
            if not financial_docs:
                # No financial documents found
                result = {
                    "application_id": app_id,
                    "cluster_name": app_info["cluster_name"],
                    "county": county,
                    "evaluation_date": self.evaluation_date,
                    "eligibility_assessment": {
                        "E4_minimum_financial_evidence": {
                            "result": "FAIL",
                            "reason": "No financial documents found in bundle"
                        }
                    },
                    "primary_criteria_scores": {
                        "A3_2_financial_position": {
                            "score": "0/5",
                            "result": "FAIL",
                            "reason": "No financial evidence available"
                        }
                    },
                    "overall_assessment": {
                        "financial_evaluation": "FAIL",
                        "key_strengths": [],
                        "limitations": ["No financial documents provided"]
                    },
                    "warnings": [f"No financial documents found in {bundle_path}"]
                }
                return result
            
            # Analyze financial documents
            best_financial_data = None
            financial_analysis = []
            
            for doc in financial_docs:
                doc_analysis = self.analyze_financial_document(doc)
                if doc_analysis:
                    financial_analysis.append({
                        'document': doc.name,
                        'data': doc_analysis
                    })
                    
                    # Keep the best financial data (highest turnover)
                    if (not best_financial_data or 
                        doc_analysis.get('total_inflow', 0) > best_financial_data.get('total_inflow', 0)):
                        best_financial_data = doc_analysis
                else:
                    self.warnings.append(f"Could not analyze financial document: {doc}")
            
            if not best_financial_data:
                # Documents found but couldn't parse
                result = {
                    "application_id": app_id,
                    "cluster_name": app_info["cluster_name"],
                    "county": county,
                    "evaluation_date": self.evaluation_date,
                    "eligibility_assessment": {
                        "E4_minimum_financial_evidence": {
                            "result": "FAIL",
                            "reason": f"Financial documents found but could not be processed: {[d.name for d in financial_docs]}"
                        }
                    },
                    "primary_criteria_scores": {
                        "A3_2_financial_position": {
                            "score": "0/5",
                            "result": "FAIL",
                            "reason": "Financial documents unreadable or corrupted"
                        }
                    },
                    "overall_assessment": {
                        "financial_evaluation": "FAIL",
                        "key_strengths": [],
                        "limitations": ["Financial documents could not be processed"]
                    },
                    "warnings": [f"Could not process financial documents: {[d.name for d in financial_docs]}"]
                }
                return result
            
            # Calculate scores
            financial_score, financial_reason = self.calculate_financial_score(best_financial_data)
            
            # Determine eligibility
            eligibility_pass = financial_score > 0
            
            result = {
                "application_id": app_id,
                "cluster_name": app_info["cluster_name"],
                "county": county,
                "evaluation_date": self.evaluation_date,
                "eligibility_assessment": {
                    "E4_minimum_financial_evidence": {
                        "result": "PASS" if eligibility_pass else "FAIL",
                        "reason": f"{best_financial_data['type']} provided showing {best_financial_data.get('period', 'financial activity')}"
                    }
                },
                "primary_criteria_scores": {
                    "A3_2_financial_position": {
                        "score": f"{financial_score}/5",
                        "result": "PASS" if financial_score >= 3 else "FAIL",
                        "reason": financial_reason
                    }
                },
                "overall_assessment": {
                    "financial_evaluation": "PASS" if eligibility_pass and financial_score >= 3 else "FAIL",
                    "key_strengths": [
                        f"Financial turnover: KES {best_financial_data.get('total_inflow', 0):,.0f}",
                        f"Document type: {best_financial_data['type']}",
                        f"Net position: KES {best_financial_data.get('net_position', 0):,.0f}"
                    ] if best_financial_data.get('total_inflow', 0) > 0 else [],
                    "limitations": [
                        "Assessment limited to financial criteria only",
                        "Other eligibility criteria (registration, value chain, etc.) not evaluated"
                    ]
                },
                "financial_details": {
                    "total_inflow": best_financial_data.get('total_inflow', 0),
                    "total_outflow": best_financial_data.get('total_outflow', 0),
                    "net_position": best_financial_data.get('net_position', 0),
                    "document_type": best_financial_data['type'],
                    "period": best_financial_data.get('period', 'Unknown'),
                    "business_indicators": best_financial_data.get('business_indicators', 0)
                }
            }
            
            return result
            
        except Exception as e:
            self.warnings.append(f"Error evaluating {county}/{application_bundle}: {str(e)}")
            self.warnings.append(f"Traceback: {traceback.format_exc()}")
            return None
    
    def process_all_applications(self):
        """Process all applications in the data directory"""
        print(f"Starting financial evaluation of all applications...")
        print(f"Data directory: {self.data_dir}")
        print(f"Output directory: {self.output_dir}")
        
        # Create output directory structure
        self.output_dir.mkdir(exist_ok=True)
        
        # Process each county
        for county_dir in sorted(self.data_dir.iterdir()):
            if not county_dir.is_dir() or county_dir.name.startswith('.'):
                continue
                
            county = county_dir.name
            print(f"\\nProcessing county: {county}")
            
            # Create county output directory
            county_output_dir = self.output_dir / county
            county_output_dir.mkdir(exist_ok=True)
            
            # Process applications in county
            applications = [d for d in county_dir.iterdir() 
                          if d.is_dir() and 'application' in d.name.lower()]
            
            for app_bundle in sorted(applications):
                self.processed_count += 1
                print(f"  Processing: {app_bundle.name}")
                
                result = self.evaluate_application(county, app_bundle.name)
                
                if result:
                    # Save result
                    output_file = county_output_dir / f"{result['application_id']}_financial_evaluation.json"
                    with open(output_file, 'w') as f:
                        json.dump(result, f, indent=2)
                    
                    self.success_count += 1
                    print(f"    ✅ {result['overall_assessment']['financial_evaluation']} - Score: {result['primary_criteria_scores']['A3_2_financial_position']['score']}")
                else:
                    self.error_count += 1
                    print(f"    ❌ Failed to process")
        
        # Save summary report
        self.generate_summary_report()
        
        print(f"\\n{'='*60}")
        print(f"PROCESSING COMPLETE")
        print(f"{'='*60}")
        print(f"Total applications processed: {self.processed_count}")
        print(f"Successful evaluations: {self.success_count}")
        print(f"Failed evaluations: {self.error_count}")
        print(f"Warnings: {len(self.warnings)}")
        print(f"Output directory: {self.output_dir}")
    
    def generate_summary_report(self):
        """Generate a summary report of all evaluations"""
        summary = {
            "evaluation_date": self.evaluation_date,
            "total_processed": self.processed_count,
            "successful_evaluations": self.success_count,
            "failed_evaluations": self.error_count,
            "warnings_count": len(self.warnings),
            "warnings": self.warnings[:100],  # Limit warnings in summary
            "methodology": {
                "financial_scoring_thresholds": {
                    "5_points": "≥ KES 10M turnover",
                    "4_points": "KES 5-10M turnover", 
                    "3_points": "KES 1-5M turnover",
                    "2_points": "< KES 1M turnover",
                    "1_point": "Minimal transactions",
                    "0_points": "No financial evidence"
                },
                "document_types_processed": [
                    "MPESA statements",
                    "Bank statements", 
                    "Financial documents"
                ],
                "evaluation_criteria": [
                    "E4: Minimum Financial Evidence (Pass/Fail)",
                    "A3.2: Financial Position (0-5 score)"
                ]
            }
        }
        
        summary_file = self.output_dir / "evaluation_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"Summary report saved: {summary_file}")

def main():
    import argparse
    base_dir = Path(__file__).resolve().parent.parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--cohort", default="latest")
    parser.add_argument("--data-dir", default=str(base_dir / "data"))
    parser.add_argument("--output-dir", help="Override default output dir")
    args = parser.parse_args()

    # Determine paths based on cohort
    data_path = Path(args.data_dir) / args.cohort
    rules_file = Path(args.data_dir).parent / "rules-latest.md" if args.cohort == "latest" else Path(args.data_dir).parent / "rules.md"
    
    if args.output_dir:
        output_path = Path(args.output_dir)
    else:
        output_path = Path(__file__).resolve().parent.parent.parent / "output-results" / args.cohort / "financial_basic"
    
    # Create and run evaluator
    evaluator = KJETFinancialEvaluator(data_path, output_path, rules_file)
    evaluator.process_all_applications()

if __name__ == "__main__":
    main()