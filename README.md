# KJET Data Processing Pipeline

This project automates the extraction, analysis, and evaluation of KJET application data. It uses a combination of Python scripts for data processing and a React/Django dashboard for visualization.

## Project Overview

KJET (Kenya Jobs and Economic Transformation) processes thousands of applications from various counties. This pipeline takes raw PDF applications and transforms them into structured data, scores them based on predefined rules, and prepares them for display on a dashboard.

## System Architecture

```text
[ Raw Data ] ----> [ Extraction ] ----> [ Analysis ] ----> [ Evaluation ] ----> [ Dashboard ]
  (.pdf)           (Text & CSV)         (Scoring)         (Summaries)         (Web UI)
```

## The Data Journey

### 1. Extraction (`make extraction`)
*   **Purpose**: To parse raw PDF application bundles and extract semi-structured data points. This is necessary to turn non-searchable documents into a format that can be mathematically scored.
*   **Output**: Per-county JSON files (`_applications_complete.json`) and consolidated form metadata in CSV format.

### 2. Analysis (`make analysis`)
*   **Purpose**: To evaluate applications against the official ruleset. It establishes eligibility (E1-E5) and calculates weighted scores (A3.1-A3.6) for ranking.
*   **Output**: A ranked leaderboard (CSV) and a detailed statistics report (JSON) used for county-level insights.

### 3. Evaluation (`make evaluation`)
*   **Purpose**: To aggregate analysis results to provide high-level summaries. This step prepares the data for regional and national comparisons.
*   **Output**: National and county evaluation summaries in the `output-results/` directory.

### 4. Stats & Sync (`make stats` & `make src`)
*   **Purpose**: To generate final counts for document coverage and value chain distribution. These stats are then synchronized with the application's data directory.
*   **Output**: Consolidated reporting files and updated public assets in the UI source tree.

### 5. Conversion (`make convert-csv`)
*   **Purpose**: To format the final analysis tables into JSON for optimized frontend consumption.
*   **Output**: Final dashboard data files in `ui/public/`.

## Quick Start

### Setup
```bash
# Create virtual environment and install dependencies
make install
```

### Run the Full Pipeline
```bash
# Run everything for the latest cohort
make run COHORT=latest

# Or run steps individually
make extraction
make analysis
make evaluation
```

## Project Layers (The Hierarchy)

```text
kjet/
├── data/               <-- LAYER 1: The Raw Inputs (PDFs)
├── scripts/            <-- LAYER 2: The Logic (Python)
│   ├── extraction/     <-- Step 1: Read the PDFs
│   ├── analysis/       <-- Step 2: Score & Rank
│   └── evaluation/     <-- Step 3: Summarize
├── output/             <-- LAYER 3: The Results (JSON/CSV)
└── ui/                 <-- LAYER 4: The Interface (Dashboard)
```

## Directory Structure
- `data/`: Raw input PDFs (organized by cohort).
- `scripts/`: Python processing logic.
  - `extraction/`: Code to read PDFs.
  - `analysis/`: Code to score and rank applicants.
  - `evaluation/`: Code to generate summaries.
- `output/`: Processed data and statistics.
- `ui/`: React frontend and dashboard configuration.
- `Makefile`: The automated "remote control" for the whole project.
