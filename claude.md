



Act as an independent KJET evaluation inspector.

  Repository:
    /Users/geoff/Documents/code/kjet

  Objective:
  Verify the existing machine/“LLM-generated” candidate evaluations against the original
  evidence in data/latest. Correct the machine-result CSV files only where the evidence and
  rules justify a change, then propagate the corrected results to the UI.

  Authoritative inputs:
  1. Scoring and eligibility rules:
     rules-latest.md

  2. Original applicant evidence:
     data/latest/<County>/<application_folder>/

  3. Extracted data, usable as a navigation/index layer:
     output/latest/<County>_kjet_applications_complete.json
     output/latest/*_kjet_forms.csv

  4. Existing machine results to inspect and, when justified, amend:
     ui/public/latest/gemini/<county>.csv

  Important:
  - The original files in data/latest are the primary evidence.
  - Extracted JSON/text may be incomplete or inaccurate. Verify questionable findings against
  the original PDF, Word, Excel or image.
  - Do not modify anything in data/latest.
  - Do not modify human evaluation files.
  - Do not modify the scoring scripts during this inspection.
  - Do not run `make gemini`, `make evaluation`, or `make run` after manually correcting the
  Gemini CSVs: those commands regenerate and overwrite the corrected CSVs.
  - Do not infer that evidence is absent simply because extraction failed.
  - Never fabricate facts or scores.
  - Preserve the existing CSV columns and formatting.

  Candidate matching:
  - Match applicants using their full KJET application ID or unique trailing ID, not applicant
  name alone.
  - For example, `Baringo_T0JM` corresponds to an application whose full ID ends in `T0JM`.
  - Report any ambiguous or duplicate match rather than guessing.

  Inspection procedure:

  1. Read rules-latest.md completely.

  2. Inventory:
     - Every county under data/latest.
     - Every application folder.
     - Every corresponding row in ui/public/latest/gemini/*.csv.
     - Report missing candidates, duplicate IDs, unmatched rows and unexpected counties.

  3. Inspect candidates county by county. For each candidate:
     - Check eligibility E1–E5 against original evidence.
     - Check all six criterion scores against the applicable evidence.
     - Check that each written reason accurately describes the documents.
     - Check that a low score was not caused merely by failed PDF/OCR/Excel extraction.
     - Check that financial amounts, dates, percentages, registration details, value chain and
     inclusivity claims match the source documents.
     - Treat conflicting documents as a review issue and identify both sources.

  4. Apply rules-latest.md exactly:
     - Registration and Track Record: 5%
     - Financial Position: 20%
     - Market Demand and Competitiveness: 20%
     - Business Proposal and Growth Viability: 25%
     - Value Chain Alignment: 10%
     - Inclusivity and Sustainability: 20%

  5. For eligible applicants, recalculate the composite score deterministically:

     composite =
       registration_score / 5 * 5
       + financial_score / 5 * 20
       + market_score / 5 * 20
       + proposal_score / 5 * 25
       + value_chain_score / 5 * 10
       + inclusivity_score / 5 * 20

  6. If eligibility or any criterion changes:
     - Update the appropriate row in ui/public/latest/gemini/<county>.csv.
     - Update the reason with a concise evidence-based explanation.
     - Recalculate the composite score.
     - Re-rank all eligible applicants in the affected county.
     - Apply the tie-break order from rules-latest.md.
     - Keep ineligible applicants unranked and populate the failed criterion and reason.

  7. Keep an audit log at:
     inspection-latest-results.md

     For every inspected candidate record:
     - County
     - Application ID
     - Result: confirmed, corrected, or needs human review
     - Old value
     - New value
     - Explanation
     - Exact source file path
     - PDF page, spreadsheet sheet/cell, or document section where possible
     - Any extraction failure or conflicting evidence

  8. Only change a score when the source evidence clearly supports it.
     If a source is unreadable, encrypted, ambiguous or contradictory, leave the result
     unchanged and add it to a “Needs human review” section.

  9. After editing, validate:
     - CSV headers remain unchanged.
     - Every score is numeric and within 0–5.
     - Composite scores match the weighted formula.
     - Eligibility values are valid.
     - Eligible county rankings are sequential.
     - Application IDs remain unique.
     - JSON conversion succeeds.

  10. Propagate corrected machine results with:

     make convert-csv COHORT=latest && make collectstatic COHORT=latest

  11. Do not run make gemini afterward.

  12. Finish with a summary containing:
     - Candidates inspected
     - Candidates confirmed
     - Candidates corrected
     - Candidates needing human review
     - Missing or unmatched candidates
     - Files changed
     - Validation results
     - Commands run

  Before editing, inspect `git status` and preserve all unrelated existing changes.

  The required propagation commands for machine-result CSV changes are:

  make convert-csv COHORT=latest && make collectstatic COHORT=latest

  make comparison is unnecessary for machine-only corrections because the comparison page loads
  the converted Gemini JSON directly. If the human-results CSV is also changed separately, use:

  make human COHORT=latest &&
  make comparison COHORT=latest &&
  make collectstatic COHORT=latest

  Most importantly, do not run make gemini after the inspection—it will regenerate the CSVs and
  erase the inspector’s manual corrections.