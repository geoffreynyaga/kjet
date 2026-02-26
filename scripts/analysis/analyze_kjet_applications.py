#!/usr/bin/env python3
"""
KJET Application Analysis and Scoring Script
Analyzes applications according to eligibility and scoring criteria from rules.md
Updated to support CohortStrategy and Cross-Cohort Integration.
"""

import json
import csv
import os
import argparse
from datetime import datetime
from collections import defaultdict, Counter
import re
from pathlib import Path
from abc import ABC, abstractmethod

class CohortStrategy(ABC):
    @abstractmethod
    def get_priority_value_chains(self):
        pass

    @abstractmethod
    def get_scoring_weights(self):
        pass

    @abstractmethod
    def check_eligibility(self, application, content):
        pass

    @abstractmethod
    def get_tier_logic(self, scores):
        pass

    @abstractmethod
    def calculate_scores(self, application, content, scoring_weights):
        pass

class Cohort1Strategy(CohortStrategy):
    def get_priority_value_chains(self):
        return ["Dairy", "Textiles", "Construction", "Leather"]

    def get_scoring_weights(self):
        return {
            "registration_track_record": 0.05,
            "financial_position": 0.20,
            "market_demand_competitiveness": 0.20,
            "business_proposal_viability": 0.25,
            "value_chain_alignment": 0.10,
            "inclusivity_sustainability": 0.20
        }

    def check_eligibility(self, application, content):
        # Legacy C1 eligibility logic
        criteria = {
            "E1_registration_legality": any(kw in content.lower() for kw in ["private company", "limited", "cooperative", "registered"]),
            "E2_county_mapping": any(kw in content.lower() for kw in ["county", "constituency", "ward"]),
            "E3_priority_value_chain": any(pvc.lower() in content.lower() for pvc in self.get_priority_value_chains()),
            "E4_financial_evidence": len(application.get("financial_documents", {})) > 0 or any(kw in content.lower() for kw in ["bank statement", "mpesa"]),
            "E5_consent_contactability": any(kw in content.lower() for kw in ["phone", "email", "contact"])
        }
        return criteria

    def get_tie_breaker_order(self):
        return ["composite_score", "business_proposal_viability", "financial_position"]

    def get_tier_logic(self, scores):
        return "Tier 2: Emerging" # Default for C1 unless specified

    def calculate_scores(self, application, content, scoring_weights):
        scores = {k: 0 for k in scoring_weights.keys()}
        # Legacy C1 scoring logic
        if "registered" in content.lower(): scores["registration_track_record"] = 3
        if "bank statement" in content.lower(): scores["financial_position"] = 3
        if "market" in content.lower(): scores["market_demand_competitiveness"] = 3
        if "plan" in content.lower(): scores["business_proposal_viability"] = 3
        scores["value_chain_alignment"] = 4
        scores["inclusivity_sustainability"] = 3
        return scores

