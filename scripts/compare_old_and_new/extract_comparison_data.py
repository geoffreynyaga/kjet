import csv
import json
import os
import re
from pathlib import Path
from argparse import Namespace

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

def extract_comparison_data(cohort="latest"):
    """Extract data from human results CSV and convert to JSON format."""
    script_dir = Path(__file__).parent
    workspace_root = script_dir.parent.parent
    
    # Use the correct human results CSV
    csv_file = workspace_root / "scripts" / "human" / f"kjet-human-final-results-{cohort}.csv"
    if cohort == "latest" and not csv_file.exists():
        csv_file = workspace_root / "scripts" / "human" / "kjet-human-final-results-latest.csv"
    
    output_dir = workspace_root / "ui" / "public" / cohort
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "comparison_data.json"
    final_human_file = output_dir / "kjet-human-final.json"

    if not csv_file.exists():
        print(f"Error: {csv_file} not found!")
        return

    c1_scores = load_c1_scores(workspace_root) if cohort == "latest" else {}

    data = []
    current_county = ""

    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            # Skip metadata (7 rows)
            for _ in range(7): next(file)
            reader = csv.reader(file)
            header = next(reader)
            # Find indices dynamically if possible, or use defaults
            try:
                idx_id = header.index("Application ID")
                idx_county = header.index("E2. County Mapping")
                idx_total = header.index("TOTAL")
                idx_final = header.index("Sum of weighted scores - Penalty(if any)")
                idx_rank = header.index("Ranking from composite score")
            except ValueError:
                # Fallback to confirmed indices from diagnostic
                idx_id = 1
                idx_county = 3
                idx_total = 35
                idx_final = 37
                idx_rank = 38

            for row in reader:
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

                # Scores and Rank
                raw_score = row[idx_final].strip() if len(row) > idx_final else ""
                if not raw_score:
                    raw_score = row[idx_total].strip() if len(row) > idx_total else ""
                
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
                    
                    total_score_val = float(score_val) if str(score_val).replace('.','',1).isdigit() else 0
                    
                    entry = {
                        "Application ID": app_id,
                        "County": county,
                        "E2. County Mapping": county,
                        "Human Score": total_score_val,
                        "Human Rank": str(rank_val),
                        "TOTAL": total_score_val,
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
                        total_score_val = float(raw_score) if raw_score and raw_score.replace('.','',1).isdigit() else 0
                    except:
                        total_score_val = 0

                    entry = {
                        "Application ID": app_id,
                        "County": county,
                        "E2. County Mapping": county,
                        "Human Score": total_score_val,
                        "Human Rank": rank,
                        "TOTAL": total_score_val,
                        "Sum of weighted scores - Penalty(if any)": total_score_val,
                        "Ranking from composite score": rank,
                        "PASS/FAIL": "Pass" if rank and rank.isdigit() and int(rank) > 0 else "Fail",
                        "REASON(Evaluators Comments)": row[8] if len(row) > 8 else "",
                        # Criteria with spaces
                        "A3.1 Registration & Track Record ": float(row[9]) if len(row) > 9 and row[9].replace('.','',1).isdigit() else 0,
                        "Logic": row[10] if len(row) > 10 else "",
                        "A3.2 Financial Position ": float(row[11]) if len(row) > 11 and row[11].replace('.','',1).isdigit() else 0,
                        "Logic.1": row[12] if len(row) > 12 else "",
                        "A3.3 Market Demand & Competitiveness": float(row[13]) if len(row) > 13 and row[13].replace('.','',1).isdigit() else 0,
                        "Logic.2": row[14] if len(row) > 14 else "",
                        "A3.4 Business Proposal / Growth Viability": float(row[15]) if len(row) > 15 and row[15].replace('.','',1).isdigit() else 0,
                        "Logic.3": row[16] if len(row) > 16 else "",
                        "A3.5 Value Chain Alignment & Role": float(row[17]) if len(row) > 17 and row[17].replace('.','',1).isdigit() else 0,
                        "Logic.4": row[18] if len(row) > 18 else "",
                        "A3.6 Inclusivity & Sustainability ": float(row[19]) if len(row) > 19 and row[19].replace('.','',1).isdigit() else 0,
                        "Logic.5": row[20] if len(row) > 20 else ""
                    }
                data.append(entry)

        for target in [output_file, final_human_file]:
            with open(target, 'w', encoding='utf-8') as json_file:
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
    args = parser.parse_args()
    extract_comparison_data(cohort=args.cohort)