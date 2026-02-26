# --- Environment Setup ---
VENV_DIR := $(CURDIR)/venv
PY := $(VENV_DIR)/bin/python3
PIP := $(VENV_DIR)/bin/pip
COHORT ?= latest
DATA_DIR ?= data/$(COHORT)
HUMAN_FIRST_CSV ?= scripts/human/kjet-human-$(COHORT)-first.csv
HUMAN_FINAL_CSV ?= scripts/human/kjet-human-$(COHORT)-final.csv

.PHONY: all venv install extraction financials evaluation summary stats src convert-csv run build clean help

# Display help information about available commands
help:
	@echo "Available targets:"
	@echo "  make venv         -> create virtualenv in ./venv"
	@echo "  make install      -> install Python requirements into venv"
	@echo "  make extraction   -> run document extraction (long)"
	@echo "  make financials   -> extract financial documents to TXT files"
	@echo "  make analysis     -> run analysis scripts (scoring and ranking)"
	@echo "  make evaluation   -> run county evaluator and national summary"
	@echo "  make gemini       -> generate agentic CSV results for the UI"
	@echo "  make stats        -> run aggregate statistics generator"
	@echo "  make convert-csv  -> convert analysis results to dashboard JSON"
	@echo "  make comparison   -> generate comparison data for the dashboard"
	@echo "  make run          -> run the full data pipeline from start to finish"

# STEP 0: Create the virtual environment
venv:
	@echo "Creating virtualenv at $(VENV_DIR) if missing..."
	if [ ! -d "$(VENV_DIR)" ]; then python3 -m venv "$(VENV_DIR)"; fi

# STEP 1: Install all necessary library dependencies
install: venv
	@echo "Installing Python packages into venv..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

# STEP 2: Extraction - Converts raw PDFs into structured JSON and CSV tables
extraction: install
	@echo "Running extraction: scripts/extraction/extract_all_documents.py (may be long)..."
	$(PY) scripts/extraction/extract_all_documents.py --data-dir $(DATA_DIR) --cohort $(COHORT)
	$(PY) scripts/extraction/forms_to_csv.py --data-dir $(DATA_DIR) --cohort $(COHORT)

# STEP 3: Analysis - Scores every application based on eligibility and the ruleset
analysis: install
	@echo "Running analysis for cohort $(COHORT)..."
	$(PY) scripts/analysis/analyze_kjet_applications.py --cohort $(COHORT) --data-dir $(DATA_DIR)

# STEP 4: Evaluation - Creates summaries for each county and a national overview
evaluation: install
	@echo "Running county evaluator: scripts/evaluation/county_evaluator.py for cohort $(COHORT)"
	$(PY) scripts/evaluation/county_evaluator.py --cohort $(COHORT)
	@echo "Generating national evaluation summary for cohort $(COHORT)"
	$(PY) scripts/evaluation/generate_evaluation_summary.py --cohort $(COHORT)
	$(MAKE) gemini

# STEP 4.5: Gemini - Generates agentic analysis CSVs for the UI
gemini: install
	@echo "Running agentic CSV generator for cohort $(COHORT)..."
	$(PY) scripts/evaluation/agentic_csv_generator.py --cohort $(COHORT)

# STEP 5: Stats - Generates high-level statistical reports
stats: install
	@echo "Running generate_stats.py for cohort $(COHORT)..."
	$(PY) scripts/analysis/generate_stats.py --cohort $(COHORT)

# STEP 6: Conversion - Translates the analysis tables into a format the web dashboard understands
convert-csv:
	@echo "Converting CSV files to JSON format for dashboard for cohort $(COHORT)..."
	$(PY) scripts/conversion/convert_csv_to_json.py --cohort $(COHORT)

# STEP 7: Comparison - Generates data comparing different evaluation runs
comparison: install
	@echo "Generating comparison data..."
	$(PY) scripts/compare_old_and_new/extract_comparison_data.py

# Support: Sync results to UI folder for frontend development
src:
	@echo "Copying evaluation outputs to React public folder for cohort $(COHORT)"
	@mkdir -p ui/public/$(COHORT)/output-results
	@cp -rv output-results/$(COHORT)/* ui/public/$(COHORT)/output-results/ || true

# Support: Sync results to static folder for production deployment
collectstatic:
	@echo "Copying UI public data to staticfiles/data folder"
	@mkdir -p staticfiles/data
	@cp -rv ui/public/* staticfiles/data/ || true
	@echo "Running Django collectstatic..."
	$(PY) manage.py collectstatic --no-input

# Support: Process human baseline data for comparison
human: install
	@echo "Running human data extraction and JSON conversion..."
	$(PY) scripts/human/convert.py --cohort $(COHORT) --first-csv $(HUMAN_FIRST_CSV) --final-csv $(HUMAN_FINAL_CSV)
	${PY} scripts/human/baseline.py --cohort $(COHORT) --first-csv $(HUMAN_FIRST_CSV) --final-csv $(HUMAN_FINAL_CSV)
	${PY} scripts/human/combine_baseline.py --cohort $(COHORT)
	@mkdir -p staticfiles/data/$(COHORT)
	@cp -rv ui/public/$(COHORT)/* staticfiles/data/$(COHORT)/ || true

# THE MASTER COMMAND: Executes the entire pipeline sequentially
run: install
	@echo "Checking for existing output directory..."
	@if [ -d "output" ] && [ "$(shell ls -A output)" ]; then \
		echo "output/ exists and is not empty — skipping extraction."; \
	else \
		echo "No output found — running extraction..."; \
		$(MAKE) extraction; \
	fi
	@echo "Running analysis and evaluation steps..."
	$(MAKE) extraction COHORT=$(COHORT) DATA_DIR=$(DATA_DIR)
	$(MAKE) analysis
	$(MAKE) evaluation
	$(MAKE) stats
	$(MAKE) src
	$(MAKE) collectstatic
	$(MAKE) human
	$(MAKE) convert-csv
	$(MAKE) comparison

	@echo "Full pipeline complete."

# Build the React frontend production bundle
build:
	@echo "Building React app (inside src/)"
	@cd src && pnpm build

# Reset the project by removing all generated files
clean:
	@echo "Cleaning generated artifacts (output/ output-results/  venv/)"
	@rm -rf output output-results venv

