

## Plan: KJET Pipeline Documentation, Scoring Fixes & Extraction Improvements

All five workstreams tackle distinct pipeline issues: missing documentation, comparison dashboard bugs, LLM scoring clustering, PDF extraction failures, and weight mismatches between human and machine scoring. The plan uses rules-latest.md as the authoritative spec for cohort 2 and rules-c1.md B1 Scoring Matrix for cohort 1.

**Steps**

### WS1: Documentation — New PIPELINE.md

1. Create PIPELINE.md with these sections:
   - **Pipeline Overview**: ASCII diagram showing the 9-step flow from PDFs → comparison dashboard
   - **Step-by-step breakdown**: For each `make` target, document:
     - Script(s) invoked (with file links)
     - Input files/directories (with glob patterns and example paths)
     - Output files/directories (with JSON/CSV schema summaries)
     - Data types at each boundary (TypeScript-style interface definitions)
   - **Data directory structure**: Document data, output, output-results, `ui/public/<cohort>/` with tree diagrams
   - **Scoring rubric summary**: Table showing criterion names, weights per cohort, value anchors (0–5 scale definitions)
   - **Known issues / conventions**: County name canonicalization, cohort detection, the "gemini" folder naming

2. Add type definitions for each inter-step data shape:
   - `ApplicationBundle` (output of extraction → input to analysis)
   - `FormCSVRow` (62-column CSV schema from `COLUMN_ORDER` in forms_to_csv.py)
   - `EvaluationResult` (output of county_evaluator → input to gemini generator)
   - `GeminiCSVRow` / `GeminiJSON` (19-column CSV and JSON schema in `ui/public/<cohort>/gemini/`)
   - `HumanBaselineRecord` (from `kjet-human-final.json`)
   - `ComparisonRow` (merged human + LLM data for the dashboard)

3. Add simple docstrings to the main entry functions in:
   - extract_all_documents.py
   - forms_to_csv.py
   - analyze_kjet_applications.py
   - county_evaluator.py
   - agentic_csv_generator.py
   - baseline.py

4. Update README.md to add a "Pipeline Documentation" section linking to PIPELINE.md.

---

### WS2: Comparison Dashboard Bugs (4 fixes) - [DONE]
5. [x] **Fix score scale mismatch** in CountyComparisonView.tsx — the line `llmScore - (humanScore / 20)` divides the human 0–100 composite by 20 to get 0–5, then compares against the LLM 0–100 composite. Change to `llmScore - humanScore` (both are 0–100 scale). This is the root cause of inflated "Avg Score Difference" values.
6. [x] **Fix dead `partial` agreement** in CountyComparisonView.tsx — the inline agreement logic is binary (`full`/`disagreement`) using only pass/fail. Replace it with the existing `determineAgreement()` from utils.ts which supports `partial` based on rank proximity and score difference thresholds. Remove the dead code duplication.
7. [x] **Add LLM composite score column** to the comparison table in ApplicantComparisonCard.tsx — currently shows Human Score but not the LLM/Algorithm Score, so users cannot visually compare values. Add an "Algorithm Score" column next to "Algorithm Rank".
8. [x] **Show re-weighted human composite** (see WS5 below) — when displaying human scores for the "latest" cohort in the comparison, recompute the composite from raw per-criterion scores using C2 weights so it's comparable to the LLM composite.

---

### WS3: LLM Scoring Granularity (improve rule-based resolution)

9. **Identify the 3 near-constant criteria** in agentic_csv_generator.py:
   - S5 (Value Chain): hardcoded `4` for all eligible apps (line ~161)
   - S6 (Inclusivity): binary `1` or `5` based solely on woman-owned flag (line ~164)
   - S4 (Proposal): maxes at `4` for any strategy text >50 chars (line ~156)

