import pandas as pd
import json
import os
import numpy as np
import argparse
from path_utils import resolve_csv_path

def sanitize_value(v):
    # Convert pandas/Numpy types and NaN/Inf to JSON-serializable Python types
    try:
        if v is None:
            return None
        # pandas uses numpy.nan for missing values
        if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
            return None
        # numpy scalar types
        if isinstance(v, (np.integer, np.floating, np.bool_)):
            return v.item()
        # numpy arrays (shouldn't normally appear) -> convert to list
        if isinstance(v, np.ndarray):
            return v.tolist()
        # For other objects (strings, ints, etc.) just return as-is
        return v
    except Exception:
        # Fallback to string representation if unexpected type
        return str(v)

def extract_csv_to_json(file_path, output_path):
    """
    Reads a CSV file, drops the first row and the last column, and converts its data into a JSON file.

    Args:
        file_path (str): Path to the input CSV file.
        output_path (str): Path to the output JSON file.
    """
    try:
        # Read the CSV file, skipping the first row
        df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip', encoding_errors='replace', skiprows=1)

        # Drop the last column
        df = df.iloc[:, :-1]

        # --- normalize mapping/ county names ---
        def normalize_county_name(x):
            if x is None:
                return None
            s = str(x)
            # replace hyphens with space
            s = s.replace('-', ' ')
            # remove trailing periods and trailing/leading whitespace
            s = s.strip().rstrip('.')
            # collapse multiple spaces into one
            s = ' '.join(s.split())
            return s.upper()

        # find a column named "mapping" (case-insensitive) or any column containing 'mapping'
        mapping_col = None
        for col in df.columns:
            if col.lower() == 'mapping' or 'mapping' in col.lower():
                mapping_col = col
                break

        if mapping_col:
            df[mapping_col] = df[mapping_col].apply(lambda v: normalize_county_name(v) if pd.notnull(v) else v)
        # --- end normalization ---

        # Treat empty strings or whitespace-only cells as missing values
        df = df.replace(r'^\s*$', np.nan, regex=True)

        # Drop rows that are entirely empty (after converting empty strings to NaN)
        df = df.dropna(how='all')

        if df.empty:
            print(f"❌ No data rows found in {file_path} after header/trim.")
            return

        # Replace pandas/NaN values with None for JSON; ensures valid JSON (no NaN)
        df = df.where(pd.notnull(df), None)

        # Convert to records and sanitize numpy types
        raw_records = df.to_dict(orient='records')
        data = []
        for rec in raw_records:
            sanitized = {k: sanitize_value(v) for k, v in rec.items()}
            data.append(sanitized)

        # Remove records that are completely empty (all values are None or empty string)
        def record_has_data(rec: dict) -> bool:
            for v in rec.values():
                if v is None:
                    continue
                if isinstance(v, str) and v.strip() == '':
                    continue
                return True
            return False

        data = [rec for rec in data if record_has_data(rec)]

        # Additionally skip records where the link to bundle is missing/null
        before_len = len(data)
        def has_link(rec: dict) -> bool:
            link = rec.get('Link to application bundle')
            # treat None or empty string as missing
            if link is None:
                return False
            if isinstance(link, str) and link.strip() == '':
                return False
            return True

        data = [rec for rec in data if has_link(rec)]
        removed_count = before_len - len(data)
        if removed_count > 0:
            print(f"Filtered out {removed_count} records with missing Link to application bundle")

        # Write the JSON object to a file
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w') as json_file:
            json.dump(data, json_file, indent=4)

        print(f"✅ Successfully converted {file_path} to {output_path}.")
    except FileNotFoundError:
        print(f"❌ Error: The file {file_path} was not found.")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")

# --- EXECUTION ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert human CSV results to cohort-scoped JSON files")
    parser.add_argument("--cohort", default="latest", help="Cohort output folder (e.g. latest, c1)")
    parser.add_argument("--final-csv", help="Optional path to final results CSV")
    parser.add_argument("--first-csv", help="Optional path to first results CSV")
    args = parser.parse_args()

    # Define the input CSV file and output JSON file paths relative to the base directory
    base_dir = os.getcwd()
    input_csv_final_result = resolve_csv_path(
        base_dir,
        args.cohort,
        args.final_csv,
        [
            "scripts/human/kjet-human-latest-final.csv",
            "scripts/human/kjet-human-latest.csv",
        ],
        "scripts/human/kjet-human-final-results-latest.csv"
    )
    input_csv_first_result = resolve_csv_path(
        base_dir,
        args.cohort,
        args.first_csv,
        [
            "scripts/human/kjet-human-latest-first.csv",
        ],
        "scripts/human/kjet-human-final-results-latest.csv"
    )
    output_folder = os.path.join(base_dir, "ui/public", args.cohort)

    output_json_fin = os.path.join(output_folder, "kjet-human-final.json")
    output_json_first = os.path.join(output_folder, "kjet-human-first.json")

    # Extract data from CSV and save it as JSON
    if input_csv_final_result:
        extract_csv_to_json(input_csv_final_result, output_json_fin)
    else:
        print("❌ No final results CSV found. Skipping kjet-human-final.json generation.")

    if input_csv_first_result:
        extract_csv_to_json(input_csv_first_result, output_json_first)
    else:
        print("⚠️  No first results CSV found. Skipping kjet-human-first.json generation.")

