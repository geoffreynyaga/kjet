import csv
import re
from pathlib import Path
from tqdm import tqdm
from utils import extract_pdf_text, discover_counties_and_applications, extract_application_id_from_folder_name

# Global consistent column order for all CSV operations
COLUMN_ORDER = [
    "app_id", "app_number", "cluster_name", "registration_status",
    "registration_status_other", "registration_number", "county",
    "constituency", "ward", "location", "phone_number", "alternate_phone",
    "email", "chairperson", "secretary", "ceo", "director", "manager",
    "treasurer", "woman_owned_enterprise", "woman_owned_explanation",
    "place_of_operation", "place_of_operation_other", "place_of_operation_name",
    "members_2022", "members_2023", "members_2024", "employees_2022",
    "employees_2023", "employees_2024", "members_male", "members_female",
    "members_age_18_35", "members_age_36_50", "members_age_above_50",
    "value_chain", "value_chain_other", "economic_activities_description",
    "turnover_2022", "net_profit_2022", "turnover_2023", "net_profit_2023",
    "turnover_2024", "net_profit_2024", "business_objectives", "main_competitors",
    "success_factors", "critical_equipment_investment_plans", "price_cost_margins",
    "accounting_package", "accounting_package_other", "backward_linkages",
    "ecommerce_channels", "sales_domestic_b2b_percent", "b2b_description",
    "sales_domestic_b2c_percent", "b2c_description", "exports_percent",
    "exports_description", "marketing_expansion_plan", "problem_statement",
    "sustainable_practices", "submitted_at"
]