class Cohort2Strategy(CohortStrategy):
    def get_priority_value_chains(self):
        return [
            "Edible Oils", "Dairy (excluding farming)", "Textiles", "Construction",
            "Rice", "Tea", "Blue Economy", "Minerals", "Forestry", "Leather"
        ]

    def get_scoring_weights(self):
        return {
            "business_proposal_viability": 0.25,
            "financial_position": 0.20,
            "market_demand_competitiveness": 0.20,
            "inclusivity_sustainability": 0.20,
            "value_chain_alignment": 0.10,
            "registration_track_record": 0.05
        }

    def check_eligibility(self, application, content):
        csv_meta = application.get("csv_metadata", {})
        
        # E1: Legal Entity
        reg_status = csv_meta.get("registration_status", "").lower()
        reg_number = csv_meta.get("registration_number", "")
        
        if not reg_number:
             reg_match = re.search(r'BN-\w+|PVT-\w+|CPR/\w+', content)
             if reg_match: reg_number = reg_match.group(0)

        e1 = (reg_status != "unregistered" and reg_status != "") or bool(reg_number)
        
        # E2: Geographic Fit
        e2 = True 

        # E3: Sector Alignment
        priority_keywords = ["dairy", "tea", "rice", "oil", "textile", "construction", "blue economy", "minerals", "forestry", "leather", "processing", "manufacturing", "value chain"]
        vc_csv = csv_meta.get("value_chain", "").lower()
        vc_other = csv_meta.get("value_chain_other", "").lower()
        
        e3 = any(kw in vc_csv for kw in priority_keywords) or any(kw in vc_other for kw in priority_keywords)
        if not e3:
            e3 = any(kw in content.lower() for kw in priority_keywords)

        # E4: Financial Evidence
        e4 = len(application.get("financial_documents", {})) > 0 or any(kw in content.lower() for kw in ["bank statement", "mpesa", "financial statement", "cashflow", "balance sheet"])
        # Check CSV for turnover as a signal
        if not e4:
            e4 = bool(csv_meta.get("turnover_2024") or csv_meta.get("turnover_2023"))

        # E5: Consent
        e5 = True # Loosen for parity check as discussed

        return {
            "E1_registration_legality": e1,
            "E2_county_mapping": e2,
            "E3_priority_value_chain": e3,
            "E4_financial_evidence": e4,
            "E5_consent_contactability": e5
        }

    def get_tie_breaker_order(self):
        return ["composite_score", "business_proposal_viability", "market_demand_competitiveness", "financial_position", "inclusivity_sustainability", "registration_track_record"]

    def get_tier_logic(self, scores):
        financial = scores.get("financial_position", 0)
        market = scores.get("market_demand_competitiveness", 0)
        if financial >= 4 and market >= 4:
            return "Tier 1: Ready-to-Scale"
        return "Tier 2: Emerging"

    def calculate_scores(self, application, content, scoring_weights):
        csv_meta = application.get("csv_metadata", {})
        scores = {k: 0 for k in scoring_weights.keys()}

        # 1. Registration (5%)
        reg_status = csv_meta.get("registration_status", "").lower()
        if reg_status in ["private company", "limited", "cooperative"]: scores["registration_track_record"] = 5
        elif reg_status: scores["registration_track_record"] = 4
        else: scores["registration_track_record"] = 3

        # 2. Financial Position (20%)
        turnover = csv_meta.get("turnover_2024") or csv_meta.get("turnover_2023")
        if turnover:
            try:
                t_val = float(str(turnover).replace(",", ""))
                if t_val > 10000000: scores["financial_position"] = 5
                elif t_val > 5000000: scores["financial_position"] = 4
                else: scores["financial_position"] = 3
            except: scores["financial_position"] = 3
        elif application.get("financial_documents"): scores["financial_position"] = 3

        # 3. Market Demand (20%)
        exports = csv_meta.get("exports_percent", "0")
        if str(exports).strip() and str(exports) != "0": scores["market_demand_competitiveness"] = 5
        elif csv_meta.get("b2b_description"): scores["market_demand_competitiveness"] = 4
        else: scores["market_demand_competitiveness"] = 3

        # 4. Business Proposal (25%)
        obj = csv_meta.get("business_objectives", "")
        if len(obj) > 200: scores["business_proposal_viability"] = 5
        elif len(obj) > 50: scores["business_proposal_viability"] = 4
        else: scores["business_proposal_viability"] = 3

        # 5. Value Chain (10%)
        scores["value_chain_alignment"] = 4

        # 6. Inclusivity (20%)
        woman_owned = csv_meta.get("woman_owned_enterprise", "").lower()
        if woman_owned == "yes": scores["inclusivity_sustainability"] = 5
        else: scores["inclusivity_sustainability"] = 3

        return scores

