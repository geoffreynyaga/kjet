# KJET Analysis Code Book

## Section 1: The "Pass/Fail" Eligibility Filters
A cluster must return "YES" on all these criteria to proceed to scoring. If any are "NO," the status should be set to "Ineligible."

| Eligibility Goal | Column | Logic / Requirement |
| :--- | :--- | :--- |
| **E1: Legal Entity** | registration_status | Must NOT be "Unregistered." Must have a registration_number. |
| **E2: Geographic Fit** | county | Must be one of the 47 valid Kenyan Counties. |
| **E3: Sector Alignment** | value_chain | Must match KJET/BETA priority sectors (e.g., Dairy, Leather, Textiles). |
| **E4: Financial Evidence** | financial_doc_types, bank_statements | Must have at least one doc type (e.g., Bank/Mpesa statements). |
| **E5: Consent** | terms_accepted | 1 for YES, 0 for NO |

## Section 2: Weighted Scoring Matrix
For all "Eligible" clusters, calculate a Composite Score (100%) using these weights:

| Category | Weight | Relevant Data Fields for Analysis +2 |
| :--- | :--- | :--- |
| **Business Proposal & Growth** | 25% | problem_statement, objectives_targets, success_factors (Clarity of solution, SMART targets, and budget realism). |
| **Financial Position** | 20% | revenue_2022-2024, profits_2022-2024, accounting_package (Turnover trends and liquidity proxies). |
| **Market Demand** | 20% | b2b_percentage, exports_percentage, b2b_buyers_description (Evidence of buyers, contracts, and positioning). |
| **Inclusivity & Sustainability** | 20% | women_owned, age_18_35_2024, green_initiatives (Participation of women/youth/PWDs and green practices). |
| **Value Chain Alignment** | 10% | economic_activities, critical_equipment (Role in aggregation, processing, or standards). |
| **Registration & Track Record** | 5% | created_at, officers, registration_status (Governance maturity and years in operation). |

### Integration of Cohort 1 Alternates (The "Priority" Check)
Before finalizing the county rankings, the system must perform a Cross-Cohort Comparison.

* **Filter Alternates**: Import the list of Cohort 1 Alternates. Exclude any that have re-applied in Cohort 2 (11 alternates re-applied but new score will be prioritized).
* **Normalize Scores**: Ensure Cohort 1 scores are mapped to the same 100-point scale as Cohort 2 to ensure "Apples-to-Apples" comparison.
* **Regional Ranking**: Merge verified Cohort 1 Alternates with Cohort 2 Applicants into a single County Leaderboard.
* **Priority Rule**: If a Cohort 1 Alternate’s score is higher than a Cohort 2 applicant, the Alternate takes priority in the Top 6 ranking.

## Section 3: Human Verification Layer (Evaluator Audit)
To mitigate risks where the AI cannot correctly access or interpret specific file formats (e.g., blurred scans, protected PDFs), a mandatory human verification step is required.

* **Document Verification**: Evaluators must manually open supporting_documents for all clusters to verify that the AI-generated scores match the physical evidence.
* **Correction of "Unreadable" Data**: If the AI flagged data as "Minimal/Thin Evidence" (Score 1) due to file access issues, the evaluator must perform a manual review and update the score if evidence exists.
* **Audit Trail Justification**: Every score change or confirmation must be accompanied by a detailed note in the reviewed_by field.
* **Final Ranking**: Done after human verification, the system identifies the Top 6 clusters per county (282 total).
* **Tie-Breaker Ladder**: If composite scores are identical, the winner is decided by the higher score in this order: Business Proposal, Market Demand, Financial Position, Inclusivity, and Longer Track Record.

## Section 4: Cluster Tiering (The 94 Focus Clusters)
From the Top 6 in each county, categorize them into:

| Tier | Characteristics | Column Names (Data Sources) | Support Focus |
| :--- | :--- | :--- | :--- |
| **Tier 1: Ready-to-Scale** | High-growth clusters with strong financial and market evidence. They demonstrate stable operations and export activity | revenue_2024, profits_2024, accounting_package, exports_percentage, b2b_percentage. | Advanced Business Development Services (BDS) and Investment Readiness for rapid scaling. |
| **Tier 2: Emerging** | High-potential clusters that are still developing. Characterized by high member growth but facing significant infrastructure or equipment gaps | members_2024, members_2023, cluster_challenges, critical_equipment, problem_statement. | Capacity building, equipment acquisition support, and formalization training. |

## Section 5: General Insights

| Section | Description | Column Data Sources | Output (Report Visualization) |
| :--- | :--- | :--- | :--- |
| **Value Chain** | Distribution of applications across the priority value chains to show which industry is most "active" or "crowded". | value_chain, other_value_chain. | Bar Chart: Total Apps vs. Sector. |
| **Gender & Youth Impact** | Tracking the "6,800 Women" mandate and youth engagement levels in the MSME ecosystem. | women_owned, female_members_2024, age_18_35_2024. | Pie Chart: Gender split of cluster ownership; Histogram: Age distribution. |
| **Economic Footprint** | The total revenue and job creation potential of the current applicant pool. | revenue_2024, employees_2024, members_2024. | Stat Cards: "Total Job Creation Potential" and "Aggregate Revenue". |
| **Market Maturity** | Assessing how many clusters are already competing globally vs. those focused on local consumption. | exports_percentage, b2b_percentage, b2c_percentage. | Stacked Bar: Revenue stream breakdown (Local vs. Export). |
| **Digital/Financial Readiness** | Identifying the gap between informal "basic books" and professionalized accounting systems. | accounting_package, financial_doc_types. | Heatmap: Digital adoption levels by County or Value Chain. |
| **Resource Needs Map** | Identifying the most common "bottleneck" equipment or challenges across the country. | critical_equipment, cluster_challenges. | Word Cloud or Frequency Chart: Most requested machinery/support. |
| **Geographic Diversity** | Analyzing application density across all 47 counties to ensure "County Equity". | county, constituency. | Choropleth (Map): Application density per County. |
| **Historical Comparison** | Success rate of Cohort 1 vs. Cohort 2 New Applicants in the final ranking. | Final scores. | Comparison Chart: Performance scores (C1 vs. C2 Applicants). |