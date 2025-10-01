VENV_DIR := $(CURDIR)/venv
PY := $(VENV_DIR)/bin/python3
PIP := $(VENV_DIR)/bin/pip

.PHONY: all venv install extraction evaluation summary stats src convert-csv run build clean help

help:
	@echo "Available targets:"
	@echo "  make venv         -> create virtualenv in ./venv"
	@echo "  make install      -> install Python requirements into venv"
	@echo "  make extraction   -> run document extraction (long)"
	@echo "  make analysis     -> run analysis scripts (analyze_kjet_applications.py)"
	@echo "  make evaluation   -> run county evaluator and generate evaluation summary"
	@echo "  make stats        -> run generate_stats.py"
	@echo "  make convert-csv  -> convert CSV files to JSON format for dashboard"
	@echo "  make src          -> copy output-results into code/public/output-results"
	@echo "  make run          -> full pipeline: extraction -> analysis -> evaluation -> stats -> copy -> convert-csv"

venv:
	@echo "Creating virtualenv at $(VENV_DIR) if missing..."
	if [ ! -d "$(VENV_DIR)" ]; then python3 -m venv "$(VENV_DIR)"; fi

install: venv
	@echo "Installing Python packages into venv..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

extraction: install
	@echo "Running extraction: extract_all_documents.py (may be long)..."
	$(PY) extract_all_documents.py

analysis: install
	@echo "Running analysis: analyze_kjet_applications.py"
	$(PY) analyze_kjet_applications.py

evaluation: install
	@echo "Running county evaluator: county_evaluator.py"
	$(PY) county_evaluator.py
	@echo "Generating national evaluation summary"
	$(PY) generate_evaluation_summary.py

stats: install
	@echo "Running generate_stats.py"
	$(PY) generate_stats.py

convert-csv:
	@echo "Converting CSV files to JSON format for dashboard"
	python3 convert_csv_to_json.py

src:
	@echo "Copying evaluation outputs to React public folder"
	@mkdir -p code/public/output-results
	@cp -v output-results/* code/public/output-results/ || true

human: install
	@echo "Running human data extraction and JSON conversion..."
	$(PY) scripts/human/convert.py

run: install
	@echo "Checking for existing output directory..."
	@if [ -d "output" ] && [ "$(shell ls -A output)" ]; then \
		echo "output/ exists and is not empty — skipping extraction."; \
	else \
		echo "No output found — running extraction..."; \
		$(MAKE) extraction; \
	fi
	@echo "Running analysis and evaluation steps..."
	$(MAKE) extraction
	$(MAKE) analysis
	$(MAKE) evaluation
	$(MAKE) stats
	$(MAKE) src
	$(MAKE) convert-csv
	@echo "Full pipeline complete."

build:
	@echo "Building React app (inside src/)"
	@cd src && pnpm build

clean:
	@echo "Cleaning generated artifacts (output/ output-results/  venv/)"
	@rm -rf output output-results venv

