import csv
import json
import os
import re
import sys
from pathlib import Path
from argparse import Namespace

HUMAN_SCRIPT_DIR = Path(__file__).resolve().parents[1] / "human"
sys.path.append(str(HUMAN_SCRIPT_DIR))
from csv_schema import cell, column_index, find_header_index

def extract_applicant_id(bundle_link):
    """Extract applicant ID from bundle link or string."""
    if not bundle_link:
        return ""
    # Pattern to match application_XXX_bundle format
    match = re.search(r'application_([A-Z0-9-]+)', bundle_link, re.IGNORECASE)
    if match:
        return f"Applicant_{match.group(1)}"
    
    # Handle direct Applicant_XXX format
    match = re.search(r'Applicant_([A-Z0-9-]+)', bundle_link, re.IGNORECASE)
    if match:
        return f"Applicant_{match.group(1)}"
        
    return bundle_link

def canonicalize_county(name):
    """Normalize county name for matching."""
    if not name: return ""
    name = name.strip().upper()
    mapping = {
        "HOMABAY": "HOMA BAY",
        "MURANG_A": "MURANG'A",
        "MURANGA": "MURANG'A",
        "WEST POKOT": "WEST POKOT",
        "ELGEIYO MARAKWET": "ELGEYO MARAKWET"
    }
    return mapping.get(name, name)


def numeric_value(value, default=0.0):
    try:
        text = str(value or "").strip()
        if not text or text.startswith("#") or text.upper() == "DQ":
            return default
        return float(text)
    except (TypeError, ValueError):
        return default

def load_c1_scores(workspace_root):
    """Load Cohort 1 human scores for lookup from multiple possible sources."""
    sources = [
        workspace_root / "ui" / "public" / "c1" / "kjet-human-final.json",
        workspace_root / "ui" / "public" / "c1" / "baseline-final-results.json"
    ]
    scores = {}
    for path in sources:
        if not path.exists(): continue
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for app in data:
                    app_id_raw = app.get("Application ID") or app.get("application_id")
                    if app_id_raw:
                        app_id = extract_applicant_id(str(app_id_raw))
                        # Merge if already exists to keep as much data as possible
                        if app_id in scores:
                            scores[app_id].update(app)
                        else:
                            scores[app_id] = app
        except Exception as e:
            print(f"Warning: Error loading {path}: {e}")
    return scores

