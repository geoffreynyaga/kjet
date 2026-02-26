export interface HumanApplicant {
  [key: string]: any;
  'Application ID': string;
  'Sum of weighted scores - Penalty(if any)': number | null;
  'PASS/FAIL': string;
  'E2. County Mapping': string;
  'REASON(Evaluators Comments)': string;
  'DQ1: Fraudulent documents or misrepresentation → Immediate disqualification.': string;
  'A3.1 Registration & Track Record ': number;
  'A3.2 Financial Position ': number;
  'A3.3 Market Demand & Competitiveness': number;
  'A3.4 Business Proposal / Growth Viability': number;
  'A3.5 Value Chain Alignment & Role': number;
  'A3.6 Inclusivity & Sustainability ': number;
  'Logic': string;
  'Logic.1': string;
  'Logic.2': string;
  'Logic.3': string;
  'Logic.4': string;
  'Logic.5': string;
}

export interface CountyGroup {
  county: string;
  applicants: HumanApplicant[];
}

export interface ApplicantCategories {
  topTwo: HumanApplicant[];
  pending: HumanApplicant[];
  failed: HumanApplicant[];
  otherRanked: HumanApplicant[];
}