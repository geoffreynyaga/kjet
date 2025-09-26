#!/usr/bin/env python3
"""
KJET Application Analysis and Scoring Script
Analyzes applications according to eligibility and scoring criteria from rules.md
"""

import json
import csv
import os
from datetime import datetime
from collections import defaultdict, Counter
import re

class KJETAnalyzer:
    def __init__(self, output_dir="output", data_dir="data"):
        self.output_dir = output_dir
        self.data_dir = data_dir
        self.counties_data = {}
        self.analysis_results = {
            "metadata": {
                "analysis_date": datetime.now().isoformat(),
                "total_counties": 0,
                "total_applications": 0,
                "eligible_applications": 0,
                "scored_applications": 0
            },
            "county_summary": {},
            "business_type_analysis": {},
            "value_chain_analysis": {},
            "eligibility_analysis": {},
            "scoring_analysis": {},
            "detailed_results": []
        }

        # Priority value chains from rules
        self.priority_value_chains = [
            "Edible Oils", "Dairy (excluding farming)", "Textiles", "Construction",
            "Rice", "Tea", "Blue Economy", "Minerals", "Forestry", "Leather"
        ]

        # Scoring weights
        self.scoring_weights = {
            "registration_track_record": 0.05,
            "financial_position": 0.20,
            "market_demand_competitiveness": 0.20,
            "business_proposal_viability": 0.25,
            "value_chain_alignment": 0.10,
            "inclusivity_sustainability": 0.20
        }

    def load_county_data(self):
        """Load all county JSON files"""
        if not os.path.exists(self.output_dir):
            print(f"Output directory {self.output_dir} not found")
            return

        json_files = [f for f in os.listdir(self.output_dir) if f.endswith('_kjet_applications_complete.json')]

        for json_file in json_files:
            county_name = json_file.replace('_kjet_applications_complete.json', '')
            file_path = os.path.join(self.output_dir, json_file)

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.counties_data[county_name] = data
                    print(f"Loaded {county_name}: {data['metadata']['total_applications']} applications")
            except Exception as e:
                print(f"Error loading {json_file}: {e}")

        self.analysis_results["metadata"]["total_counties"] = len(self.counties_data)

    def analyze_eligibility(self, application):
        """Analyze application against E1-E5 eligibility criteria"""
        eligibility = {
            "eligible": True,
            "criteria_results": {},
            "disqualifiers": []
        }

        app_info = application.get("application_info", {})
        content = ""

        # Extract content from application info
        for doc_key, doc_data in app_info.items():
            if isinstance(doc_data, dict) and "content" in doc_data:
                content += doc_data["content"] + " "

        # E1: Registration & Legality
        registration_indicators = [
            "private company", "limited", "cooperative", "registered",
            "registration number", "certificate of registration"
        ]
        has_registration = any(indicator.lower() in content.lower() for indicator in registration_indicators)
        eligibility["criteria_results"]["E1_registration_legality"] = has_registration

        # E2: County Mapping
        county_indicators = ["county", "constituency", "ward", "location"]
        has_county_mapping = any(indicator.lower() in content.lower() for indicator in county_indicators)
        eligibility["criteria_results"]["E2_county_mapping"] = has_county_mapping

        # E3: Priority Value Chain
        value_chain_match = False
        mentioned_chains = application.get("application_info", {}).get("application_info_185.pdf", {}).get("structured_data", {}).get("value_chains_mentioned", [])

        # More flexible matching - check if any mentioned chain contains priority keywords
        priority_keywords = ["dairy", "tea", "rice", "oil", "textile", "construction", "blue economy", "minerals", "forestry", "leather", "edible oil"]
        for chain in mentioned_chains:
            chain_lower = chain.lower()
            if any(keyword in chain_lower for keyword in priority_keywords):
                value_chain_match = True
                break

        # If no specific matches, check for general business activities that could qualify
        if not value_chain_match:
            general_indicators = ["processing", "manufacturing", "agriculture", "farming", "business", "enterprise"]
            content_lower = content.lower()
            if any(indicator in content_lower for indicator in general_indicators):
                value_chain_match = True

        eligibility["criteria_results"]["E3_priority_value_chain"] = value_chain_match

        # E4: Minimum Financial Evidence
        financial_docs = ["balance sheet", "income statement", "cashflow", "mpesa", "bank statement"]
        has_financial = any(doc.lower() in content.lower() for doc in financial_docs)
        # Check if financial documents exist in the application
        financial_exists = len(application.get("financial_documents", {})) > 0
        eligibility["criteria_results"]["E4_financial_evidence"] = has_financial or financial_exists

        # E5: Consent & Contactability
        contact_indicators = ["phone", "email", "contact", "consent", "mobile", "telephone", "cell", "address", "location"]
        has_contact = any(indicator.lower() in content.lower() for indicator in contact_indicators)
        eligibility["criteria_results"]["E5_consent_contactability"] = has_contact

        # Overall eligibility
        eligibility["eligible"] = all(eligibility["criteria_results"].values())

        return eligibility

    def score_application(self, application):
        """Score application according to primary criteria (0-5 scale)"""
        scores = {
            "registration_track_record": 0,
            "financial_position": 0,
            "market_demand_competitiveness": 0,
            "business_proposal_viability": 0,
            "value_chain_alignment": 0,
            "inclusivity_sustainability": 0,
            "composite_score": 0.0,
            "weighted_score": 0.0
        }

        app_info = application.get("application_info", {})
        content = ""

        # Extract content
        for doc_key, doc_data in app_info.items():
            if isinstance(doc_data, dict) and "content" in doc_data:
                content += doc_data["content"] + " "

        # Registration & Track Record (5%)
        if "registered" in content.lower():
            if "3 yrs" in content.lower() or "three years" in content.lower():
                scores["registration_track_record"] = 5
            elif "1" in content.lower() and "yrs" in content.lower():
                scores["registration_track_record"] = 4
            else:
                scores["registration_track_record"] = 3

        # Financial Position (20%)
        financial_docs = application.get("financial_documents", {})
        if financial_docs:
            # Check for multiple years and positive trends
            years_mentioned = set()
            for doc_content in financial_docs.values():
                if isinstance(doc_content, dict) and "content" in doc_content:
                    doc_text = doc_content["content"]
                    year_matches = re.findall(r'20\d{2}', doc_text)
                    years_mentioned.update(year_matches)

            if len(years_mentioned) >= 2:
                scores["financial_position"] = 4  # Multiple years
            else:
                scores["financial_position"] = 3  # At least one year

            # Check for turnover amounts
            turnover_pattern = r'turnover.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
            turnovers = re.findall(turnover_pattern, content, re.IGNORECASE)
            if turnovers:
                max_turnover = max([float(t.replace(',', '')) for t in turnovers])
                if max_turnover >= 10000000:  # 10M+
                    scores["financial_position"] = 5
                elif max_turnover >= 5000000:  # 5M+
                    scores["financial_position"] = 4

        # Market Demand & Competitiveness (20%)
        market_indicators = ["customers", "orders", "contracts", "sales", "market", "demand"]
        market_signals = sum(1 for indicator in market_indicators if indicator in content.lower())
        if market_signals >= 3:
            scores["market_demand_competitiveness"] = 5
        elif market_signals >= 2:
            scores["market_demand_competitiveness"] = 4
        elif market_signals >= 1:
            scores["market_demand_competitiveness"] = 3

        # Business Proposal / Growth Viability (25%)
        proposal_indicators = ["objectives", "targets", "plan", "budget", "strategy", "growth"]
        proposal_signals = sum(1 for indicator in proposal_indicators if indicator in content.lower())
        if proposal_signals >= 4:
            scores["business_proposal_viability"] = 5
        elif proposal_signals >= 3:
            scores["business_proposal_viability"] = 4
        elif proposal_signals >= 2:
            scores["business_proposal_viability"] = 3

        # Value Chain Alignment & Role (10%)
        vc_alignment = 0
        mentioned_chains = application.get("application_info", {}).get("application_info_185.pdf", {}).get("structured_data", {}).get("value_chains_mentioned", [])
        for chain in mentioned_chains:
            if any(pvc.lower() in chain.lower() for pvc in self.priority_value_chains):
                vc_alignment = 4  # Priority VC
                break
        scores["value_chain_alignment"] = vc_alignment

        # Inclusivity & Sustainability (20%)
        inclusivity_indicators = ["women", "youth", "gender", "inclusive", "sustainable", "green", "environment"]
        inclusivity_signals = sum(1 for indicator in inclusivity_indicators if indicator in content.lower())
        if inclusivity_signals >= 3:
            scores["inclusivity_sustainability"] = 4
        elif inclusivity_signals >= 2:
            scores["inclusivity_sustainability"] = 3
        elif inclusivity_signals >= 1:
            scores["inclusivity_sustainability"] = 2

        # Calculate composite score
        weighted_total = 0
        for criterion, score in scores.items():
            if criterion in self.scoring_weights:
                normalized_score = (score / 5) * 100  # Convert to 0-100
                weighted_score = normalized_score * self.scoring_weights[criterion]
                weighted_total += weighted_score

        scores["composite_score"] = round(weighted_total, 2)
        scores["weighted_score"] = round(weighted_total, 2)

        return scores

    def analyze_all_applications(self):
        """Analyze all applications across all counties"""
        total_applications = 0
        eligible_count = 0
        scored_count = 0

        for county_name, county_data in self.counties_data.items():
            print(f"Analyzing {county_name}...")

            county_summary = {
                "county": county_name,
                "total_applications": 0,
                "eligible_applications": 0,
                "scored_applications": 0,
                "average_score": 0,
                "business_types": defaultdict(int),
                "value_chains": set(),
                "applications": []
            }

            applications = county_data.get("applications", [])
            county_summary["total_applications"] = len(applications)

            scores_sum = 0

            for app in applications:
                print("\n")
                print("\n")
                print("\n")
                print("\n")

                # print(app,"application xxx")  # Debug line to inspect application data

                print("\n")
                print("\n")
                print("\n")
                print("\n")
                print("\n")

                app_id = app.get("application_id", "")
                total_applications += 1

                # Analyze eligibility
                eligibility = self.analyze_eligibility(app)

                # Score if eligible
                scores = {}
                if eligibility["eligible"]:
                    eligible_count += 1
                    county_summary["eligible_applications"] += 1

                    scores = self.score_application(app)
                    scores_sum += scores.get("composite_score", 0)
                    scored_count += 1
                    county_summary["scored_applications"] += 1

        
                # Try to extract business_type from structured_data first
                business_type = ""
                # Loop through all application_info PDFs to find structured_data
                app_info = app.get("application_info", {})
                for doc in app_info.values():
                    if isinstance(doc, dict):
                        # Try structured_data['business_type']
                        structured_data = doc.get("structured_data", {})
                        if "business_type" in structured_data:
                            business_type = structured_data["business_type"]
                            break
                        # Try key_information_found['business_type']
                        key_info = doc.get("key_information_found", {})
                        if "business_type" in key_info:
                            # Sometimes it's a list
                            bt_val = key_info["business_type"]
                            if isinstance(bt_val, list):
                                business_type = bt_val[0] if bt_val else ""
                            else:
                                business_type = bt_val
                            break
                # Fallback: try top-level key_information_found
                if not business_type:
                    business_type = app_info.get("key_information_found", {}).get("business_type", "")
                    if isinstance(business_type, list):
                        business_type = business_type[0] if business_type else ""
                print(business_type, "business type xxxxx")
                
               
                # Record into county summary counts
                if business_type:
                    county_summary["business_types"][business_type] += 1
                else:
                    county_summary["business_types"]["Unknown"] += 1

                # Extract value chains
                mentioned_chains = app.get("application_info", {}).get("application_info_185.pdf", {}).get("structured_data", {}).get("value_chains_mentioned", [])
                county_summary["value_chains"].update(mentioned_chains)

                # Store detailed results
                app_result = {
                    "application_id": app_id,
                    "county": county_name,
                    "eligible": eligibility["eligible"],
                    "eligibility_criteria": eligibility["criteria_results"],
                    "scores": scores,
                    "business_type": business_type or "Unknown",
                    "value_chains": list(mentioned_chains)
                }

                county_summary["applications"].append(app_result)
                self.analysis_results["detailed_results"].append(app_result)

            # Calculate average score
            if county_summary["scored_applications"] > 0:
                county_summary["average_score"] = round(scores_sum / county_summary["scored_applications"], 2)

            # Convert sets to lists for JSON serialization
            county_summary["value_chains"] = list(county_summary["value_chains"])
            county_summary["business_types"] = dict(county_summary["business_types"])

            self.analysis_results["county_summary"][county_name] = county_summary

        # Update metadata
        self.analysis_results["metadata"].update({
            "total_applications": total_applications,
            "eligible_applications": eligible_count,
            "scored_applications": scored_count
        })

        # Generate aggregate analyses
        self.generate_business_type_analysis()
        self.generate_value_chain_analysis()
        self.generate_eligibility_analysis()
        self.generate_scoring_analysis()

    def generate_business_type_analysis(self):
        """Generate business type analysis across all counties"""
        business_types = defaultdict(int)

        for county_data in self.analysis_results["county_summary"].values():
            for bt, count in county_data["business_types"].items():
                business_types[bt] += count

        total_business_entities = sum(business_types.values())

        self.analysis_results["business_type_analysis"] = {
            "total_entities": total_business_entities,
            "breakdown": dict(business_types),
            "percentages": {
                bt: round((count / total_business_entities * 100), 1) if total_business_entities > 0 else 0
                for bt, count in business_types.items()
            }
        }

    def generate_value_chain_analysis(self):
        """Generate value chain analysis across all counties"""
        value_chain_county_coverage = defaultdict(set)

        for county_name, county_data in self.analysis_results["county_summary"].items():
            for vc in county_data["value_chains"]:
                value_chain_county_coverage[vc].add(county_name)

        self.analysis_results["value_chain_analysis"] = {
            vc: {
                "counties": len(counties),
                "percentage": round(len(counties) / len(self.counties_data) * 100, 1),
                "county_list": sorted(list(counties))
            }
            for vc, counties in value_chain_county_coverage.items()
        }

    def generate_eligibility_analysis(self):
        """Generate eligibility analysis"""
        eligibility_stats = {
            "total_applications": self.analysis_results["metadata"]["total_applications"],
            "eligible_applications": self.analysis_results["metadata"]["eligible_applications"],
            "ineligible_applications": self.analysis_results["metadata"]["total_applications"] - self.analysis_results["metadata"]["eligible_applications"],
            "eligibility_rate": round(self.analysis_results["metadata"]["eligible_applications"] / self.analysis_results["metadata"]["total_applications"] * 100, 1) if self.analysis_results["metadata"]["total_applications"] > 0 else 0,
            "criteria_failure_rates": defaultdict(int)
        }

        # Analyze criteria failures
        for result in self.analysis_results["detailed_results"]:
            if not result["eligible"]:
                for criterion, passed in result["eligibility_criteria"].items():
                    if not passed:
                        eligibility_stats["criteria_failure_rates"][criterion] += 1

        eligibility_stats["criteria_failure_rates"] = dict(eligibility_stats["criteria_failure_rates"])
        self.analysis_results["eligibility_analysis"] = eligibility_stats

    def generate_scoring_analysis(self):
        """Generate scoring analysis"""
        scores = [result["scores"].get("composite_score", 0) for result in self.analysis_results["detailed_results"] if result["eligible"]]

        scoring_stats = {
            "total_scored": len(scores),
            "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
            "highest_score": max(scores) if scores else 0,
            "lowest_score": min(scores) if scores else 0,
            "score_distribution": {
                "excellent": len([s for s in scores if s >= 80]),
                "good": len([s for s in scores if 60 <= s < 80]),
                "fair": len([s for s in scores if 40 <= s < 60]),
                "poor": len([s for s in scores if s < 40])
            }
        }

        self.analysis_results["scoring_analysis"] = scoring_stats

    def generate_csv_output(self, filename="kjet_statistics_data.csv"):
        """Generate CSV output with county-level statistics"""
        csv_data = []

        for county_name, county_data in self.analysis_results["county_summary"].items():
            row = {
                "County": county_name,
                "Total Applications": county_data["total_applications"],
                "Complete Applications": county_data["scored_applications"],
                "Incomplete Applications": county_data["total_applications"] - county_data["scored_applications"],
                "Business Type": ", ".join([f"{bt} ({count})" for bt, count in county_data["business_types"].items()]),
                "Value Chains": ", ".join(county_data["value_chains"]),
                "Average Score": county_data["average_score"]
            }
            csv_data.append(row)

        # Write CSV
        if csv_data:
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = csv_data[0].keys()
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(csv_data)

        print(f"Generated CSV output: {filename}")

    def generate_text_report(self, filename="kjet_statistics_report.txt"):
        """Generate comprehensive text report"""
        report = f"""KJET APPLICATION DATA STATISTICS REPORT
==================================================
Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Analysis based on: Eligibility and Scoring Criteria from rules.md

OVERALL SUMMARY
--------------------
Total Counties: {self.analysis_results["metadata"]["total_counties"]}
Total Applications: {self.analysis_results["metadata"]["total_applications"]}
Eligible Applications: {self.analysis_results["metadata"]["eligible_applications"]}
Scored Applications: {self.analysis_results["metadata"]["scored_applications"]}
Eligibility Rate: {self.analysis_results["eligibility_analysis"]["eligibility_rate"]}%

BUSINESS TYPE ANALYSIS
-------------------------
"""
        # Add business type breakdown
        for bt, count in self.analysis_results["business_type_analysis"]["breakdown"].items():
            percentage = self.analysis_results["business_type_analysis"]["percentages"][bt]
            report += f"{bt}: {count} ({percentage}%)\n"

        report += "\nVALUE CHAIN ANALYSIS\n-------------------------\n"
        # Add value chain analysis
        for vc, data in self.analysis_results["value_chain_analysis"].items():
            report += f"{vc}: {data['counties']} counties ({data['percentage']}%)\n"

        report += "\nELIGIBILITY ANALYSIS\n-------------------------\n"
        eligibility = self.analysis_results["eligibility_analysis"]
        report += f"Total Applications: {eligibility['total_applications']}\n"
        report += f"Eligible: {eligibility['eligible_applications']}\n"
        report += f"Ineligible: {eligibility['ineligible_applications']}\n"
        report += f"Eligibility Rate: {eligibility['eligibility_rate']}%\n"

        report += "\nCriteria Failure Analysis:\n"
        for criterion, failures in eligibility["criteria_failure_rates"].items():
            report += f"{criterion}: {failures} failures\n"

        report += "\nSCORING ANALYSIS\n-------------------------\n"
        scoring = self.analysis_results["scoring_analysis"]
        report += f"Total Scored Applications: {scoring['total_scored']}\n"
        report += f"Average Score: {scoring['average_score']}\n"
        report += f"Highest Score: {scoring['highest_score']}\n"
        report += f"Lowest Score: {scoring['lowest_score']}\n"
        report += "\nScore Distribution:\n"
        for category, count in scoring["score_distribution"].items():
            report += f"{category.capitalize()}: {count}\n"

        # Add top counties by average score
        report += "\nTOP COUNTIES BY AVERAGE SCORE\n----------------------------------------\n"
        sorted_counties = sorted(
            self.analysis_results["county_summary"].items(),
            key=lambda x: x[1]["average_score"],
            reverse=True
        )

        for i, (county, data) in enumerate(sorted_counties[:10], 1):
            report += f"{i}. {county}: {data['average_score']} ({data['scored_applications']} scored apps)\n"

        # Write the report
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"Generated text report: {filename}")

    def update_json_report(self, filename="kjet_statistics_report.json"):
        """Update the JSON report with analysis results"""
        # Load existing JSON
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except FileNotFoundError:
            existing_data = {}

        # Merge analysis results
        existing_data["analysis_results"] = self.analysis_results
        existing_data["analysis_metadata"] = {
            "analysis_completed": datetime.now().isoformat(),
            "analyzer_version": "KJET Analysis Engine v1.0",
            "rules_version": "rules.md - Eligibility & Scoring Criteria"
        }

        # Write updated JSON
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=2, ensure_ascii=False)

        print(f"Updated JSON report: {filename}")

    def run_analysis(self):
        """Run the complete analysis pipeline"""
        print("Starting KJET Application Analysis...")
        print("=" * 50)

        # Load data
        self.load_county_data()

        # Analyze applications
        self.analyze_all_applications()

        # Generate outputs
        self.generate_csv_output()
        self.generate_text_report()
        self.update_json_report()

        print("=" * 50)
        print("Analysis Complete!")
        print(f"Processed {self.analysis_results['metadata']['total_counties']} counties")
        print(f"Analyzed {self.analysis_results['metadata']['total_applications']} applications")
        print(f"Eligible applications: {self.analysis_results['metadata']['eligible_applications']}")
        print(f"Scored applications: {self.analysis_results['metadata']['scored_applications']}")


if __name__ == "__main__":
    analyzer = KJETAnalyzer()
    analyzer.run_analysis()