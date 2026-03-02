# KJET Pipeline Data Contracts

This document explains data structure and file flow between each pipeline step.
It is written for both cohorts:
- `c1` (cohort 1)
- `latest` (cohort 2)

Use this together with `Makefile`, `rules-c1.md`, and `rules-latest.md`.

## 1) End-to-End Flow

```text
Raw PDFs (data/<cohort>/<county>/application_*/)
  -> make extraction
Extracted JSON + Forms CSV (output/<cohort>/)
  -> make analysis
Eligibility + ranked analysis output (output/<cohort>/kjet_statistics_report.json)
  -> make evaluation (calls make gemini)
Per-county evaluation JSON (output-results/<cohort>/*_evaluation_results.json)
Machine ranking CSV/JSON (ui/public/<cohort>/gemini/*.csv|*.json)
  -> make stats
Aggregate stats text/csv/json (output/<cohort>/)
  -> make src / make collectstatic
Frontend-consumable static files (ui/public + staticfiles/data)
  -> make human
Human JSON baselines for comparisons (ui/public/<cohort>/kjet-human-*.json + baseline*.json)
  -> make convert-csv
Gemini CSV to JSON conversion for dashboard
  -> make comparison
comparison_data.json for comparison dashboard support
```

## 2) Directory Contracts

### Input

```text
data/
  c1/
    <County>/
      application_<id>_bundle/
        application_info_<id>.pdf
        <attachments>.pdf|.jpg|.png
  latest/
    <County>/
      application_KJET-<timestamp>-<suffix>_with_attachments.../
        application_KJET-<timestamp>-<suffix>.pdf
        <attachments>.pdf|.jpg|.png
```

### Core Processing Output

```text
output/<cohort>/
  <County>_kjet_applications_complete.json
  <County>_kjet_forms.csv
  kjet_statistics_report.json
  kjet_statistics_report.txt
  kjet_statistics_data.csv

output-results/<cohort>/
  <County>_evaluation_results.json
  national_evaluation_summary.json
```

### Dashboard Data

```text
ui/public/<cohort>/
  gemini/<county>.csv
  gemini/<county>.json
  kjet-human-first.json
  kjet-human-final.json
  baseline-first-results.json
  baseline-final-results.json
  baseline-combined.json
  comparison_data.json
  output-results/*
```

## 3) Step-by-Step I/O Contracts

## Step A — `make extraction`
Scripts:
- `scripts/extraction/extract_all_documents.py`
- `scripts/extraction/forms_to_csv.py`

Input:
- `data/<cohort>/<county>/application_*/**`

Output:
- `output/<cohort>/<County>_kjet_applications_complete.json`
- `output/<cohort>/<County>_kjet_forms.csv`

Main JSON contract:

```ts
interface ExtractedCountyFile {
  metadata: {
    county: string;
    cohort?: "c1" | "latest";
    extraction_date: string;
    total_applications: number;
  };
  applications: ExtractedApplication[];
}

interface ExtractedApplication {
  application_id: string;
  county: string;
  full_path: string;
  application_info: Record<string, ExtractedDocument>;
  financial_documents: Record<string, ExtractedDocument>;
  registration_documents: Record<string, ExtractedDocument>;
  other_documents: Record<string, ExtractedDocument | unknown>;
  document_summary: {
    total_documents: number;
    pdf_count: number;
    image_count: number;
    ocr_fallback_used?: number;
    has_application_form: boolean;
    has_registration_cert: boolean;
    has_financial_statements: boolean;
    has_bank_statements: boolean;
  };
  processing_errors: string[];
  content_analysis?: unknown;
}

interface ExtractedDocument {
  file_type: string;
  file_name: string;
  content: string;
  extraction_status: "success" | "error";
}
```

Main CSV contract (`COLUMN_ORDER` from `forms_to_csv.py`):
- Key IDs: `app_id`, `app_number`, `cluster_name`, `county`
- Contact + profile + membership + value chain + financial + market + sustainability fields
- This CSV is the structured source used by analysis and scoring logic.

## Step B — `make analysis`
Script:
- `scripts/analysis/analyze_kjet_applications.py`

Input:
- `output/<cohort>/<County>_kjet_applications_complete.json`
- `output/<cohort>/<County>_kjet_forms.csv`

Output:
- `output/<cohort>/kjet_statistics_report.json`

Contract summary:

```ts
interface AnalysisResult {
  metadata: {
    analysis_date: string;
    cohort: "c1" | "latest";
    total_counties: number;
    total_applications: number;
    eligible_applications: number;
    scored_applications: number;
  };
  county_summary: Record<string, {
    total: number;
    eligible: number;
    rankings: ApplicationAnalysis[];
  }>;
  detailed_results: ApplicationAnalysis[];
}

interface ApplicationAnalysis {
  application_id: string;
  applicant_name: string;
  county: string;
  is_c1_alternate?: boolean; // True for Cohort 1 Rank 3/4 candidates added to latest
  scores: {
    registration_track_record: number; // 0..5
    financial_position: number; // 0..5
    market_demand_competitiveness: number; // 0..5
    business_proposal_viability: number; // 0..5
    value_chain_alignment: number; // 0..5
    inclusivity_sustainability: number; // 0..5
    composite_score?: number; // 0..100
    "Sum of weighted scores - Penalty(if any)"?: number; // For frontend compatibility
  };
  composite_score: number;
  weighted_score: number;
  rank: number;
  tier: string | null;
}
```