def extract_comparison_data(cohort="latest", workspace_root=None):
    """Extract data from human results CSV and convert to JSON format."""
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent
    # Inputs/outputs may be redirected to a sandbox; C1 reference scores always
    # come from the repo, so a sandboxed run produces identical output.
    workspace_root = Path(workspace_root) if workspace_root else repo_root

    # Use the correct human results CSV
    csv_file = workspace_root / "scripts" / "human" / f"kjet-human-final-results-{cohort}.csv"
    if cohort == "latest" and not csv_file.exists():
        csv_file = workspace_root / "scripts" / "human" / "kjet-human-final-results-latest.csv"
    
    output_dir = workspace_root / "ui" / "public" / cohort
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "comparison_data.json"

    if not csv_file.exists():
        print(f"Error: {csv_file} not found!")
        return

    c1_scores = load_c1_scores(repo_root) if cohort == "latest" else {}

    data = []
    current_county = ""

    try:
        with open(csv_file, 'r', encoding='utf-8-sig') as file:
            records = list(csv.reader(file))
            header_index = find_header_index(records)
            header = records[header_index]
            idx_id = column_index(header, "Application ID")
            idx_county = column_index(header, "E2. County Mapping")
            idx_e3 = column_index(header, "E3. Priority Value Chain")
            idx_reason = column_index(header, "REASON(Evaluators Comments)")
            idx_a31 = column_index(header, "A3.1 Registration & Track Record")
            idx_a32 = column_index(header, "A3.2 Financial Position")
            idx_a33 = column_index(
                header, "A3.3 Market Demand & Competitiveness"
            )
            idx_a34 = column_index(
                header, "A3.4 Business Proposal / Growth Viability"
            )
            idx_a35 = column_index(header, "A3.5 Value Chain Alignment & Role")
            idx_a36 = column_index(
                header, "A3.6 Inclusivity & Sustainability"
            )
            idx_total = column_index(header, "TOTAL")
            idx_equity = column_index(header, "Equity Points", required=False)
            idx_final = column_index(
                header, "Sum of weighted scores - Penalty(if any)"
            )
            idx_rank = column_index(header, "Ranking from composite score")

            for row in records[header_index + 1:]:
                if not row or len(row) < 10: continue
                
                # County header row check
                if row[0] and not any(row[1:5]):
                    current_county = canonicalize_county(row[0])
                    continue
                
                app_id_raw = row[idx_id] if len(row) > idx_id else row[0]
                if not app_id_raw: continue
                if not any(kw in app_id_raw.lower() for kw in ["application_", "applicant_"]):
                    continue
                
                app_id = extract_applicant_id(app_id_raw)
                county = canonicalize_county(row[idx_county]) if len(row) > idx_county else current_county
                if not county: county = current_county
                e3_pvc = row[idx_e3].strip() if len(row) > idx_e3 else ""

                # Scores and Rank
                raw_score = row[idx_final].strip() if len(row) > idx_final else ""
                if not raw_score:
                    raw_score = row[idx_total].strip() if len(row) > idx_total else ""
                equity_points = numeric_value(cell(row, idx_equity))
                
                rank = row[idx_rank].strip() if len(row) > idx_rank else ""

                # Special Case for Cohort 1 alternates in Latest CSV (if score is 0 or non-numeric)
                needs_injection = not raw_score or raw_score in ["0", "0.0", "#N/A", "#VALUE!"]
                if needs_injection and app_id in c1_scores:
                    c1_app = c1_scores[app_id]
                    # Score lookup logic
                    score_val = (c1_app.get("Sum of weighted scores - Penalty(if any)") or 
                                c1_app.get("TOTAL") or 
                                c1_app.get("weighted_score") or "0")
                    rank_val = (c1_app.get("Ranking from composite score") or 
                               c1_app.get("Human Rank") or 
                               c1_app.get("ranking") or 
                               c1_app.get("county_rank") or "")
                    
                    total_score_val = numeric_value(score_val)
                    equity_points = numeric_value(c1_app.get("Equity Points"))
                    
                    entry = {
                        "Application ID": app_id,
                        "County": county,
                        "E2. County Mapping": county,
                        "E3. Priority Value Chain": c1_app.get("E3. Priority Value Chain", e3_pvc),
                        "Human Score": total_score_val,
                        "Human Rank": str(rank_val),
                        "TOTAL": total_score_val,
                        "Equity Points": equity_points,
                        "Sum of weighted scores - Penalty(if any)": total_score_val,
                        "Ranking from composite score": str(rank_val),
                        "PASS/FAIL": "Pass",
                        "REASON(Evaluators Comments)": c1_app.get("REASON(Evaluators Comments)", "Cohort 1 data injected"),
                        # Detailed criteria keys with EXACT expected trailing spaces
                        "A3.1 Registration & Track Record ": float(c1_app.get("A3.1 Registration & Track Record ") or c1_app.get("A3.1", 0)),
                        "Logic": c1_app.get("Logic", ""),
                        "A3.2 Financial Position ": float(c1_app.get("A3.2 Financial Position ") or c1_app.get("A3.2", 0)),
                        "Logic.1": c1_app.get("Logic.1", ""),
                        "A3.3 Market Demand & Competitiveness": float(c1_app.get("A3.3 Market Demand & Competitiveness") or c1_app.get("A3.3", 0)),
                        "Logic.2": c1_app.get("Logic.2", ""),
                        "A3.4 Business Proposal / Growth Viability": float(c1_app.get("A3.4 Business Proposal / Growth Viability") or c1_app.get("A3.4", 0)),
                        "Logic.3": c1_app.get("Logic.3", ""),
                        "A3.5 Value Chain Alignment & Role": float(c1_app.get("A3.5 Value Chain Alignment & Role") or c1_app.get("A3.5", 0)),
                        "Logic.4": c1_app.get("Logic.4", ""),
                        "A3.6 Inclusivity & Sustainability ": float(c1_app.get("A3.6 Inclusivity & Sustainability ") or c1_app.get("A3.6", 0)),
                        "Logic.5": c1_app.get("Logic.5", "")
                    }
                else:
                    try:
                        total_score_val = numeric_value(raw_score)
                    except:
                        total_score_val = 0

                    entry = {
                        "Application ID": app_id,
                        "County": county,
                        "E2. County Mapping": county,
                        "E3. Priority Value Chain": e3_pvc,
                        "Human Score": total_score_val,
                        "Human Rank": rank,
                        "TOTAL": total_score_val,
                        "Equity Points": equity_points,
                        "Sum of weighted scores - Penalty(if any)": total_score_val,
                        "Ranking from composite score": rank,
                        "PASS/FAIL": "Pass" if rank and rank.isdigit() and int(rank) > 0 else "Fail",
                        "REASON(Evaluators Comments)": cell(row, idx_reason),
                        # Criteria with spaces
                        "A3.1 Registration & Track Record ": numeric_value(cell(row, idx_a31)),
                        "Logic": cell(row, idx_a31 + 1),
                        "A3.2 Financial Position ": numeric_value(cell(row, idx_a32)),
                        "Logic.1": cell(row, idx_a32 + 1),
                        "A3.3 Market Demand & Competitiveness": numeric_value(cell(row, idx_a33)),
                        "Logic.2": cell(row, idx_a33 + 1),
                        "A3.4 Business Proposal / Growth Viability": numeric_value(cell(row, idx_a34)),
                        "Logic.3": cell(row, idx_a34 + 1),
                        "A3.5 Value Chain Alignment & Role": numeric_value(cell(row, idx_a35)),
                        "Logic.4": cell(row, idx_a35 + 1),
                        "A3.6 Inclusivity & Sustainability ": numeric_value(cell(row, idx_a36)),
                        "Logic.5": cell(row, idx_a36 + 1)
                    }
                data.append(entry)

        with open(output_file, 'w', encoding='utf-8') as json_file:
            json.dump(data, json_file, indent=2, ensure_ascii=True)

        print(f"Successfully extracted {len(data)} records for cohort {cohort}")
        return data

    except Exception as e:
        print(f"Error processing file: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--cohort", default="latest")
    parser.add_argument("--workspace-root", help="Root to resolve inputs/outputs against (defaults to the repo)")
    args = parser.parse_args()
    extract_comparison_data(cohort=args.cohort, workspace_root=args.workspace_root)