def load_questions():
    """Load questions from questions.txt file."""
    questions_file = Path(__file__).parent / "questions.txt"
    questions = {}

    if questions_file.exists():
        with open(questions_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and '. ' in line:
                    try:
                        num_str, question = line.split('. ', 1)
                        num = int(num_str)
                        questions[num] = question
                    except ValueError:
                        continue

    return questions

def extract_application_data(text_content):
    """
    Extract question-answer pairs from application text using reference questions.
    Returns a dictionary with snake_case keys.
    """

    # Remove page headers and clean up text
    text_content = text_content.replace("Application Details\n", "")
    text_content = text_content.replace("Application Details", "")

    # Load reference questions
    reference_questions = load_questions()

    # Define column mappings (question number -> snake_case name)
    column_mapping = {
        1: "app_id",
        2: "app_number",
        3: "cluster_name",
        4: "registration_status",
        5: "registration_status_other",
        6: "registration_number",
        7: "county",
        8: "constituency",
        9: "ward",
        10: "location",
        11: "phone_number",
        12: "alternate_phone",
        13: "email",
        14: "chairperson",
        15: "secretary",
        16: "ceo",
        17: "director",
        18: "manager",
        19: "treasurer",
        20: "woman_owned_enterprise",
        21: "woman_owned_explanation",
        22: "place_of_operation",
        23: "place_of_operation_other",
        24: "place_of_operation_name",
        25: "members_2022",
        26: "members_2023",
        27: "members_2024",
        28: "employees_2022",
        29: "employees_2023",
        30: "employees_2024",
        31: "members_male",
        32: "members_female",
        33: "members_age_18_35",
        34: "members_age_36_50",
        35: "members_age_above_50",
        36: "value_chain",
        37: "value_chain_other",
        38: "economic_activities_description",
        39: "turnover_2022",
        40: "net_profit_2022",
        41: "turnover_2023",
        42: "net_profit_2023",
        43: "turnover_2024",
        44: "net_profit_2024",
        45: "business_objectives",
        46: "main_competitors",
        47: "success_factors",
        48: "critical_equipment_investment_plans",
        49: "price_cost_margins",
        50: "accounting_package",
        51: "accounting_package_other",
        52: "backward_linkages",
        53: "ecommerce_channels",
        54: "sales_domestic_b2b_percent",
        55: "b2b_description",
        56: "sales_domestic_b2c_percent",
        57: "b2c_description",
        58: "exports_percent",
        59: "exports_description",
        60: "marketing_expansion_plan",
        61: "problem_statement",
        62: "sustainable_practices",
        63: "submitted_at"
    }

    # Extract data using string algorithms
    data = {}

    # Clean and normalize text for better matching
    normalized_text = re.sub(r'\s+', ' ', text_content)  # Replace multiple whitespace with single space

    # Find answers by looking for content between consecutive questions
    for question_num in range(1, 64):  # We have 63 questions
        if question_num not in column_mapping:
            continue

        col_name = column_mapping[question_num]

        # Build patterns to find this question and the next question
        current_question_patterns = [
            f"{question_num}. ",
            f"\n{question_num}. ",
            f" {question_num}. "
        ]

        # Find the start of current question
        question_start = -1
        for pattern in current_question_patterns:
            pos = normalized_text.find(pattern)
            if pos != -1:
                question_start = pos + len(pattern)
                break

        if question_start == -1:
            # Question not found, set empty answer
            data[col_name] = ""
            continue

        # Find the start of next question (or end of text)
        next_question_start = len(normalized_text)  # Default to end of text

        for next_num in range(question_num + 1, 65):  # Look for next questions
            next_patterns = [
                f"{next_num}. ",
                f"\n{next_num}. ",
                f" {next_num}. "
            ]

            for pattern in next_patterns:
                pos = normalized_text.find(pattern, question_start)
                if pos != -1 and pos < next_question_start:
                    next_question_start = pos
                    break

        # Extract the content between current question and next question
        question_content = normalized_text[question_start:next_question_start].strip()

        # Remove the actual question text from the content if it's present
        if question_num in reference_questions:
            ref_question = reference_questions[question_num]
            # Try to remove question text from the beginning
            if question_content.startswith(ref_question):
                question_content = question_content[len(ref_question):].strip()
            else:
                # Try partial matching - sometimes questions might be slightly different
                words = ref_question.split()[:5]  # First 5 words
                partial_question = ' '.join(words)
                if question_content.startswith(partial_question):
                    question_content = question_content[len(partial_question):].strip()

        # Clean up the answer
        answer = question_content.strip()

        # Remove newlines and normalize spaces
        answer = re.sub(r'\s+', ' ', answer)

        # Handle special characters
        answer = answer.replace('â€¢', '•').replace('â€™', "'").replace('&amp;', '&')

        # Check if this is actually an answer or just question text
        if (not answer or
            answer.endswith('?') or
            len(answer) < 2 or
            answer in ['Business Objectives', 'Main Competitors', 'Success Factors', 'Other Value Chain', 'Other Accounting Package', 'Private_Premise']):
            answer = ""

        data[col_name] = answer

    return data

def process_application_info_pdf(pdf_path, output_dir, county_name, app_id):
    """
    Process a single application_info_*.pdf file and convert to CSV.
    """
    try:
        # Extract text from PDF
        text_content = extract_pdf_text(pdf_path)

        if text_content.startswith("ERROR:"):
            print(f"❌ Failed to extract text from {pdf_path.name}: {text_content}")
            return False

        # Extract structured data
        app_data = extract_application_data(text_content)

        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)

        # Create output CSV file
        output_file = output_dir / f"application_info_{app_id}.csv"

        # Use global consistent column order

        # Add county and app_id to data if not present
        if "county" not in app_data or not app_data["county"]:
            app_data["county"] = county_name
        if "app_id" not in app_data or not app_data["app_id"]:
            app_data["app_id"] = app_id

        # Write to CSV
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=COLUMN_ORDER, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerow(app_data)

        print(f"✅ {county_name}/{app_id}: {output_file.name} ({len(app_data)} fields)")
        return True

    except Exception as e:
        print(f"❌ Error processing {pdf_path.name}: {str(e)}")
        return False


