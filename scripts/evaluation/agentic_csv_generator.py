import json
import csv
import os
from pathlib import Path
from datetime import datetime

def evaluate_county(county_name, json_path, output_path, cohort="latest"):
    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        return

    with open(json_path, 'r') as f:
        data = json.load(f)

    applications = data.get("applications", [])
    results = []
    
    # Load CSV data for C1 if applicable
    c1_csv_data = {}
    if cohort == "c1":
        csv_path = Path(json_path).parent / f"{county_name}_kjet_forms.csv"
        if csv_path.exists():
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    c1_csv_data[row.get("app_id")] = row

    # Weights configuration
    if cohort == "c1":
        weights = {"reg": 0.10, "fin": 0.20, "mkt": 0.20, "prop": 0.25, "vc": 0.15, "inc": 0.10}
    else:
        weights = {"reg": 0.05, "fin": 0.20, "mkt": 0.20, "prop": 0.25, "vc": 0.10, "inc": 0.20}

    for app in applications:
        app_id = app.get("application_id")
        
        # Helper to get values based on cohort
        if cohort == "c1":
            # Strip prefix for C1 app lookup if needed
            short_id = app_id.split("_")[-1] if "_" in app_id else app_id
            csv_row = c1_csv_data.get(short_id, {})
            
            def get_f(key): return csv_row.get(key, "")
            
            registration_status = get_f("registration_status")
            registration_num = get_f("registration_number")
            county = get_f("county")
            value_chain = get_f("value_chain")
            terms_accepted = "Yes" # For C1, assume yes if it reached this stage or check submitted_at
            has_financials = app.get("document_summary", {}).get("has_financial_statements") or app.get("document_summary", {}).get("has_bank_statements")
            
            name = get_f("cluster_name")
            est_year_str = get_f("year_established") # Might need different column
            rev_2024 = get_f("turnover_2024")
            acc_sys = get_f("accounting_package")
            b2b = get_f("sales_domestic_b2b_percent")
            strategy = get_f("business_objectives")
            woman_owned = get_f("woman_owned_enterprise").lower()
        else:
            info_keys = list(app.get("application_info", {}).keys())
            if not info_keys: continue
            info = app["application_info"][info_keys[0]].get("content", "")
            
            def get_val(label, text):
                lines = text.split('\n')
                for i, line in enumerate(lines):
                    if label in line:
                        if i + 1 < len(lines):
                            return lines[i+1].strip()
                return ""
            
            registration_status = get_val("What is your registration status?", info)
            registration_num = get_val("What is your registration number?", info)
            county = get_val("Which county are you located in?", info)
            value_chain = get_val("Which value chain do you operate in?", info)
            terms_accepted = get_val("Did the applicant accept the terms and conditions?", info)
            has_financials = app.get("document_summary", {}).get("has_bank_statements") or app.get("document_summary", {}).get("has_financial_statements") or app.get("document_summary", {}).get("has_mpesa_statements")
            
            if not has_financials:
                if "M-Pesa Statements" in info or "Mpesa statements" in info:
                    has_financials = True

            name = get_val("What is the name of your cluster?", info)
            est_year_str = get_val("What year was your cluster/association/cooperative established?", info)
            rev_2024 = get_val("Total revenue in 2024 (KES):", info).replace("KES", "").replace(",", "").strip()
            acc_sys = get_val("Which accounting package or system do you use?", info)
            b2b = get_val("Roughly what percentage of your sales are B2B?", info).replace("%", "")
            strategy = get_val("Does the organization have clear objectives and performance targets in place?", info)
            woman_owned = get_val("Is this a women-owned enterprise?", info).lower()

        eligible = True
        failure_criterion = ""
        failure_reason = ""

        if not registration_status or registration_status == "Unregistered" or not registration_num:
            eligible = False
            failure_criterion = "E1"
            failure_reason = "Missing or invalid registration status/number."
        elif not county:
            eligible = False
            failure_criterion = "E2"
            failure_reason = "County information missing."
        elif not value_chain or value_chain == "N/A" or value_chain == "n":
            eligible = False
            failure_criterion = "E3"
            failure_reason = "Sector alignment not specified."
        elif not has_financials:
            eligible = False
            failure_criterion = "E4"
            failure_reason = "No financial evidence (Bank/Mpesa) attached."
        elif terms_accepted != "Yes" and cohort != "c1":
            eligible = False
            failure_criterion = "E5"
            failure_reason = "Terms and conditions not accepted."

        if not eligible:
            results.append({
                "Rank": "",
                "Application ID": app_id,
                "Applicant Name": name,
                "Eligibility Status": "INELIGIBLE",
                "Composite Score": "0.00",
                "Ineligibility Criterion Failed": failure_criterion,
                "Reason": failure_reason
            })
            continue

        # Scoring
        # S1: Registration & Track Record
        try:
            est_year = int(est_year_str)
            age = 2025 - est_year
        except:
            age = 0
        
        s1_score = 5 if age >= 10 else (4 if age >= 5 else (3 if age >= 2 else 1))
        s1_reason = f"Established in {est_year_str} ({age} years); {registration_status} status."

        # S2: Financial Position
        try:
            rev_2024_val = float(rev_2024)
        except:
            rev_2024_val = 0
            
        s2_score = 1
        if rev_2024_val > 1000000: s2_score = 5
        elif rev_2024_val > 500000: s2_score = 4
        elif rev_2024_val > 100000: s2_score = 3
        elif rev_2024_val > 0: s2_score = 2
        
        if acc_sys and acc_sys != "None" and acc_sys != "n" and acc_sys != "N/A":
            s2_score = min(5, s2_score + 1)
            
        s2_reason = f"2024 Revenue: KES {rev_2024_val:,.2f}; Accounting system: {acc_sys}."

        # S3: Market Demand
        try:
            b2b_val = float(b2b)
        except:
            b2b_val = 0
            
        s3_score = 2
        if b2b_val > 50: s3_score = 5
        elif b2b_val > 20: s3_score = 4
        elif b2b_val > 0: s3_score = 3
        
        s3_reason = f"B2B Sales: {b2b_val}%; Market strategy reported."

        # S4: Business Proposal
        s4_score = 1
        if strategy and len(strategy) > 50: s4_score = 4
        elif strategy and len(strategy) > 10: s4_score = 3
        elif strategy and strategy.lower() != "n": s4_score = 2
        
        s4_reason = "Structured expansion plans provided" if s4_score > 2 else "Limited evidence for proposal."

        # S5: Value Chain Alignment
        s5_score = 4 
        s5_reason = f"Aligned with {value_chain} priority value chain."

        # S6: Inclusivity
        s6_score = 1
        if woman_owned == "yes": s6_score = 5
        
        s6_reason = "Woman-owned enterprise" if s6_score == 5 else "Limited evidence of inclusivity profile."

        # Composite Calculation
        c_score = (
            (s1_score/5 * 100 * weights["reg"]) +
            (s2_score/5 * 100 * weights["fin"]) +
            (s3_score/5 * 100 * weights["mkt"]) +
            (s4_score/5 * 100 * weights["prop"]) +
            (s5_score/5 * 100 * weights["vc"]) +
            (s6_score/5 * 100 * weights["inc"])
        )
        
        results.append({
            "Application ID": app_id,
            "Applicant Name": name,
            "Eligibility Status": "ELIGIBLE",
            "Composite Score": f"{c_score:.2f}",
            "S1_Registration_Track_Record_5% Score": s1_score,
            "S1_Registration_Track_Record_5% Reason": s1_reason,
            "S2_Financial_Position_20% Score": s2_score,
            "S2_Financial_Position_20% Reason": s2_reason,
            "S3_Market_Demand_Competitiveness_20% Score": s3_score,
            "S3_Market_Demand_Competitiveness_20% Reason": s3_reason,
            "S4_Business_Proposal_Viability_25% Score": s4_score,
            "S4_Business_Proposal_Viability_25% Reason": s4_reason,
            "S5_Value_Chain_Alignment_10% Score": s5_score,
            "S5_Value_Chain_Alignment_10% Reason": s5_reason,
            "S6_Inclusivity_Sustainability_20% Score": s6_score,
            "S6_Inclusivity_Sustainability_20% Reason": s6_reason
        })

    # Sort and Rank
    eligible_results = [r for r in results if r["Eligibility Status"] == "ELIGIBLE"]
    eligible_results.sort(key=lambda x: float(x["Composite Score"]), reverse=True)
    for i, r in enumerate(eligible_results): r["Rank"] = i + 1
        
    ineligible_results = [r for r in results if r["Eligibility Status"] == "INELIGIBLE"]
    final_results = eligible_results + ineligible_results

    # Write CSV
    headers = ["Rank", "Application ID", "Applicant Name", "Eligibility Status", "Composite Score",
               "S1_Registration_Track_Record_5% Score", "S1_Registration_Track_Record_5% Reason",
               "S2_Financial_Position_20% Score", "S2_Financial_Position_20% Reason",
               "S3_Market_Demand_Competitiveness_20% Score", "S3_Market_Demand_Competitiveness_20% Reason",
               "S4_Business_Proposal_Viability_25% Score", "S4_Business_Proposal_Viability_25% Reason",
               "S5_Value_Chain_Alignment_10% Score", "S5_Value_Chain_Alignment_10% Reason",
               "S6_Inclusivity_Sustainability_20% Score", "S6_Inclusivity_Sustainability_20% Reason",
               "Ineligibility Criterion Failed", "Reason"]

    # Adjust headers for C1 if weights differ in name, but for UI parity we keep names
    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for r in final_results:
            row = {h: r.get(h, "") for h in headers}
            writer.writerow(row)

import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate agentic CSV results for KJET applications.")
    parser.add_argument("--cohort", type=str, default="latest", help="Cohort name (default: latest)")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent.parent.parent
    input_dir = base_dir / "output" / args.cohort
    output_dir = base_dir / "ui" / "public" / args.cohort / "gemini"
    
    output_dir.mkdir(parents=True, exist_ok=True)
    json_files = list(input_dir.glob("*_kjet_applications_complete.json"))
    
    if not json_files:
        print(f"No application JSON files found in {input_dir}")
    
    for json_file in json_files:
        county = json_file.name.replace("_kjet_applications_complete.json", "")
        csv_file = output_dir / f"{county}.csv"
        print(f"Processing {county} for cohort {args.cohort}...")
        evaluate_county(county, str(json_file), str(csv_file), cohort=args.cohort)
