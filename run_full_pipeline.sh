#!/usr/bin/env bash

# Full pipeline for KJET data processing
# Runs extraction -> dataset creation -> analysis -> evaluation -> summary -> copy to React public

set -euo pipefail

ROOT_DIR="/Users/geoff/Downloads/Nakuru"
DATA_DIR="$ROOT_DIR/data"
OUTPUT_DIR="$ROOT_DIR/output"
EVAL_OUTPUT_DIR="$ROOT_DIR/output-results"
REACT_PUBLIC_OUTPUT="$ROOT_DIR/src/public/output-results"

echo "Starting full KJET processing pipeline"
echo "Root: $ROOT_DIR"

cd "$ROOT_DIR"

## 1) Run Python extractor to create per-county JSONs in `output/`
if [ -f "$ROOT_DIR/extract_all_documents.py" ]; then
  echo "-> Running extract_all_documents.py (produces output/*.json)"
    # Ensure virtualenv and required Python packages are available
    VENV_DIR="$ROOT_DIR/venv"
    PY_CMD="python3"
    if [ ! -d "$VENV_DIR" ]; then
      echo "Creating virtualenv at $VENV_DIR"
      python3 -m venv "$VENV_DIR"
    fi
    # Activate venv for installs and running
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip >/dev/null 2>&1 || true
    pip install tqdm PyPDF2 Pillow pytesseract >/dev/null 2>&1 || true
    # Run extractor inside venv
    "$VENV_DIR/bin/python" "$ROOT_DIR/extract_all_documents.py"
    deactivate
else
  echo "WARNING: extract_all_documents.py not found; trying shell extractor"
  if [ -x "$ROOT_DIR/extract_all_documents.sh" ]; then
    bash "$ROOT_DIR/extract_all_documents.sh"
  else
    echo "ERROR: No extractor available. Aborting.";
    exit 1
  fi
fi

## 2) Optionally run smaller helpers (LLM dataset, structured extraction) if present
if [ -x "$ROOT_DIR/create_llm_dataset.sh" ]; then
  echo "-> Running create_llm_dataset.sh"
  bash "$ROOT_DIR/create_llm_dataset.sh"
fi

if [ -x "$ROOT_DIR/extract_application_data.sh" ]; then
  echo "-> Running extract_application_data.sh"
  bash "$ROOT_DIR/extract_application_data.sh"
fi

## 3) Run analyzer to generate aggregate stats (reads from output/)
if [ -f "$ROOT_DIR/analyze_kjet_applications.py" ]; then
  echo "-> Running analyze_kjet_applications.py"
  python3 "$ROOT_DIR/analyze_kjet_applications.py"
else
  echo "WARNING: analyze_kjet_applications.py not found"
fi

## 4) Run county evaluator to generate per-county evaluation results (reads from output/ and writes to output-results/)
if [ -f "$ROOT_DIR/county_evaluator.py" ]; then
  echo "-> Running county_evaluator.py"
  python3 "$ROOT_DIR/county_evaluator.py"
else
  echo "WARNING: county_evaluator.py not found"
fi

## 5) Generate national evaluation summary (reads from output-results/)
if [ -f "$ROOT_DIR/generate_evaluation_summary.py" ]; then
  echo "-> Running generate_evaluation_summary.py"
  python3 "$ROOT_DIR/generate_evaluation_summary.py"
else
  echo "WARNING: generate_evaluation_summary.py not found"
fi

## 6) Run generate_stats to create extra reports (reads from output/)
if [ -f "$ROOT_DIR/generate_stats.py" ]; then
  echo "-> Running generate_stats.py"
  python3 "$ROOT_DIR/generate_stats.py"
else
  echo "WARNING: generate_stats.py not found"
fi

## 8) Ensure React public output folder exists and copy evaluation JSONs
echo "-> Copying evaluation outputs to React public folder"
mkdir -p "$REACT_PUBLIC_OUTPUT"
if [ -d "$EVAL_OUTPUT_DIR" ]; then
  cp -v "$EVAL_OUTPUT_DIR"/* "$REACT_PUBLIC_OUTPUT" || true
  echo "Copied files from $EVAL_OUTPUT_DIR to $REACT_PUBLIC_OUTPUT"
else
  echo "WARNING: Evaluation output directory $EVAL_OUTPUT_DIR does not exist"
fi

echo "Pipeline complete. You can now run the React app in $ROOT_DIR/src"
echo "Run: cd $ROOT_DIR/src && pnpm start"

exit 0