def merge_county_csvs(output_base_dir, counties_data):
    """
    Memory-intensive approach to merge all individual CSV files per county into single county CSV files.
    Reads each CSV into memory, ensures consistent headers, and properly combines all rows.
    Places merged files in the root output/ folder as {county}_kjet_forms.csv
    """
    print()
    print("=" * 40)
    print("MERGING COUNTY CSV FILES (Memory-intensive approach)")
    print()

    # Use global consistent column order

    merged_files = []
    total_merged = 0

    for county_name, _ in tqdm(counties_data.items(), desc="Merging counties"):
        county_output_dir = output_base_dir / county_name

        if not county_output_dir.exists():
            print(f"⚠️  {county_name}: County directory not found, skipping")
            continue

        # Find all individual CSV files for this county
        csv_files = list(county_output_dir.glob("application_info_*.csv"))

        if not csv_files:
            print(f"⚠️  {county_name}: No CSV files found, skipping")
            continue

        # Create merged file path in root output directory
        merged_file_path = output_base_dir / f"{county_name}_kjet_forms.csv"

        try:
            print(f"🔄 Processing {county_name}: Loading {len(csv_files)} CSV files into memory...")

            # Memory-intensive approach: Load all data into memory first
            all_data_rows = []

            for i, csv_file in enumerate(sorted(csv_files)):
                try:
                    # Read the entire CSV file into memory
                    with open(csv_file, 'r', encoding='utf-8') as f:
                        # Read all lines into memory
                        content = f.read().strip()

                        if not content:
                            print(f"    ⚠️  Empty file: {csv_file.name}")
                            continue

                        # Split into lines
                        lines = content.split('\n')

                        if len(lines) < 2:  # Need at least header + 1 data row
                            print(f"    ⚠️  Insufficient data in file: {csv_file.name}")
                            continue

                        # Parse CSV manually to ensure consistency
                        csv_reader = csv.reader(lines, quoting=csv.QUOTE_ALL)
                        rows = list(csv_reader)

                        if len(rows) < 2:
                            print(f"    ⚠️  No data rows in file: {csv_file.name}")
                            continue

                        # Get header and data
                        header = rows[0]
                        data_row = rows[1]  # Should only be one data row per file

                        # Create dictionary from header and data
                        if len(header) == len(data_row):
                            row_dict = dict(zip(header, data_row))
                            all_data_rows.append(row_dict)
                            print(f"    ✅ Loaded {csv_file.name}: {len(row_dict)} fields")
                        else:
                            print(f"    ❌ Header/data mismatch in {csv_file.name}: {len(header)} headers vs {len(data_row)} data fields")

                except Exception as e:
                    print(f"    ❌ Error reading {csv_file.name}: {str(e)}")
                    continue

            if not all_data_rows:
                print(f"❌ {county_name}: No valid data found, skipping")
                continue

            print(f"    📊 Loaded {len(all_data_rows)} applications into memory")

            # Write the merged file with consistent column order
            print(f"    💾 Writing merged file...")
            with open(merged_file_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=COLUMN_ORDER, quoting=csv.QUOTE_ALL)
                writer.writeheader()

                for row_dict in all_data_rows:
                    # Ensure all columns exist with proper defaults
                    complete_row = {}
                    for col in COLUMN_ORDER:
                        complete_row[col] = row_dict.get(col, "")  # Use empty string for missing columns

                    writer.writerow(complete_row)

            file_size = merged_file_path.stat().st_size
            print(f"✅ {county_name}: {len(all_data_rows)} applications merged → {merged_file_path.name} ({file_size:,} bytes)")
            merged_files.append(merged_file_path)
            total_merged += len(all_data_rows)

        except Exception as e:
            print(f"❌ Error merging {county_name}: {str(e)}")
            import traceback
            traceback.print_exc()

    print()
    print("=" * 40)
    print("MERGING COMPLETE")
    print(f"📊 Total: {total_merged} applications merged into {len(merged_files)} county files")
    print(f"📁 Merged files location: {output_base_dir}")
    print()
    print("Merged county files:")
    for merged_file in sorted(merged_files):
        file_size = merged_file.stat().st_size
        county_name = merged_file.stem.replace("_kjet_forms", "")

        # Count rows in the merged file
        with open(merged_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            row_count = sum(1 for _ in reader)

        print(f"  📄 {merged_file.name}: {row_count} applications ({file_size:,} bytes)")


def process_all_counties():
    """
    Process all counties and convert application_info_*.pdf files to CSV.
    """
    print("KJET Forms to CSV Converter")
    print("=" * 40)

    # Set up paths
    current_dir = Path(__file__).parent.parent.parent  # Go up from scripts/extraction/ to project root
    data_dir = current_dir / "data"
    output_base_dir = current_dir / "output"

    if not data_dir.exists():
        print(f"❌ Error: Data directory not found: {data_dir}")
        return

    # Discover counties and applications
    print("Discovering counties and applications...")
    counties_data = discover_counties_and_applications(data_dir)

    total_applications = sum(len(apps) for apps in counties_data.values())
    total_processed = 0
    total_success = 0
    total_failed = 0

    print(f"Found {len(counties_data)} counties with {total_applications} total applications")
    print()

    # Process each county
    for county_name, application_folders in tqdm(counties_data.items(), desc="Processing counties"):
        county_output_dir = output_base_dir / county_name
        county_processed = 0
        county_success = 0
        county_failed = 0

        if not application_folders:
            print(f"⚪ {county_name}: No applications found")
            continue

        # Process each application folder in the county
        for app_folder in tqdm(application_folders, desc=f"  {county_name}", leave=False):
            total_processed += 1
            county_processed += 1

            # Extract application ID from folder name
            app_id = extract_application_id_from_folder_name(app_folder.name)
            if not app_id:
                print(f"❌ Could not extract app ID from folder: {app_folder.name}")
                total_failed += 1
                county_failed += 1
                continue

            # Look for application_info_*.pdf file
            app_info_files = list(app_folder.glob("application_info_*.pdf"))

            if not app_info_files:
                print(f"⚠️  {county_name}/{app_id}: No application_info_*.pdf found")
                total_failed += 1
                county_failed += 1
                continue

            if len(app_info_files) > 1:
                print(f"⚠️  {county_name}/{app_id}: Multiple application_info files found, using first one")

            # Process the application_info PDF
            app_info_pdf = app_info_files[0]
            success = process_application_info_pdf(app_info_pdf, county_output_dir, county_name, app_id)

            if success:
                total_success += 1
                county_success += 1
            else:
                total_failed += 1
                county_failed += 1

        # Print county summary
        if county_processed > 0:
            success_rate = (county_success / county_processed) * 100
            print(f"📊 {county_name}: {county_success}/{county_processed} successful ({success_rate:.1f}%)")

    # Print final summary
    print()
    print("=" * 40)
    print("CONVERSION COMPLETE")
    print(f"📊 Total: {total_success}/{total_processed} successful ({(total_success/total_processed)*100:.1f}%)")
    print(f"✅ Success: {total_success}")
    print(f"❌ Failed: {total_failed}")
    print(f"📁 Output directory: {output_base_dir}")
    print()
    print("CSV files organized by county:")

    # Show output structure
    for county_name in sorted(counties_data.keys()):
        county_output_dir = output_base_dir / county_name
        if county_output_dir.exists():
            csv_files = list(county_output_dir.glob("application_info_*.csv"))
            if csv_files:
                print(f"  📁 {county_name}/: {len(csv_files)} CSV files")

    # Merge individual CSV files into county-wide files
    if total_success > 0:
        merge_county_csvs(output_base_dir, counties_data)


# Example usage
if __name__ == "__main__":
    process_all_counties()