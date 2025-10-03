#!/usr/bin/env python3
"""
KJET County-Level Application Evaluator
Processes each county JSON file and applies comprehensive evaluation based on rules.md
"""

import json
import os
from datetime import datetime, time
import re
from tqdm import tqdm
import signal
from time import sleep

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Evaluation timed out")

def evaluate_with_timeout(func, args, timeout_seconds=30):
    """Evaluate a function with a timeout"""
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout_seconds)
    try:
        result = func(*args)
        return result
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)

class KJETCountyEvaluator:
    def __init__(self):
        # Eligibility criteria from rules.md
        self.eligibility_criteria = {
            "E1": "Registration & Legality (Pass/Fail)",
            "E2": "County Mapping (Pass/Fail)",
            "E3": "Priority Value Chain (Pass/Fail)",
            "E4": "Minimum Financial Evidence (Pass/Fail)",
            "E5": "Consent & Contactability (Pass/Fail)"
        }

        # Primary criteria weights from rules.md
        self.primary_criteria_weights = {
            "registration_track_record": 0.05,  # 5%
            "financial_position": 0.20,         # 20%
            "market_demand_competitiveness": 0.20,  # 20%
            "business_proposal_viability": 0.25,    # 25%
            "value_chain_alignment": 0.10,          # 10%
            "inclusivity_sustainability": 0.20       # 20%
        }

        # Priority value chains from rules.md
        self.priority_value_chains = [
            "Edible Oils", "Dairy (excluding farming)", "Textiles", "Construction",
            "Rice", "Tea", "Blue Economy", "Minerals", "Forestry", "Leather"
        ]

        # Financial document keywords
        self.financial_keywords = [
            "balance sheet", "income statement", "cashflow", "mpesa", "bank statement",
            "financial statement", "profit loss", "audited accounts"
        ]

        # Contact indicators
        self.contact_indicators = [
            "phone", "email", "contact", "consent", "mobile", "telephone", "cell",
            "address", "location"
        ]

        # Scoring rubrics from rules.md (A3. Scoring Rubrics)
        self.scoring_rubrics = {
            "registration_track_record": {
                5: "Registered ≥3 yrs; functioning governance (elected officials, minutes), audited handover(s)",
                4: "Registered 1–3 yrs; documented leadership; meeting cadence",
                3: "Registered <1 yr; basic structure in place",
                2: "Registered but dormant/irregular governance",
                1: "Registration unclear; ad-hoc operations",
                0: "No registration / unverifiable"
            },
            "financial_position": {
                5: "Turnover ≥ KES 10M; positive 2-yr trend; statements + simple income/balance proof",
                4: "Turnover 5–<10M; mostly stable; bank/Mpesa + one statement",
                3: "Turnover 1–<5M; stable or recovering; at least one statement",
                2: "Turnover <1M; sporadic records",
                1: "Minimal/irregular transactions; thin evidence",
                0: "No financial evidence"
            },
            "market_demand_competitiveness": {
                5: "Active offtake/buyer contracts or purchase orders; multi-channel sales; repeat customers; defensible price/quality",
                4: "Consistent monthly orders; growing channels (incl. digital marketplaces); basic quality assurance",
                3: "Regular local sales; one channel; emerging quality practices",
                2: "Intermittent sales; weak channels; limited differentiation",
                1: "Sporadic sales; no channels; untested products",
                0: "No market evidence"
            },
            "business_proposal_viability": {
                5: "Clear problem–solution; quantified targets; detailed execution plan; costed budget; risks & mitigations; co-investment readiness",
                4: "Strong plan with minor gaps; targets & timelines present",
                3: "Direction clear; targets generic; budget rough",
                2: "Vague plan; limited targets; unclear resourcing",
                1: "Aspirational; no plan/targets",
                0: "Not provided"
            },
            "value_chain_alignment": {
                5: "Priority VC; fills a critical node (e.g., aggregation/processing); documented linkages upstream & downstream",
                4: "Priority VC; clear node participation; some linkages",
                3: "Priority VC; weak linkages; potential to upgrade",
                2: "Peripheral role; unclear node",
                1: "Marginal link",
                0: "Not in priority VC"
            },
            "inclusivity_sustainability": {
                5: "≥50% women or ≥50% youth participation (or ≥30% women leadership); PWD inclusion; 2+ green practices adopted",
                4: "Strong gender/youth participation; 1–2 green practices",
                3: "Moderate inclusion; some intent on sustainability",
                2: "Low inclusion; ad-hoc green steps",
                1: "Token inclusion; no green practice",
                0: "No evidence"
            }
        }

    def evaluate_county_applications(self, county_data):
        """Evaluate all applications in a county JSON file"""

        county_name = county_data["metadata"]["county"]
        applications = county_data.get("applications", [])

        print(f"  🔍 Evaluating {len(applications)} applications in {county_name}...")

        evaluation_results = {
            "evaluation_metadata": {
                "county": county_name,
                "total_applications": len(applications),
                "evaluation_date": datetime.now().isoformat(),
                "evaluator_version": "1.0",
                "rules_version": "rules.md - Annex A & B"
            },
            # Data enrichment summary (counts of new structured fields)
            "data_enrichment": {
                "applications_with_business_name": 0,
                "applications_with_standardized_business_name": 0,
                "applications_with_woman_owned_flag": 0,
                "applications_with_woman_owned_proof": 0
            },
            "eligibility_summary": {
                "total_applications": len(applications),
                "eligible_applications": 0,
                "ineligible_applications": 0,
                "eligibility_rate": 0.0,
                "criteria_failure_breakdown": {
                    "E1_registration_legality": 0,
                    "E2_county_mapping": 0,
                    "E3_priority_value_chain": 0,
                    "E4_financial_evidence": 0,
                    "E5_consent_contactability": 0
                }
            },
            "scoring_summary": {
                "total_scored": 0,
                "average_score": 0.0,
                "highest_score": 0.0,
                "lowest_score": 100.0,
                "score_distribution": {
                    "excellent_80_100": 0,
                    "good_70_79": 0,
                    "fair_60_69": 0,
                    "poor_below_60": 0
                }
            },
            "application_evaluations": {}
        }

        total_scores = []

        for application in tqdm(applications, desc=f"  Evaluating {county_name} applications", unit="app", leave=False):
            try:
                # Evaluate with timeout to prevent hanging
                app_evaluation = evaluate_with_timeout(
                    self.evaluate_single_application,
                    (application, county_name),
                    timeout_seconds=60  # 60 second timeout per application
                )
                # Determine a canonical application id. Prefer the raw application id, then
                # any id produced during evaluation, and finally generate a unique fallback.
                raw_id = application.get("application_id") or app_evaluation.get("application_id")

                if county_name.lower() == "migori":
                    print("Migori application found:", raw_id)
                    # print("application:", application)


                    print("\n")
                    print("\n")
                    print("\n")
                    print("\n")
                    print("\n")
                    print("\n")
                    print("\n")
                    print("\n")
                    print("\n")
                    print("\n")
                    

                    # sleep(2000000)


                if raw_id is None or (isinstance(raw_id, str) and raw_id.strip() == ""):
                    # create a deterministic unique fallback id
                    fallback_index = len(evaluation_results['application_evaluations']) + 1
                    app_id = f"unknown_{fallback_index}"
                else:
                    app_id = str(raw_id)

                # Ensure uniqueness (avoid clobbering if duplicate ids are present)
                if app_id in evaluation_results['application_evaluations']:
                    suffix = 1
                    base = app_id
                    while f"{base}_{suffix}" in evaluation_results['application_evaluations']:
                        suffix += 1
                    app_id = f"{base}_{suffix}"

                # record the canonical id on the evaluation object
                app_evaluation["application_id"] = app_id
                evaluation_results["application_evaluations"][app_id] = app_evaluation

                # Update data enrichment counts when structured fields are present
                if app_evaluation.get("business_name"):
                    evaluation_results["data_enrichment"]["applications_with_business_name"] += 1
                if app_evaluation.get("standardized_business_name"):
                    evaluation_results["data_enrichment"]["applications_with_standardized_business_name"] += 1
                if app_evaluation.get("woman_owned") is not None:
                    evaluation_results["data_enrichment"]["applications_with_woman_owned_flag"] += 1
                if app_evaluation.get("woman_owned_proof"):
                    evaluation_results["data_enrichment"]["applications_with_woman_owned_proof"] += 1

                # Update eligibility summary
                if app_evaluation["eligibility"]["eligible"]:
                    evaluation_results["eligibility_summary"]["eligible_applications"] += 1
                else:
                    evaluation_results["eligibility_summary"]["ineligible_applications"] += 1
                    # Count criteria failures
                    for criterion, result in app_evaluation["eligibility"]["criteria_results"].items():
                        if not result:
                            evaluation_results["eligibility_summary"]["criteria_failure_breakdown"][criterion] += 1

                # Update scoring summary for eligible applications
                if app_evaluation["eligibility"]["eligible"] and "scoring" in app_evaluation:
                    score = app_evaluation["scoring"]["composite_score"]
                    total_scores.append(score)
                    evaluation_results["scoring_summary"]["total_scored"] += 1

                    if score > evaluation_results["scoring_summary"]["highest_score"]:
                        evaluation_results["scoring_summary"]["highest_score"] = score
                    if score < evaluation_results["scoring_summary"]["lowest_score"]:
                        evaluation_results["scoring_summary"]["lowest_score"] = score

                    # Score distribution
                    if score >= 80:
                        evaluation_results["scoring_summary"]["score_distribution"]["excellent_80_100"] += 1
                    elif score >= 70:
                        evaluation_results["scoring_summary"]["score_distribution"]["good_70_79"] += 1
                    elif score >= 60:
                        evaluation_results["scoring_summary"]["score_distribution"]["fair_60_69"] += 1
                    else:
                        evaluation_results["scoring_summary"]["score_distribution"]["poor_below_60"] += 1

            except TimeoutError:
                raw_id = application.get("application_id")
                if raw_id is None or (isinstance(raw_id, str) and raw_id.strip() == ""):
                    fallback_index = len(evaluation_results['application_evaluations']) + 1
                    app_id = f"unknown_{fallback_index}"
                else:
                    app_id = str(raw_id)

                # avoid collisions
                if app_id in evaluation_results['application_evaluations']:
                    suffix = 1
                    base = app_id
                    while f"{base}_{suffix}" in evaluation_results['application_evaluations']:
                        suffix += 1
                    app_id = f"{base}_{suffix}"

                print(f"    ⏰ Timeout: Application {app_id} took too long, marking as failed")
                evaluation_results["application_evaluations"][app_id] = {
                    "application_id": app_id,
                    "error": "Evaluation timed out after 60 seconds",
                    "eligibility": {"eligible": False, "failure_reasons": ["Evaluation timeout"]}
                }
                evaluation_results["eligibility_summary"]["ineligible_applications"] += 1
                continue
            except Exception as e:
                raw_id = application.get("application_id")
                if raw_id is None or (isinstance(raw_id, str) and raw_id.strip() == ""):
                    fallback_index = len(evaluation_results['application_evaluations']) + 1
                    app_id = f"unknown_{fallback_index}"
                else:
                    app_id = str(raw_id)

                # avoid collisions
                if app_id in evaluation_results['application_evaluations']:
                    suffix = 1
                    base = app_id
                    while f"{base}_{suffix}" in evaluation_results['application_evaluations']:
                        suffix += 1
                    app_id = f"{base}_{suffix}"

                print(f"    ⚠️  Failed to evaluate application {app_id}: {str(e)}")
                # Add failed application with minimal info
                evaluation_results["application_evaluations"][app_id] = {
                    "application_id": app_id,
                    "error": f"Evaluation failed: {str(e)}",
                    "eligibility": {"eligible": False, "failure_reasons": ["Evaluation error"]}
                }
                evaluation_results["eligibility_summary"]["ineligible_applications"] += 1
                continue

        # Calculate averages and rates
        if evaluation_results["eligibility_summary"]["total_applications"] > 0:
            evaluation_results["eligibility_summary"]["eligibility_rate"] = round(
                evaluation_results["eligibility_summary"]["eligible_applications"] /
                evaluation_results["eligibility_summary"]["total_applications"] * 100, 2
            )

        if total_scores:
            evaluation_results["scoring_summary"]["average_score"] = round(sum(total_scores) / len(total_scores), 2)
        else:
            evaluation_results["scoring_summary"]["lowest_score"] = 0.0

        print(f"  ✅ Completed evaluation: {evaluation_results['eligibility_summary']['eligible_applications']}/{evaluation_results['eligibility_summary']['total_applications']} eligible applications")

        return evaluation_results

    def evaluate_single_application(self, application, county_name):
        """Evaluate a single application against all criteria"""

        app_id = application.get("application_id", "unknown")
        print(f"    🔍 Evaluating application {app_id}...")

        # Extract content for analysis
        content = self._extract_application_content(application)
        print(f"    📄 Content extracted: {len(content)} characters")

        # E1: Registration & Legality
        print(f"    🏢 Checking E1: Registration & Legality...")
        e1_result = self._evaluate_registration_legality(application, content)
        print(f"    ✅ E1 result: {e1_result}")

        # E2: County Mapping
        print(f"    🗺️  Checking E2: County Mapping...")
        e2_result = self._evaluate_county_mapping(application, county_name, content)
        print(f"    ✅ E2 result: {e2_result}")

        # E3: Priority Value Chain
        print(f"    🔗 Checking E3: Priority Value Chain...")
        e3_result = self._evaluate_value_chain(application, content)
        print(f"    ✅ E3 result: {e3_result}")

        # E4: Financial Evidence
        print(f"    💰 Checking E4: Financial Evidence...")
        e4_result = self._evaluate_financial_evidence(application, content)
        print(f"    ✅ E4 result: {e4_result}")

        # E5: Consent & Contactability
        print(f"    📞 Checking E5: Consent & Contactability...")
        e5_result = self._evaluate_contactability(application, content)
        print(f"    ✅ E5 result: {e5_result}")

        eligibility = {
            "eligible": all([e1_result, e2_result, e3_result, e4_result, e5_result]),
            "criteria_results": {
                "E1_registration_legality": e1_result,
                "E2_county_mapping": e2_result,
                "E3_priority_value_chain": e3_result,
                "E4_financial_evidence": e4_result,
                "E5_consent_contactability": e5_result
            },
            "failure_reasons": []
        }

        # Add failure reasons
        if not e1_result:
            eligibility["failure_reasons"].append("E1: No valid registration/legal status found")
        if not e2_result:
            eligibility["failure_reasons"].append("E2: County mapping unclear or missing")
        if not e3_result:
            eligibility["failure_reasons"].append("E3: Not operating in priority value chain")
        if not e4_result:
            eligibility["failure_reasons"].append("E4: Insufficient financial evidence")
        if not e5_result:
            eligibility["failure_reasons"].append("E5: Missing contact information or consent")

        evaluation = {
            "application_id": application.get("application_id", "unknown"),
            "business_type": application.get("business_type", "unknown"),
            "woman_owned": application.get("woman_owned", False),
            "eligibility": eligibility,
        }

        # Enrich evaluation with structured fields from application_info docs
        # business_name: freeform extracted name
        business_name = self._get_structured_field(application, "business_name")
        if business_name:
            evaluation["business_name"] = business_name

        # standardized_business_name: normalized/canonical name if present
        standardized = self._get_structured_field(application, "standardized_business_name") or self._get_structured_field(application, "standardized_name")
        if standardized:
            evaluation["standardized_business_name"] = standardized

        # woman_owned flag and proof
        woman_owned = self._get_structured_field(application, "woman_owned")
        if woman_owned is not None:
            evaluation["woman_owned"] = woman_owned
        woman_proof = self._get_structured_field(application, "woman_owned_proof")
        if woman_proof:
            evaluation["woman_owned_proof"] = woman_proof

        #add business category if present
        business_type = self._get_structured_field(application, "business_type")
        if business_type:
            evaluation["business_type"] = business_type

        # Only score eligible applications
        if eligibility["eligible"]:
            evaluation["scoring"] = self._score_application(application, content)

        return evaluation

    def _extract_application_content(self, application):
        """Extract all text content from application for analysis"""
        content_parts = []

        # Main application content
        if "application_info" in application:
            for doc_key, doc_data in application["application_info"].items():
                if "content" in doc_data and isinstance(doc_data["content"], str):
                    content_parts.append(doc_data["content"])
                if "content_summary" in doc_data and isinstance(doc_data["content_summary"], str):
                    content_parts.append(doc_data["content_summary"])

        # Financial documents
        if "financial_documents" in application:
            for doc_key, doc_data in application["financial_documents"].items():
                if "content" in doc_data and isinstance(doc_data["content"], str):
                    content_parts.append(doc_data["content"])

        # Other documents
        if "other_documents" in application:
            for doc_key, doc_data in application["other_documents"].items():
                if "content" in doc_data and isinstance(doc_data["content"], str):
                    content_parts.append(doc_data["content"])

        content = " ".join(content_parts)

        # Handle large content by extracting first and last pages
        MAX_CONTENT_LENGTH = 500000  # ~500KB limit
        if len(content) > MAX_CONTENT_LENGTH:
            print(f"    ⚠️  Large content detected ({len(content)} chars), extracting first/last pages")
            content = self._extract_pages(content)

        return content.lower()

    def _extract_pages(self, content):
        """Extract first 3 pages and last 3 pages from large content"""
        # Estimate ~2500 characters per page (rough estimate for typical document pages)
        CHARS_PER_PAGE = 2500
        pages_to_extract = 3

        total_chars = len(content)

        if total_chars <= CHARS_PER_PAGE * 6:  # If content is small enough for 6 pages, return all
            return content

        first_pages = content[:CHARS_PER_PAGE * pages_to_extract]

        # Calculate start position for last pages
        last_pages_start = max(CHARS_PER_PAGE * pages_to_extract,
                              total_chars - (CHARS_PER_PAGE * pages_to_extract))

        last_pages = content[last_pages_start:]

        # Combine first and last pages
        extracted_content = first_pages + " " + last_pages

        print(f"    📄 Extracted {len(first_pages)} chars from first {pages_to_extract} pages + {len(last_pages)} chars from last {pages_to_extract} pages")

        return extracted_content

    def _evaluate_registration_legality(self, application, content):
        """E1: Registration & Legality evaluation"""
        # Check for registration keywords and numbers
        registration_indicators = [
            "registration", "registered", "company", "cooperative", "limited", "ltd",
            "sacco", "association", "certificate", "registration number"
        ]

        has_registration_keywords = any(indicator in content for indicator in registration_indicators)

        # Check for registration numbers (patterns like PVT-XXXX, CPR/XXXX, etc.)
        registration_patterns = [
            r'registration.*number.*[A-Z]{3}[-/][A-Z0-9]+',
            r'[A-Z]{3}[-/][A-Z0-9]{4,}',
            r'certificate.*registration',
            r'registered.*company'
        ]

        has_registration_pattern = any(re.search(pattern, content, re.IGNORECASE) for pattern in registration_patterns)

        return has_registration_keywords or has_registration_pattern

    def _evaluate_county_mapping(self, application, county_name, content):
        """E2: County Mapping evaluation"""
        # Check if county name appears in content
        county_mentioned = county_name.lower() in content

        # Check for ward/constituency mentions
        location_indicators = ["ward", "constituency", "sub-county", "location", "address"]
        has_location_info = any(indicator in content for indicator in location_indicators)

        return county_mentioned and has_location_info

    def _get_structured_field(self, application, field_name):
        """Safe accessor for structured fields inside application_info documents.

        Looks into application['application_info'] values and returns the first
        non-empty value for the requested field.
        """
        if not application or "application_info" not in application:
            return None

        for doc_key, doc_data in application["application_info"].items():
            structured = doc_data.get("structured_data") if isinstance(doc_data, dict) else None
            if structured and field_name in structured:
                val = structured.get(field_name)
                if val is not None and val != "":
                    return val

        return None

    def _evaluate_value_chain(self, application, content):
        """E3: Priority Value Chain evaluation"""
        # Check mentioned value chains from structured data
        mentioned_chains = []
        if "application_info" in application:
            for doc_key, doc_data in application["application_info"].items():
                if "structured_data" in doc_data and "value_chains_mentioned" in doc_data["structured_data"]:
                    mentioned_chains.extend(doc_data["structured_data"]["value_chains_mentioned"])

        # More flexible matching - check if any mentioned chain contains priority keywords
        priority_keywords = [
            "dairy", "tea", "rice", "oil", "textile", "construction", "blue economy",
            "minerals", "forestry", "leather", "edible oil", "processing", "manufacturing"
        ]

        for chain in mentioned_chains:
            chain_lower = chain.lower()
            if any(keyword in chain_lower for keyword in priority_keywords):
                return True

        # Check content for value chain keywords
        content_has_vc = any(keyword in content for keyword in priority_keywords)

        return content_has_vc

    def _evaluate_financial_evidence(self, application, content):
        """E4: Financial Evidence evaluation"""
        # Check for financial document keywords in content
        has_financial_keywords = any(keyword in content for keyword in self.financial_keywords)

        # Check if financial documents exist
        has_financial_docs = len(application.get("financial_documents", {})) > 0

        # Check for financial amounts/patterns
        financial_patterns = [
            r'\d{1,3}(?:,\d{3})*\.?\d*',  # Numbers with commas (currency amounts)
            r'ksh|kes|\$',  # Currency indicators
            r'revenue|income|profit|assets|liabilities'  # Financial terms
        ]

        has_financial_patterns = any(re.search(pattern, content, re.IGNORECASE) for pattern in financial_patterns)

        return has_financial_keywords or has_financial_docs or has_financial_patterns

    def _evaluate_contactability(self, application, content):
        """E5: Consent & Contactability evaluation"""
        # Check for contact indicators
        has_contact_info = any(indicator in content for indicator in self.contact_indicators)

        # Check for phone/email patterns
        phone_pattern = r'\b\d{9,10}\b|\+254\d{9}'
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'

        has_phone = re.search(phone_pattern, content) is not None
        has_email = re.search(email_pattern, content) is not None

        return has_contact_info or has_phone or has_email

    def _score_application(self, application, content):
        """Score eligible application according to primary criteria (0-5 scale)"""

        app_id = application.get("application_id", "unknown")
        # print(f"    📊 Scoring application {app_id}...")

        scores = {
            "registration_track_record": self._score_registration_track_record(application, content),
            "financial_position": self._score_financial_position(application, content),
            "market_demand_competitiveness": self._score_market_demand(application, content),
            "business_proposal_viability": self._score_business_proposal(application, content),
            "value_chain_alignment": self._score_value_chain_alignment(application, content),
            "inclusivity_sustainability": self._score_inclusivity_sustainability(application, content)
        }

        # Calculate weighted scores
        weighted_scores = {}
        criteria_explanations = {}
        total_weighted_score = 0

        for criterion, score in scores.items():
            normalized_score = score * 20  # Convert 0-5 to 0-100
            weight = self.primary_criteria_weights[criterion]
            weighted_score = normalized_score * weight
            weighted_scores[criterion] = {
                "raw_score": score,
                "normalized_score": normalized_score,
                "weight": weight,
                "weighted_score": round(weighted_score, 2)
            }
            # Add rubric explanation
            criteria_explanations[criterion] = {
                "score": score,
                "rubric_explanation": self.scoring_rubrics[criterion][score]
            }
            total_weighted_score += weighted_score

        composite_score = round(total_weighted_score, 2)

        return {
            "criteria_scores": scores,
            "criteria_explanations": criteria_explanations,
            "weighted_scores": weighted_scores,
            "composite_score": composite_score,
            "scoring_scale": "0-100 (weighted average)",
            "grade": self._get_grade(composite_score)
        }

    def _score_registration_track_record(self, application, content):
        """A3.1: Registration & Track Record (5%)"""
        score = 0

        # Check for years of operation
        years_patterns = [
            r'(\d+)\s*years?\s*operational',
            r'(\d+)\s*years?\s*in\s*business',
            r'established\s*(\d+)\s*years?\s*ago',
            r'founded\s*(\d+)\s*years?\s*ago',
            r'since\s*(\d{4})'  # year founded
        ]

        years_operational = 0
        for pattern in years_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                try:
                    years = int(match.group(1))
                    if 'since' in pattern and years > 1900:  # year founded
                        current_year = 2024  # approximate
                        years_operational = current_year - years
                    else:
                        years_operational = years
                    break
                except:
                    continue

        # Check for governance indicators
        governance_indicators = [
            "board", "directors", "elected officials", "minutes", "meetings",
            "governance", "audited", "handover", "constitution", "bylaws"
        ]
        has_governance = any(indicator in content for indicator in governance_indicators)

        # Check for leadership documentation
        leadership_indicators = [
            "chairman", "chairperson", "secretary", "treasurer", "ceo",
            "managing director", "executive", "leadership"
        ]
        has_leadership = any(indicator in content for indicator in leadership_indicators)

        # Score based on rubric
        if years_operational >= 3 and has_governance:
            score = 5  # Registered ≥3 yrs; functioning governance
        elif years_operational >= 1 and (has_leadership or has_governance):
            score = 4  # Registered 1–3 yrs; documented leadership
        elif years_operational >= 1 or "registered" in content:
            score = 3  # Registered <1 yr; basic structure
        elif "registration" in content and ("dormant" in content or "irregular" in content):
            score = 2  # Registered but dormant/irregular governance
        elif "registration" in content or "company" in content or "cooperative" in content:
            score = 1  # Registration unclear; ad-hoc operations
        else:
            score = 0  # No registration / unverifiable

        return min(score, 5)

    def _score_financial_position(self, application, content):
        """A3.2: Financial Position (20%)"""
        score = 0

        # Extract turnover/revenue amounts
        currency_patterns = [
            r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:kes|ksh|shillings?|million|m)',
            r'turnover.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
            r'revenue.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
            r'sales.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
        ]

        turnover_amount = 0
        for pattern in currency_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                try:
                    # Clean the amount
                    amount_str = match.replace(',', '')
                    if 'million' in content.lower() or 'm' in content.lower():
                        amount = float(amount_str) * 1000000
                    else:
                        amount = float(amount_str)
                    turnover_amount = max(turnover_amount, amount)
                except:
                    continue

        # Check for positive trend (2-year)
        trend_indicators = ["positive", "growth", "increase", "improving", "rising", "up"]
        has_positive_trend = any(indicator in content for indicator in trend_indicators)

        # Check for statement types
        statement_types = [
            "balance sheet", "income statement", "cash flow", "bank statement",
            "mpesa statement", "financial statement", "audited accounts"
        ]
        has_statements = any(stmt in content for stmt in statement_types)

        # Check for financial documents in application
        has_financial_docs = len(application.get("financial_documents", {})) > 0

        # Score based on rubric
        if turnover_amount >= 10000000 and has_positive_trend and (has_statements or has_financial_docs):
            score = 5  # Turnover ≥ KES 10M; positive 2-yr trend; statements + proof
        elif turnover_amount >= 5000000 and (has_statements or has_financial_docs):
            score = 4  # Turnover 5–<10M; mostly stable; bank/Mpesa + one statement
        elif turnover_amount >= 1000000 and (has_statements or has_financial_docs):
            score = 3  # Turnover 1–<5M; stable or recovering; at least one statement
        elif turnover_amount >= 1000000 or has_statements or has_financial_docs:
            score = 2  # Turnover <1M; sporadic records
        elif "financial" in content or "bank" in content or "transaction" in content:
            score = 1  # Minimal/irregular transactions; thin evidence
        else:
            score = 0  # No financial evidence

        return min(score, 5)

    def _score_market_demand(self, application, content):
        """A3.3: Market Demand & Competitiveness (20%)"""
        score = 0

        # Check for contracts and offtake agreements
        contract_indicators = [
            "contract", "purchase order", "offtake agreement", "buyer agreement",
            "supply agreement", "distribution agreement"
        ]
        has_contracts = any(indicator in content for indicator in contract_indicators)

        # Check for multi-channel sales
        channels = ["wholesale", "retail", "digital", "marketplace", "online", "export"]
        channel_count = sum(1 for channel in channels if channel in content)
        has_multi_channel = channel_count >= 2

        # Check for repeat customers
        customer_indicators = [
            "repeat customers", "regular buyers", "loyal customers", "returning clients",
            "established relationships", "long-term clients"
        ]
        has_repeat_customers = any(indicator in content for indicator in customer_indicators)

        # Check for quality/price positioning
        quality_indicators = [
            "quality assurance", "certification", "standards", "premium pricing",
            "competitive pricing", "brand", "differentiation"
        ]
        has_quality_positioning = any(indicator in content for indicator in quality_indicators)

        # Check for consistent orders
        order_indicators = ["monthly orders", "consistent orders", "regular orders", "steady demand"]
        has_consistent_orders = any(indicator in content for indicator in order_indicators)

        # Score based on rubric
        if has_contracts and has_multi_channel and has_repeat_customers and has_quality_positioning:
            score = 5  # Active offtake/buyer contracts; multi-channel; repeat customers; defensible price/quality
        elif has_consistent_orders and channel_count >= 1 and has_quality_positioning:
            score = 4  # Consistent monthly orders; growing channels; basic quality assurance
        elif ("sales" in content or "customers" in content) and channel_count >= 1:
            score = 3  # Regular local sales; one channel; emerging quality practices
        elif "sales" in content or "customers" in content:
            score = 2  # Intermittent sales; weak channels; limited differentiation
        elif "market" in content or "demand" in content:
            score = 1  # Sporadic sales; no channels; untested products
        else:
            score = 0  # No market evidence

        return min(score, 5)

    def _score_business_proposal(self, application, content):
        """A3.4: Business Proposal / Growth Viability (25%)"""
        score = 0

        proposal_signals = 0
        if "objectives" in content: proposal_signals += 1
        if "targets" in content: proposal_signals += 1
        if "plan" in content: proposal_signals += 1
        if "budget" in content: proposal_signals += 1
        if "strategy" in content: proposal_signals += 1
        if "growth" in content: proposal_signals += 1
        if "feasibility" in content: proposal_signals += 1

        # 5: Clear problem-solution; quantified targets; detailed plan; costed budget; risks & mitigations
        if proposal_signals >= 6:
            score = 5
        # 4: Strong plan with minor gaps; targets & timelines present
        elif proposal_signals >= 4:
            score = 4
        # 3: Direction clear; targets generic; budget rough
        elif proposal_signals >= 3:
            score = 3
        # 2: Vague plan; limited targets
        elif proposal_signals >= 2:
            score = 2
        # 1: Aspirational; no plan/targets
        elif proposal_signals >= 1:
            score = 1

        return min(score, 5)

    def _score_value_chain_alignment(self, application, content):
        """A3.5: Value Chain Alignment & Role (10%)"""
        score = 0

        vc_signals = 0
        if "processing" in content: vc_signals += 1
        if "manufacturing" in content: vc_signals += 1
        if "aggregation" in content: vc_signals += 1
        if "linkages" in content: vc_signals += 1
        if "upstream" in content or "downstream" in content: vc_signals += 1

        # Check if in priority value chain
        is_priority_vc = self._evaluate_value_chain(application, content)

        if is_priority_vc:
            # 5: Priority VC; fills critical node; documented linkages
            if vc_signals >= 4:
                score = 5
            # 4: Priority VC; clear node participation; some linkages
            elif vc_signals >= 3:
                score = 4
            # 3: Priority VC; weak linkages; potential to upgrade
            elif vc_signals >= 2:
                score = 3
            # 2: Peripheral role; unclear node
            else:
                score = 2
        else:
            # 1: Marginal link
            score = 1

        return min(score, 5)

    def _score_inclusivity_sustainability(self, application, content):
        """A3.6: Inclusivity & Sustainability (20%)"""
        score = 0

        inclusivity_signals = 0
        sustainability_signals = 0

        # Gender/youth inclusion
        if "women" in content: inclusivity_signals += 1
        if "youth" in content: inclusivity_signals += 1
        if "female" in content: inclusivity_signals += 1
        if "young" in content: inclusivity_signals += 1
        if "diversity" in content: inclusivity_signals += 1

        # PWD inclusion
        if "disabled" in content or "pwd" in content: inclusivity_signals += 1

        # Green practices
        if "environment" in content: sustainability_signals += 1
        if "sustainable" in content: sustainability_signals += 1
        if "green" in content: sustainability_signals += 1
        if "recycling" in content: sustainability_signals += 1
        if "efficiency" in content: sustainability_signals += 1

        total_signals = inclusivity_signals + sustainability_signals

        # 5: ≥50% women/youth or ≥30% women leadership; PWD inclusion; 2+ green practices
        if total_signals >= 5:
            score = 5
        # 4: Strong gender/youth participation; 1-2 green practices
        elif total_signals >= 3:
            score = 4
        # 3: Moderate inclusion; some intent on sustainability
        elif total_signals >= 2:
            score = 3
        # 2: Low inclusion; ad-hoc green steps
        elif total_signals >= 1:
            score = 2

        return min(score, 5)

    def _get_grade(self, score):
        """Convert score to grade"""
        if score >= 80:
            return "Excellent"
        elif score >= 70:
            return "Good"
        elif score >= 60:
            return "Fair"
        else:
            return "Poor"

