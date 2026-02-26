This is a project that was forst created with one cohort in mind, but then another cohort was given a chance to apply and the problem is that their application data (the application pdf) is slightly modified.

The idea was to first extract certain data from the application pdf (extraction), then take all the text data concatenated for the application + financial + registrations and ctreate a json file. Then use this inside an LLM (manually) while instructing the LLM to rate the application based on rules.md file. then paste the output csv from LLM and save it.

The main target here is to run the same commands in Makefile (perhaps with a flag for earlier versions) and get the same outputs in terms of structure (e.g. csv fields or json key value pairs).

rules:
- always activate the virtual enviromnment in the ./venv folder before running commands
- always check for accuracy and parity with outputs from c1.

## Cohort 1

I was initially running this project this way:

1. I was looking at the data/ dir which contained county sub dirs and under that there was application dirs (in the format of application_<id>_bundle) and isnide that was documents in the format of application_info_<id>.pdf and some other attchements e.g. financial statements and incorporation documents. (Limited companies, self help groups, cooperatives etc certificates). An example application document is in the .tmp/application_info_165.pdf. It has no headers. It ponly has a title of "Application Details" and then the application questions and answers follow.

- If you look at scripts/extraction/questions.txt you will see a list of questions that I have extracted from the above application document.


### Problems
1. Fixing logic that was meant for the first cohort (based on folder names and file names). An example is ` pattern = r'application_(\d+)_bundle' `

2.  Extracting proper information from the new pdf format in the second cohort. An example pdf is in the `.tmp/application_KJET-20251224134753-G9QK.pdf`. There is a lot of header info and seperators for different questions. We need to have a custom script to get the answers form this pdf.
There is similar/exact questions e.g
a. "3. What is the name of your cluster?" in the old implementation and "What is your registration status?" in the new implementation. Notice in the new implementation, the question number is missing.
b. the application number (found in the old imlementation under "2. Application Number") is missing in the new implementation. In the new implementation, the application number is part of the file name. we ned to discard the part after `_with_attachments` to get the application number.
c.The application ID is the 4 letter code e.g. `G9QK` in the file name `application_KJET-20251224134753-G9QK.pdf`. This is the same as the `application_info_<id>.pdf` in the first cohort. Its the last 4 characters of the file name.

d. remember we need this data in a csv file with the following columns:
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

e. remember that we need to d=save the poutput data to output/latest  for the new cohort (c2) when running against data/latest and output/c1 for the old cohort (c1) when running against data/c1.

3. Ideally, if we fix the extraction phase to be compatible with expected output (same as c1), then the cnsecutive steps may remain the same. we need parity! we'd rather merge any extra data that is there in c2 into a field that was there in c1 rather than create new columns/json fields.

4. Make analysis command

- perhaps we make the analyze_kjet_applications.py the main and obvious file e.g. move it to init py file or main.py ? I am not sure

- Update the KJETAnalyzer to use the new ruleset from the `rules-latest.md` file. I do not know if you should pass the COHORT variable and do if-else statements of=r if you'll write a new class with mnodified rules.

- Remember that the value chains have increased in this new cohort.

- Remember that we are not looking at top two in this cohort. we are looking at top 6.

- I do not know what to do with `analyze_top2_changes.py` file or whether we need to update anything there. Advise if needed.

- update the `value_chain_keywords` inside the `generate_stats.py` file.

- Make sure that generated data is stored in correct versioned folder e.g. c1 or latest.

- make sure that we have parity with the c1 implemtation and that the data outpur has same exact structure.


5. make evaluation

- we have the
```
class KJETCountyEvaluator:
    def __init__(self):
        # Eligibility criteria from rules.md
        self.eligibility_criteria = {
            "E1": "Registration & Legality (Pass/Fail)",
            "E2": "County Mapping (Pass/Fail)",
            "E3": "Priority Value Chain (Pass/Fail)",
            "E4": "Minimum Financial Evidence (Pass/Fail)",
            "E5": "Consent & Contactability (Pass/Fail)"
        }
```
how is this different from `Cohort1Strategy` and `Cohort2Strategy`? is there duplication? solve this. feel free to check the `rules-latest.md` file. remember to always implement solutions for the new cohort and retain the old cohort implementation. Parityh should always be met. also evalutae teh other functions like `_score_financial_position` to see if ots duplication.

- update the financial_evaluator python files ro cover both cohorts.

- update other functinality like "if any(skip in filename_lower for skip in [
                'application_info', 'registration_certificate', 'business registration'
            ]):' to include new patterns for c2/latest.
- check the rest of the functions in the evaluation dir and update. delete unwanted functionality. have parity with ild implementation.

- test


6. Agentic analysis and awarding

we need to scan all `<county_name>_kjet_applications_complete.json` files in the `output/latest` directory. You should then have an output file with the format of the following columns. This is very important and should be 100% accurate in naming and order.

IMPORTANT: i WANT YOU TO use the json files, and you should evaluate the score. do not write local scripts. use your knowledge, compute/decide on scoring and then output the csv results as described below (ans asve the file in the ui/public/latest/gemini dir):

```csv
Rank,Application ID,Applicant Name,Eligibility Status,Composite Score,S1_Registration_Track_Record_5% Score,S1_Registration_Track_Record_5% Reason,S2_Financial_Position_20% Score,S2_Financial_Position_20% Reason,S3_Market_Demand_Competitiveness_20% Score,S3_Market_Demand_Competitiveness_20% Reason,S4_Business_Proposal_Viability_25% Score,S4_Business_Proposal_Viability_25% Reason,S5_Value_Chain_Alignment_10% Score,S5_Value_Chain_Alignment_10% Reason,S6_Inclusivity_Sustainability_20% Score,S6_Inclusivity_Sustainability_20% Reason,Ineligibility Criterion Failed,Reason
```
The eligibility criteria in is in th `rules-latest.md` file.

The results should be written in the `ui/public/latest/gemini` dir and folow the `<county_name>.csv` format.

same aspects of parity with c1 results should be strictly observed.

7. UI reconcilation
- This will be hard for now, but we need to mark applicants from cohort 1 who never made it to top two (the number 3 and 4 only) per each county to this list. We should then mark them (in the card/div) as c1 and see where they rank. We should use the score from the c1 results. This will be in the `kjet-human-final.json` file in the `ui/public/c1` folder under the "TOTAL" key. This means we'll have to compare with the json file in the `ui/public/latest` dir.


8. Tests

Write unit tests for the all functionality. Make sure to cover edge cases and ensure that the new code is robust and maintainable. Consider using a testing framework like pytest to organize and run your tests effectively.

Make sure that data format and parity is achieved after each step escpecially in the output json files and csv files. Make sure taht the cohort info is always present in files.

Add test coverage in the README.

Use pytest, pytest-cov, pytest-sugar, mixer, hypothesis. CCoverage should be in html format but you can also have it in text/terminal for debugging and LLM use.

Figure out how to do integration tests for each make command as they are laid out in the `make run` command. Figure out if we need to also have an end-to-end test for the entire flow from extraction to awarding. This may be a bit hard but we can try to do it with a small subset of data and perhaps mock some of the LLM outputs.