10. **Add sub-scoring logic** using decimal values (e.g., 3.5, 4.2) based on richer data signals. Keep the 0–5 range but allow float precision:
    - **S5 (Value Chain)**: Score based on: priority VC alignment (0–2), number of VC linkages described (0–1.5), green practices count (0–1.5). Use extracted fields `value_chain`, `green_practices`, content keyword analysis.
    - **S6 (Inclusivity)**: Score based on: % women members, % youth members, PWD inclusion flag, number of green practices, ESG mentions. Currently binary — expand to use the demographic fields already extracted in the CSV (`percentage_women`, `percentage_youth`, `percentage_pwd`).
    - **S4 (Proposal)**: Score based on: presence of quantified targets, budget/cost mention, risk mitigation mention, market linkage details, expansion plan specifics. Use content length + keyword density rather than just length > 50.
    - **S1 (Registration)**: Already has decent tiers but uses only `years_operating`. Add governance evidence keywords.
    - **S2 (Financial)**: Add sub-tiers within each revenue bracket (e.g., differentiate "just above 5M" from "close to 10M").
    - **S3 (Market)**: Already decent; add differentiation for multi-channel vs single-channel beyond just B2B percentage.

11. **Mirror improvements in `county_evaluator.py`** — the `_score_*` methods in county_evaluator.py should use the same improved rubric for consistency between the two scoring paths.

12. **Add a composite score normalization check**: After scoring, verify the distribution has reasonable spread (std dev > 5 on the 0–100 scale) and log a warning if clustering is detected.

---

### WS4: PDF Extraction Error Handling - [PARTIAL DONE]
13. [x] **Add OCR fallback to the main extraction pipeline** in extract_all_documents.py — implemented with `repair_pdf` and `extract_pdf_with_ocr` fallback.
14. [ ] **Suppress PyPDF2 CJK encoding warnings** in utils.py
15. [ ] **Log pdftotext stderr** in utils.py `extract_with_pdftotext()`
16. [x] **Add a per-county extraction summary** at the end of each county's processing in extract_all_documents.py
17. [ ] **Consider replacing PyPDF2 with `pypdf`**

---

### WS5: Weight Mismatch Resolution - [DONE]
18. [x] **Confirm the factual situation** — Human evaluating uses C1 weights.
19. [x] **Re-weight human scores in the comparison dashboard** for cohort 2.
20. [x] **Ensure LLM code uses the correct weights per cohort**.
21. [x] **Document the weight discrepancy** in PIPELINE.md.

---

**Verification**

- **WS1**: Review PIPELINE.md for completeness — every `make` target should have documented I/O
- **WS2**: Load `/comparisons` in browser → check that "Avg Score Difference" shows reasonable values (single digits, not 80+), `partial` agreement appears in stats, LLM score column is visible
- **WS3**: Run `make evaluation` + `make gemini` → check a county's gemini CSV for score spread; std dev should increase from ~3-5 to >8 across eligible applicants
- **WS4**: Run `make extraction` → verify reduced warning noise, check extraction summary for OCR fallback count, confirm previously-failing PDFs now extract text
- **WS5**: Load `/comparisons` for latest cohort → verify human scores are re-weighted using C2 weights, original score shown alongside for transparency
- **End-to-end**: Run `make run` and browse all endpoints (`/details`, `/results`, `/comparisons`, `/statistics`)

**Decisions**

- **C2 weights are authoritative** for latest cohort (from rules-latest.md): 5/20/20/25/10/20
- **C1 B1 matrix weights** are authoritative for C1: 10/20/20/25/15/10 (resolving the rules-c1.md A2 vs B1 inconsistency in favor of B1, since that's what evaluators actually used)
- **Keep rule-based scoring** — no LLM API integration; improve granularity by using float sub-scores within deterministic rules
- **Re-weight human scores in code** — raw per-criterion scores are unaffected; only the composite is recomputed with correct weights for comparison purposes
- **Document, don't replace PyPDF2 yet** — note the recommendation in PIPELINE.md but defer the migration since `pypdf` is a bigger change