## Step C — `make evaluation` + `make gemini`
Scripts:
- `scripts/evaluation/county_evaluator.py`
- `scripts/evaluation/generate_evaluation_summary.py`
- `scripts/evaluation/agentic_csv_generator.py`

Input:
- `output/<cohort>/<County>_kjet_applications_complete.json`
- (for C1) `output/<cohort>/<County>_kjet_forms.csv`

Output:
- `output-results/<cohort>/<County>_evaluation_results.json`
- `output-results/<cohort>/national_evaluation_summary.json`
- `ui/public/<cohort>/gemini/<county>.csv`

Gemini CSV contract (strict column order):

```ts
interface GeminiCsvRow {
  Rank: number | "";
  "Application ID": string;
  "Applicant Name": string;
  "Eligibility Status": "ELIGIBLE" | "INELIGIBLE";
  "Composite Score": string; // numeric text 0..100
  "S1_Registration_Track_Record_5% Score"?: number;
  "S1_Registration_Track_Record_5% Reason"?: string;
  "S2_Financial_Position_20% Score"?: number;
  "S2_Financial_Position_20% Reason"?: string;
  "S3_Market_Demand_Competitiveness_20% Score"?: number;
  "S3_Market_Demand_Competitiveness_20% Reason"?: string;
  "S4_Business_Proposal_Viability_25% Score"?: number;
  "S4_Business_Proposal_Viability_25% Reason"?: string;
  "S5_Value_Chain_Alignment_10% Score"?: number;
  "S5_Value_Chain_Alignment_10% Reason"?: string;
  "S6_Inclusivity_Sustainability_20% Score"?: number;
  "S6_Inclusivity_Sustainability_20% Reason"?: string;
  "Ineligibility Criterion Failed"?: string;
  "Reason"?: string;
}
```

## Step D — `make human`
Scripts:
- `scripts/human/convert.py`
- `scripts/human/baseline.py`
- `scripts/human/combine_baseline.py`

Input:
- `scripts/human/kjet-human-<cohort>-first.csv`
- `scripts/human/kjet-human-<cohort>-final.csv`

Output:
- `ui/public/<cohort>/kjet-human-first.json`
- `ui/public/<cohort>/kjet-human-final.json`
- `ui/public/<cohort>/baseline-first-results.json`
- `ui/public/<cohort>/baseline-final-results.json`
- `ui/public/<cohort>/baseline-combined.json`

Human JSON fields used by comparison dashboard:
- `Application ID`
- `E2. County Mapping` or `mapping`
- `A3.1`..`A3.6` criterion raw values
- `Sum of weighted scores - Penalty(if any)`
- `Ranking from composite score`
- `Logic`, `Logic.1`, ... (reason columns)

## Step E — `make convert-csv` + `make comparison`
Scripts:
- `scripts/conversion/convert_csv_to_json.py`
- `scripts/compare_old_and_new/extract_comparison_data.py`

Input:
- Machine Score source: Gemini JSON files in `ui/public/<cohort>/gemini/`
- Human Score source: `scripts/human/kjet-human-final-results-latest.csv` (robust multi-line header extraction)
- Alignment weights: 10/20/20/25/15/10 (Cohort 1 standard)

Output:
- Gemini JSON files for dashboard
- `ui/public/<cohort>/comparison_data.json`

## 4) Scoring Contracts

Both human and machine use criterion scores `0..5`, then weighted composite `0..100`:

$$
\text{Composite} = \sum_{i=1}^{6} \left(\frac{S_i}{5} \times 100\right) \times w_i
$$

### Cohort 1 (C1)
Reference: `rules-c1.md` scoring matrix (B1)
- Registration: 10%
- Financial: 20%
- Market: 20%
- Proposal: 25%
- Value Chain: 15%
- Inclusivity: 10%

### Cohort 2 (latest)
Reference: `rules-latest.md`
- Registration: 5%
- Financial: 20%
- Market: 20%
- Proposal: 25%
- Value Chain: 10%
- Inclusivity: 20%

## 5) Comparison Dashboard Contract (`/comparisons`)

Main merge logic:
- Human source: `ui/public/<cohort>/kjet-human-final.json`
- Machine source: `ui/public/<cohort>/gemini/<county>.json`
- Matching key: `Application ID` <-> `application_id` using numeric/suffix matching

Current comparison behavior:
- Human score and machine score are compared on `0..100` scale
- Criterion card compares `A3.*` human values vs machine criterion values on `0..5` scale
- For cohort `latest`, comparable human score should use latest rules weights when score parity is required.

## 6) Operational Notes

- `make run` should execute one extraction pass only.
- `make evaluation` invokes `make gemini`.
- PDF extraction may require OCR fallback for scanned/corrupted PDFs.
- Always run with explicit cohort when needed:
  - `make run COHORT=c1`
  - `make run COHORT=latest`