def main():
    """Process all county JSON files and generate evaluations"""

    evaluator = KJETCountyEvaluator()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, "output-results")
    input_dir = os.path.join(base_dir, "output")

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Get all county JSON files
    county_files = [f for f in os.listdir(input_dir) if f.endswith('_kjet_applications_complete.json')]

    print(f"Found {len(county_files)} county files to process")

    for county_file in tqdm(county_files, desc="Processing counties", unit="county"):
        county_path = os.path.join(input_dir, county_file)
        county_name = county_file.replace('_kjet_applications_complete.json', '')

        print(f"\n📍 Processing {county_name}...")

        try:
            # Load county data
            with open(county_path, 'r', encoding='utf-8') as f:
                county_data = json.load(f)

            print(f"  📄 Loaded {len(county_data.get('applications', []))} applications")

            # Evaluate applications
            evaluation_results = evaluator.evaluate_county_applications(county_data)

            # Save evaluation results
            output_filename = f"{county_name}_evaluation_results.json"
            output_path = os.path.join(output_dir, output_filename)

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(evaluation_results, f, indent=2, ensure_ascii=False)

            print(f"✓ Completed {county_name}: {evaluation_results['eligibility_summary']['eligible_applications']}/{evaluation_results['eligibility_summary']['total_applications']} eligible")

        except Exception as e:
            print(f"✗ Error processing {county_name}: {str(e)}")
            print(f"  Continuing with next county...")
            continue

    print(f"\n🎉 Evaluation complete! Results saved to {output_dir}")
    print(f"📊 Processed {len(county_files)} counties total")

if __name__ == "__main__":
    main()