class KJETAnalyzer:
    def __init__(self, output_dir="output", data_dir="data", ui_public_dir="ui/public", cohort="latest"):
        self.cohort = cohort
        self.output_dir = Path(output_dir) / cohort
        self.data_dir = Path(data_dir)
        self.ui_public_dir = Path(ui_public_dir)
        self.counties_data = {}
        
        if cohort == "latest":
            self.strategy = Cohort2Strategy()
            self.top_n = 6
        else:
            self.strategy = Cohort1Strategy()
            self.top_n = 2 # Original Top 2 for C1

        self.scoring_weights = self.strategy.get_scoring_weights()
        self.priority_value_chains = self.strategy.get_priority_value_chains()

        self.analysis_results = {
            "metadata": {
                "analysis_date": datetime.now().isoformat(),
                "cohort": cohort,
                "total_counties": 0,
                "total_applications": 0,
                "eligible_applications": 0,
                "scored_applications": 0
            },
            "county_summary": {},
            "detailed_results": []
        }

    def load_county_data(self):
        """Load all county JSON files and merge with CSV data if available"""
        if not self.output_dir.exists():
            print(f"Output directory {self.output_dir} not found")
            return

        json_files = [f for f in os.listdir(self.output_dir) if f.endswith('_kjet_applications_complete.json')]

        for json_file in json_files:
            county_name = json_file.replace('_kjet_applications_complete.json', '')
            file_path = self.output_dir / json_file
            csv_path = self.output_dir / f"{county_name}_kjet_forms.csv"

            # Load JSON content
            county_apps = []
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    county_apps = data.get("applications", [])
            except Exception as e:
                print(f"Error loading {json_file}: {e}")
                continue

            # Load CSV structured data for C2
            csv_data = {}
            if csv_path.exists():
                try:
                    with open(csv_path, 'r', encoding='utf-8') as f:
                        reader = csv.DictReader(f)
                        for row in reader:
                            app_id = row.get("app_id")
                            if app_id: csv_data[app_id] = row
                except Exception as e:
                    print(f"Error loading CSV {csv_path}: {e}")

            # Merge
            for app in county_apps:
                app_id_full = app.get("application_id", "")
                # app_id in CSV might be shorter (e.g., A8YI vs Baringo_A8YI)
                app_id_short = app_id_full.split("_")[-1] if "_" in app_id_full else app_id_full
                
                if app_id_short in csv_data:
                    # Inject CSV data into application_info for strategy matching
                    app["csv_metadata"] = csv_data[app_id_short]
                    app["applicant_name"] = csv_data[app_id_short].get("cluster_name", app.get("applicant_name", "Unknown"))
                
            self.counties_data[county_name] = {"applications": county_apps}

        self.analysis_results["metadata"]["total_counties"] = len(self.counties_data)

    def load_cohort1_alternates(self):
        """Load Rank 3 & 4 from Cohort 1 human results"""
        c1_path = self.ui_public_dir / "c1" / "kjet-human-final.json"
        alternates = defaultdict(list)
        if not c1_path.exists():
            print(f"Warning: Cohort 1 Alternates file not found at {c1_path}")
            return alternates

        try:
            with open(c1_path, 'r', encoding='utf-8') as f:
                c1_data = json.load(f)
                for app in c1_data:
                    rank = app.get("Ranking from composite score")
                    if rank in [3, 4]:
                        county = app.get("E2. County Mapping", "Unknown").title()
                        alternates[county].append({
                            "application_id": f"C1_{app.get('Application ID')}",
                            "applicant_name": f"Cohort 1 Alternate ({app.get('Application ID')})",
                            "county": county,
                            "composite_score": app.get("TOTAL", 0),
                            "weighted_score": app.get("TOTAL", 0), # Normalized to 100-point scale
                            "is_c1_alternate": True,
                            "scores": {
                                "registration_track_record": app.get("A3.1", 0) / 20.0, # Rough mapping back to 5pt
                                "financial_position": app.get("A3.2", 0) / 20.0,
                                "market_demand_competitiveness": app.get("A3.3", 0) / 20.0,
                                "business_proposal_viability": app.get("A3.4", 0) / 20.0,
                                "value_chain_alignment": app.get("A3.5", 0) / 20.0,
                                "inclusivity_sustainability": app.get("A3.6", 0) / 20.0,
                                "composite_score": app.get("TOTAL", 0)
                            }
                        })
        except Exception as e:
            print(f"Error loading C1 alternates: {e}")
        
        return alternates

    def get_tier(self, scores):
        return self.strategy.get_tier_logic(scores)

    def analyze_eligibility(self, application, content):
        criteria = self.strategy.check_eligibility(application, content)
        eligible = all(criteria.values())
        return {"eligible": eligible, "criteria_results": criteria}

    def score_application(self, application, content):
        scores = self.strategy.calculate_scores(application, content, self.scoring_weights)
        
        # Calculate composite
        weighted_total = 0
        for criterion, score in scores.items():
            if criterion in self.scoring_weights:
                weighted_total += (score / 5.0 * 100) * self.scoring_weights[criterion]
        
        scores["composite_score"] = round(weighted_total, 2)
        scores["weighted_score"] = round(weighted_total, 2)
        return scores

    def run_analysis(self):
        self.load_county_data()
        c1_alternates = self.load_cohort1_alternates() if self.cohort == "latest" else {}

        total_apps = 0
        eligible_total = 0

        for county_name, data in self.counties_data.items():
            county_results = []
            for app in data.get("applications", []):
                total_apps += 1
                app_id = app.get("application_id")
                
                # Robust Content Extraction
                content = ""
                # 1. Search in application_info
                app_info = app.get("application_info", {})
                for doc_key, doc_data in app_info.items():
                    if isinstance(doc_data, dict):
                        content += doc_data.get("content", "") + " "
                
                # 2. Search in details/content if it exists
                if "details" in app and isinstance(app["details"], dict):
                    content += app["details"].get("content", "") + " "
                
                # 3. If still thin, check top level strings
                if len(content.strip()) < 50:
                    for val in app.values():
                        if isinstance(val, str): content += val + " "
                
                eligibility = self.analyze_eligibility(app, content)
                if eligibility["eligible"]:
                    eligible_total += 1
                    scores = self.score_application(app, content)
                    county_results.append({
                        "application_id": app.get("application_id"),
                        "applicant_name": app.get("applicant_name", "Unknown"),
                        "county": county_name,
                        "scores": scores,
                        "composite_score": scores["composite_score"],
                        "weighted_score": scores["weighted_score"],
                        "is_c1_alternate": False
                    })

            if county_name in c1_alternates:
                county_results.extend(c1_alternates[county_name])

            tie_breaker = self.strategy.get_tie_breaker_order()
            def sort_key(x):
                return tuple(-x.get("scores", {}).get(k, x.get(k, 0)) for k in tie_breaker)

            county_results.sort(key=sort_key)

            for i, result in enumerate(county_results):
                result["rank"] = i + 1
                if i < self.top_n:
                    result["tier"] = self.get_tier(result.get("scores", {}))
                else:
                    result["tier"] = None

            self.analysis_results["county_summary"][county_name] = {
                "total": len(data.get("applications", [])),
                "eligible": len([r for r in county_results if not r.get("is_c1_alternate")]),
                "rankings": county_results
            }
            self.analysis_results["detailed_results"].extend(county_results)

        self.analysis_results["metadata"].update({
            "total_applications": total_apps,
            "eligible_applications": eligible_total,
            "scored_applications": eligible_total
        })

        json_report = self.output_dir / "kjet_statistics_report.json"
        with open(json_report, 'w', encoding='utf-8') as f:
            json.dump(self.analysis_results, f, indent=2, ensure_ascii=False)
        
        csv_report = self.output_dir / "kjet_statistics_data.csv"
        with open(csv_report, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["application_id", "applicant_name", "county", "rank", "composite_score", "tier", "is_c1_alternate"])
            writer.writeheader()
            for r in self.analysis_results["detailed_results"]:
                writer.writerow({
                    "application_id": r["application_id"],
                    "applicant_name": r["applicant_name"],
                    "county": r["county"],
                    "rank": r["rank"],
                    "composite_score": r["composite_score"],
                    "tier": r.get("tier"),
                    "is_c1_alternate": r.get("is_c1_alternate", False)
                })

        print(f"Analysis Complete. Results saved to {self.output_dir.resolve()}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cohort", default="latest")
    parser.add_argument("--output-dir", default="output")
    parser.add_argument("--data-dir", default="data")
    parser.add_argument("--ui-public-dir", default="ui/public")
    args = parser.parse_args()
    
    analyzer = KJETAnalyzer(
        cohort=args.cohort, 
        output_dir=args.output_dir,
        data_dir=args.data_dir,
        ui_public_dir=args.ui_public_dir
    )
    analyzer.run_analysis()