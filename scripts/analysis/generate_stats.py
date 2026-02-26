#!/usr/bin/env python3
"""
Generate overall statistics from KJET application data.
Creates summary statistics in both text and CSV formats.
"""

import json
import csv
import argparse
from pathlib import Path
from datetime import datetime

def load_county_data(output_dir):
    """Load all county JSON files and extract statistics"""
    county_stats = []
    total_applications = 0
    total_counties = 0
    
    # Find all JSON files in output directory
    json_files = list(output_dir.glob("*_kjet_applications_complete.json"))
    
    for json_file in sorted(json_files):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            county_name = data["metadata"]["county"]
            app_count = data["metadata"]["total_applications"]
            file_size = json_file.stat().st_size
            
            # Count document types and analyze application content
            total_docs = 0
            pdf_count = 0
            image_count = 0
            apps_with_registration = 0
            apps_with_financial = 0
            apps_with_bank_statements = 0
            apps_with_application_form = 0
            apps_with_balance_sheets = 0
            apps_with_income_statements = 0
            apps_with_cashflow_statements = 0
            apps_with_mpesa_statements = 0
            processing_errors = 0
            
            # Value chain analysis
            value_chains_mentioned = set()
            business_types = set()
            cooperative_count = 0
            company_count = 0
            group_count = 0
            sacco_count = 0
            
            for app in data["applications"]:
                doc_summary = app.get("document_summary", {})
                total_docs += doc_summary.get("total_documents", 0)
                pdf_count += doc_summary.get("pdf_count", 0)
                image_count += doc_summary.get("image_count", 0)
                
                # Document type analysis
                if doc_summary.get("has_registration_cert", False):
                    apps_with_registration += 1
                if doc_summary.get("has_financial_statements", False):
                    apps_with_financial += 1
                if doc_summary.get("has_bank_statements", False):
                    apps_with_bank_statements += 1
                if doc_summary.get("has_application_form", False):
                    apps_with_application_form += 1
                
                # Detailed financial document analysis
                financial_docs = app.get("financial_documents", {})
                for doc_name in financial_docs.keys():
                    doc_name_lower = doc_name.lower()
                    if "balance" in doc_name_lower and "sheet" in doc_name_lower:
                        apps_with_balance_sheets += 1
                        break
                
                for doc_name in financial_docs.keys():
                    doc_name_lower = doc_name.lower()
                    if "income" in doc_name_lower and "statement" in doc_name_lower:
                        apps_with_income_statements += 1
                        break
                        
                for doc_name in financial_docs.keys():
                    doc_name_lower = doc_name.lower()
                    if "cashflow" in doc_name_lower or "cash flow" in doc_name_lower:
                        apps_with_cashflow_statements += 1
                        break
                        
                for doc_name in financial_docs.keys():
                    doc_name_lower = doc_name.lower()
                    if "mpesa" in doc_name_lower:
                        apps_with_mpesa_statements += 1
                        break
                
                # Business type analysis from registration documents
                reg_docs = app.get("registration_documents", {})
                for doc_name, doc_data in reg_docs.items():
                    if isinstance(doc_data, dict):
                        content = str(doc_data.get("content", "")).lower()
                        doc_name_lower = doc_name.lower()
                        
                        if any(term in content or term in doc_name_lower for term in ["cooperative", "co-operative", "coop"]):
                            cooperative_count += 1
                            break
                        elif any(term in content or term in doc_name_lower for term in ["company", "limited", "ltd"]):
                            company_count += 1
                            break
                        elif any(term in content or term in doc_name_lower for term in ["group", "self help", "women group"]):
                            group_count += 1
                            break
                        elif any(term in content or term in doc_name_lower for term in ["sacco", "savings"]):
                            sacco_count += 1
                            break
                
                # Value chain detection from all documents
                all_content = ""
                for doc_type in ["application_info", "registration_documents", "financial_documents", "other_documents"]:
                    for doc_name, doc_data in app.get(doc_type, {}).items():
                        if isinstance(doc_data, dict) and "content" in doc_data:
                            all_content += " " + str(doc_data.get("content", "")).lower()
                
                # Check for priority value chains
                priority_chains = data.get("priority_value_chains", [])
                for chain in priority_chains:
                    if chain.lower() in all_content:
                        value_chains_mentioned.add(chain)
                
                # Additional value chain keywords (Expanded for C2)
                value_chain_keywords = {
                    "agriculture": ["farming", "crops", "agriculture", "agricultural"],
                    "livestock": ["livestock", "cattle", "goats", "sheep", "poultry", "chicken"],
                    "dairy": ["dairy", "milk", "cheese", "creamery"],
                    "textiles": ["textile", "cotton", "fabric", "clothing", "apparel", "garment"],
                    "manufacturing": ["manufacturing", "production", "factory", "industrial"],
                    "technology": ["technology", "tech", "software", "digital", "ict"],
                    "retail": ["retail", "shop", "store", "trading", "kiosk"],
                    "services": ["services", "consulting", "training", "hospitality", "tourism"],
                    "transport": ["transport", "logistics", "delivery", "courier"],
                    "construction": ["construction", "building", "cement", "bricks", "architecture"],
                    "edible oils": ["edible oil", "cooking oil", "sunflower oil", "canola oil"],
                    "rice": ["rice", "paddy", "milling"],
                    "tea": ["tea", "factory", "plantation"],
                    "blue economy": ["fish", "fishing", "aquaculture", "maritime", "lake", "ocean"],
                    "minerals": ["mining", "minerals", "quarry", "gold", "sand"],
                    "forestry": ["timber", "trees", "wood", "nursery", "charcoal"],
                    "leather": ["leather", "tannery", "shoes", "hides", "skins"]
                }
                
                for category, keywords in value_chain_keywords.items():
                    if any(keyword in all_content for keyword in keywords):
                        value_chains_mentioned.add(category.title())
                
                processing_errors += len(app.get("processing_errors", []))
            
            county_stats.append({
                "county": county_name,
                "applications": app_count,
                "total_documents": total_docs,
                "pdf_documents": pdf_count,
                "image_documents": image_count,
                "apps_with_registration": apps_with_registration,
                "apps_with_financial": apps_with_financial,
                "apps_with_bank_statements": apps_with_bank_statements,
                "apps_with_application_form": apps_with_application_form,
                "apps_with_balance_sheets": apps_with_balance_sheets,
                "apps_with_income_statements": apps_with_income_statements,
                "apps_with_cashflow_statements": apps_with_cashflow_statements,
                "apps_with_mpesa_statements": apps_with_mpesa_statements,
                "cooperative_count": cooperative_count,
                "company_count": company_count,
                "group_count": group_count,
                "sacco_count": sacco_count,
                "value_chains": list(value_chains_mentioned),
                "processing_errors": processing_errors
            })
            
            total_applications += app_count
            total_counties += 1
            
        except Exception as e:
            print(f"Error processing {json_file}: {e}")
    
    return county_stats, total_applications, total_counties

