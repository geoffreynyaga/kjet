// Human evaluation interfaces
export interface HumanApplicant {
  [key: string]: any;
  'Application ID': string;
  'Sum of weighted scores - Penalty(if any)': number;
  'PASS/FAIL': string;
  'REASON(Evaluators Comments)': string;
}

// LLM evaluation interfaces
export interface LLMScoreBreakdown {
  score: number;
  reason: string;
}

export interface LLMApplicantScoreBreakdown {
  [criterion: string]: LLMScoreBreakdown;
}

export interface LLMRankedApplicant {
  rank: number;
  application_id: string;
  applicant_name: string;
  eligibility_status: string;
  composite_score: number;
  score_breakdown: LLMApplicantScoreBreakdown;
}

export interface LLMIneligibleApplicant {
  application_id: string;
  applicant_name: string;
  eligibility_status: string;
  ineligibility_criterion_failed: string;
  reason: string;
}

export interface LLMAnalysisData {
  report_title: string;
  selection_criteria_weights: { [key: string]: number };
  ranked_applicants: LLMRankedApplicant[];
  ineligible_applicants: LLMIneligibleApplicant[];
}

// Detailed criterion comparison interfaces
export interface CriterionComparison {
  criterion: string;
  humanScore: number | null;
  llmScore: number | null;
  humanReason: string;
  llmReason: string;
  scoreDifference: number | null;
  agreement: 'full' | 'partial' | 'disagreement' | 'unknown';
}

export interface ComparisonRow {
  applicationId: string;
  applicantName: string;
  county: string;
  humanRank: number | null;
  llmRank: number | null;
  humanScore: number | null;
  llmScore: number | null;
  humanStatus: string;
  llmStatus: string;
  rankDifference: number | null;
  scoreDifference: number | null;
  humanReason: string;
  llmReason: string;
  agreement: 'full' | 'partial' | 'disagreement' | 'unknown';
  criterionComparisons: CriterionComparison[];
  hasPenalty: boolean;
  penaltyReason: string;
}

export interface CountyComparison {
  county: string;
  totalApplications: number;
  humanEvaluated: number;
  llmEvaluated: number;
  perfectMatches: number;
  partialMatches: number;
  disagreements: number;
  averageRankDifference: number;
  averageScoreDifference: number;
  comparisonRows: ComparisonRow[];
  mismatchedApplications: ComparisonRow[];
}

// Utility types
export type AgreementType = 'full' | 'partial' | 'disagreement' | 'unknown';
export type SortField = 'humanRank' | 'rankDifference' | 'scoreDifference' | 'agreement' | 'applicantName';
export type SortDirection = 'asc' | 'desc';