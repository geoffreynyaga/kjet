# Makefile Automation Guide

This guide details the automation targets available in the project `Makefile`. The Makefile orchestrates the Python data pipeline to ensure scripts are executed in the correct sequence with appropriate environmental context.

## 1. Setup & Installation
Initial environment configuration for the data pipeline.

*   `make venv`: Initializes a Python 3 vitual environment in the root directory.
*   `make install`: Upgrades `pip` and installs all project dependencies from `requirements.txt`.

## 2. Pipeline Execution Steps

### STEP 1: Extraction
*   **Command:** `make extraction`
*   **Logic:**
    *   `scripts/extraction/extract_all_documents.py`: Scans PDF application bundles.
    *   `scripts/extraction/forms_to_csv.py`: Normalizes unstructured data into CSV format.
*   **Purpose**: To convert raw PDF files into machine-readable data structures.
*   **Output**: JSON and CSV artifacts in the `output/` directory.

### STEP 2: Analysis
*   **Command:** `make analysis`
*   **Logic:**
    *   `scripts/analysis/analyze_kjet_applications.py`: Executes cohort-specific logic for eligibility and scoring.
*   **Key Functions:**
    *   `CohortStrategy.check_eligibility()`: Validates registration and legal status.
    *   `CohortStrategy.calculate_scores()`: Computes multi-criteria scores for ranking.
*   **Purpose**: To rank applicants based on the defined scoring weights and business criteria.
*   **Output**: Ranked CSV leaderboards and detailed scoring reports.

### STEP 3: Evaluation & Stats
*   **Commands:** `make evaluation` & `make stats`
*   **Logic:**
    *   `scripts/evaluation/county_evaluator.py`: Generates county summaries.
    *   `scripts/analysis/generate_stats.py`: Calculates national-level metrics.
*   **Purpose**: To aggregate granular results into higher-level executive summaries.
*   **Output**: Per-county summary files and project-wide statistics.

### STEP 4: Dashboard Synchronization
*   **Commands:** `make convert-csv` & `make src`
*   **Logic:**
    *   `scripts/conversion/convert_csv_to_json.py`: Prepares data for the React dashboard.
*   **Purpose**: To deploy processing results to the public-facing UI assets.
*   **Output**: Updated JSON data sources in `ui/public/`.

## 3. Operations & Support

*   **Master Command**: `make run` executes the entire pipeline sequentially (Steps 1 through 4).
*   **Environment Reset**: `make clean` removes generated outputs and the virtual environment.
*   **Documentation**: `make help` lists available targets in the terminal.

---

**Execution Context:**
Targets support cohort-switching via variables: `make analysis COHORT=c1` or `make analysis COHORT=latest`.