def generate_text_report(county_stats, total_applications, total_counties, output_file):
    """Generate a comprehensive text report"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("KJET APPLICATION DATA STATISTICS REPORT\n")
        f.write("=" * 50 + "\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Data source: output/ directory JSON files\n\n")
        
        # Overall Summary
        f.write("OVERALL SUMMARY\n")
        f.write("-" * 20 + "\n")
        f.write(f"Total Counties: {total_counties}\n")
        f.write(f"Total Applications: {total_applications}\n")
        
        if county_stats:
            total_docs = sum(stat["total_documents"] for stat in county_stats)
            total_pdfs = sum(stat["pdf_documents"] for stat in county_stats)
            total_images = sum(stat["image_documents"] for stat in county_stats)
            total_errors = sum(stat["processing_errors"] for stat in county_stats)
            
            f.write(f"Total Documents: {total_docs:,}\n")
            f.write(f"  - PDF Documents: {total_pdfs:,}\n")
            f.write(f"  - Image Documents: {total_images:,}\n")
            f.write(f"Total Processing Errors: {total_errors:,}\n")
            f.write(f"Average Applications per County: {total_applications/total_counties:.1f}\n")
            f.write(f"Average Documents per Application: {total_docs/total_applications:.1f}\n\n")
        
        # Business Type Analysis
        f.write("BUSINESS TYPE ANALYSIS\n")
        f.write("-" * 25 + "\n")
        total_cooperatives = sum(stat["cooperative_count"] for stat in county_stats)
        total_companies = sum(stat["company_count"] for stat in county_stats)
        total_groups = sum(stat["group_count"] for stat in county_stats)
        total_saccos = sum(stat["sacco_count"] for stat in county_stats)
        total_classified = total_cooperatives + total_companies + total_groups + total_saccos
        
        f.write(f"Cooperatives/Co-ops: {total_cooperatives:3d} ({total_cooperatives/total_applications*100:.1f}%)\n")
        f.write(f"Companies/Limited:   {total_companies:3d} ({total_companies/total_applications*100:.1f}%)\n")
        f.write(f"Groups/Self-Help:    {total_groups:3d} ({total_groups/total_applications*100:.1f}%)\n")
        f.write(f"SACCOs/Savings:      {total_saccos:3d} ({total_saccos/total_applications*100:.1f}%)\n")
        f.write(f"Unclassified:        {total_applications - total_classified:3d} ({(total_applications - total_classified)/total_applications*100:.1f}%)\n\n")
        
        # Value Chain Analysis
        f.write("VALUE CHAIN ANALYSIS\n")
        f.write("-" * 25 + "\n")
        all_value_chains = set()
        for stat in county_stats:
            all_value_chains.update(stat["value_chains"])
        
        value_chain_counts = {}
        for chain in all_value_chains:
            count = sum(1 for stat in county_stats if chain in stat["value_chains"])
            value_chain_counts[chain] = count
        
        sorted_chains = sorted(value_chain_counts.items(), key=lambda x: x[1], reverse=True)
        for chain, count in sorted_chains[:10]:
            f.write(f"{chain:<20}: {count:3d} counties ({count/total_counties*100:.1f}%)\n")
        f.write("\n")
        
        # Financial Document Completeness
        f.write("FINANCIAL DOCUMENT COMPLETENESS\n")
        f.write("-" * 35 + "\n")
        total_balance_sheets = sum(stat["apps_with_balance_sheets"] for stat in county_stats)
        total_income_statements = sum(stat["apps_with_income_statements"] for stat in county_stats)
        total_cashflow_statements = sum(stat["apps_with_cashflow_statements"] for stat in county_stats)
        total_mpesa_statements = sum(stat["apps_with_mpesa_statements"] for stat in county_stats)
        total_app_forms = sum(stat["apps_with_application_form"] for stat in county_stats)
        
        f.write(f"Application Forms:      {total_app_forms:3d} ({total_app_forms/total_applications*100:.1f}%)\n")
        f.write(f"Balance Sheets:         {total_balance_sheets:3d} ({total_balance_sheets/total_applications*100:.1f}%)\n")
        f.write(f"Income Statements:      {total_income_statements:3d} ({total_income_statements/total_applications*100:.1f}%)\n")
        f.write(f"Cashflow Statements:    {total_cashflow_statements:3d} ({total_cashflow_statements/total_applications*100:.1f}%)\n")
        f.write(f"M-Pesa Statements:      {total_mpesa_statements:3d} ({total_mpesa_statements/total_applications*100:.1f}%)\n\n")
        
        # Top Counties by Applications
        f.write("TOP 10 COUNTIES BY APPLICATION COUNT\n")
        f.write("-" * 40 + "\n")
        top_counties = sorted(county_stats, key=lambda x: x["applications"], reverse=True)[:10]
        for i, county in enumerate(top_counties, 1):
            coop_pct = county["cooperative_count"] / county["applications"] * 100 if county["applications"] > 0 else 0
            comp_pct = county["company_count"] / county["applications"] * 100 if county["applications"] > 0 else 0
            f.write(f"{i:2d}. {county['county']:<20} - {county['applications']:3d} apps ({coop_pct:.0f}% co-ops, {comp_pct:.0f}% companies)\n")
        f.write("\n")
        
        # Counties by Business Type Concentration
        f.write("COUNTIES BY BUSINESS TYPE CONCENTRATION\n")
        f.write("-" * 45 + "\n")
        
        f.write("Most Cooperative-Heavy Counties:\n")
        coop_heavy = sorted([c for c in county_stats if c["applications"] >= 5], 
                           key=lambda x: x["cooperative_count"]/x["applications"] if x["applications"] > 0 else 0, reverse=True)[:5]
        for county in coop_heavy:
            pct = county["cooperative_count"] / county["applications"] * 100 if county["applications"] > 0 else 0
            f.write(f"  {county['county']:<20}: {county['cooperative_count']:2d}/{county['applications']:2d} ({pct:.0f}%)\n")
        
        f.write("\nMost Company-Heavy Counties:\n")
        comp_heavy = sorted([c for c in county_stats if c["applications"] >= 5], 
                           key=lambda x: x["company_count"]/x["applications"] if x["applications"] > 0 else 0, reverse=True)[:5]
        for county in comp_heavy:
            pct = county["company_count"] / county["applications"] * 100 if county["applications"] > 0 else 0
            f.write(f"  {county['county']:<20}: {county['company_count']:2d}/{county['applications']:2d} ({pct:.0f}%)\n")
        f.write("\n")
        
        # Document Completeness Analysis
        f.write("DOCUMENT COMPLETENESS ANALYSIS\n")
        f.write("-" * 35 + "\n")
        total_apps_with_reg = sum(stat["apps_with_registration"] for stat in county_stats)
        total_apps_with_fin = sum(stat["apps_with_financial"] for stat in county_stats)
        total_apps_with_bank = sum(stat["apps_with_bank_statements"] for stat in county_stats)
        
        f.write(f"Applications with Registration Documents: {total_apps_with_reg:3d} ({total_apps_with_reg/total_applications*100:.1f}%)\n")
        f.write(f"Applications with Financial Statements:   {total_apps_with_fin:3d} ({total_apps_with_fin/total_applications*100:.1f}%)\n")
        f.write(f"Applications with Bank Statements:       {total_apps_with_bank:3d} ({total_apps_with_bank/total_applications*100:.1f}%)\n\n")
        
        # Document Quality Analysis
        f.write("DOCUMENT QUALITY INDICATORS\n")
        f.write("-" * 30 + "\n")
        
        # Counties with best document completeness
        complete_counties = []
        for county in county_stats:
            if county["applications"] >= 5:  # Only counties with significant applications
                completeness_score = (
                    county["apps_with_registration"] +
                    county["apps_with_balance_sheets"] +
                    county["apps_with_income_statements"] +
                    county["apps_with_bank_statements"]
                ) / (county["applications"] * 4) * 100  # 4 key document types
                complete_counties.append((county["county"], completeness_score, county["applications"]))
        
        complete_counties.sort(key=lambda x: x[1], reverse=True)
        f.write("Counties with Best Document Completeness (min 5 applications):\n")
        for county, score, apps in complete_counties[:5]:
            f.write(f"  {county:<20}: {score:.1f}% completeness ({apps} apps)\n")
        f.write("\n")
        
        # Detailed County Breakdown
        f.write("DETAILED COUNTY BREAKDOWN\n")
        f.write("-" * 30 + "\n")
        f.write(f"{'County':<20} {'Apps':<5} {'Co-op':<5} {'Comp':<5} {'Grp':<4} {'SACCO':<5} {'Bal':<4} {'Inc':<4} {'Cash':<4} {'MPesa':<5} {'Complete%':<9}\n")
        f.write("-" * 95 + "\n")
        
        for county in sorted(county_stats, key=lambda x: x["county"]):
            completeness = 0
            if county["applications"] > 0:
                completeness = (
                    county["apps_with_registration"] +
                    county["apps_with_balance_sheets"] +
                    county["apps_with_income_statements"] +
                    county["apps_with_bank_statements"]
                ) / (county["applications"] * 4) * 100
            
            f.write(f"{county['county']:<20} "
                   f"{county['applications']:<5} "
                   f"{county['cooperative_count']:<5} "
                   f"{county['company_count']:<5} "
                   f"{county['group_count']:<4} "
                   f"{county['sacco_count']:<5} "
                   f"{county['apps_with_balance_sheets']:<4} "
                   f"{county['apps_with_income_statements']:<4} "
                   f"{county['apps_with_cashflow_statements']:<4} "
                   f"{county['apps_with_mpesa_statements']:<5} "
                   f"{completeness:<9.1f}\n")
        
        f.write("\nColumn Legend:\n")
        f.write("Apps = Number of Applications\n")
        f.write("Co-op = Cooperatives\n")
        f.write("Comp = Companies/Limited\n")
        f.write("Grp = Groups/Self-Help\n")
        f.write("SACCO = SACCOs/Savings\n")
        f.write("Bal = Balance Sheets\n")
        f.write("Inc = Income Statements\n")
        f.write("Cash = Cashflow Statements\n")
        f.write("MPesa = M-Pesa Statements\n")
        f.write("Complete% = Document Completeness Score\n")

def generate_csv_report(county_stats, output_file):
    """Generate a CSV file with county statistics"""
    
    fieldnames = [
        "county", "applications", "total_documents", "pdf_documents", 
        "image_documents", "apps_with_registration", "apps_with_financial", 
        "apps_with_bank_statements", "apps_with_application_form",
        "apps_with_balance_sheets", "apps_with_income_statements", 
        "apps_with_cashflow_statements", "apps_with_mpesa_statements",
        "cooperative_count", "company_count", "group_count", "sacco_count",
        "processing_errors", "value_chains_mentioned"
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for county in sorted(county_stats, key=lambda x: x["county"]):
            # Add value chains as comma-separated string for CSV and remove the list field
            county_copy = county.copy()
            county_copy["value_chains_mentioned"] = ", ".join(county["value_chains"])
            del county_copy["value_chains"]  # Remove the list field
            writer.writerow(county_copy)

def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="KJET Statistics Generator")
    parser.add_argument("--cohort", type=str, default="latest", help="Cohort name (c1 or latest)")
    parser.add_argument("--output-dir", type=str, default="output", help="Base output directory")
    
    args = parser.parse_args()
    
    print(f"KJET Statistics Generator for cohort: {args.cohort}")
    print("=" * 30)
    
    # Set up paths
    base_dir = Path(__file__).resolve().parent.parent.parent
    output_dir = base_dir / args.output_dir / args.cohort
    
    if not output_dir.exists():
        print(f"Error: Output directory not found: {output_dir}")
        return
    
    # Load data
    print(f"Loading county data from {output_dir}...")
    county_stats, total_applications, total_counties = load_county_data(output_dir)
    
    if not county_stats:
        print("No county data found!")
        return
    
    # Generate reports in the versioned output folder
    text_file = output_dir / "kjet_statistics_report.txt"
    csv_file = output_dir / "kjet_statistics_data.csv"
    
    print(f"Generating reports in {output_dir}...")
    generate_text_report(county_stats, total_applications, total_counties, text_file)
    generate_csv_report(county_stats, csv_file)
    
    print("\n" + "=" * 40)
    print("STATISTICS GENERATION COMPLETE")
    print(f"Text report: {text_file}")
    print(f"CSV data: {csv_file}")
    print(f"Counties processed: {total_counties}")
    print(f"Total applications: {total_applications:,}")
    print(f"Total documents: {sum(stat['total_documents'] for stat in county_stats):,}")
    
    # Quick summary
    top_5 = sorted(county_stats, key=lambda x: x["applications"], reverse=True)[:5]
    print(f"\nTop 5 counties by applications:")
    for i, county in enumerate(top_5, 1):
        print(f"  {i}. {county['county']}: {county['applications']} applications")

if __name__ == "__main__":
    main()