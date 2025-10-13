export interface ComparisonData {
  "Application ID": string;
  "County": string;
  "ALL SCORED": number | "DQ";
  "ONLY PASS": number | "DQ";
  "FIRST RANK": number;
  "FINAL RANK": number;
  "RANK CHANGE": number;
  "FIRST COUNTY RANK": number;
  "FINAL COUNTY RANK": number;
  "COUNTY RANK CHANGE": number;
}

export interface BaselineData {
  application_id: string;
  county: string;
  first_weighted_score: number | "DQ";
  first_ranking: number;
  first_county_rank: number;
  final_weighted_score: number | "DQ";
  final_ranking: number;
  final_county_rank: number;
}

export interface Statistics {
  totalApplicants: number;
  firstRoundPassed: number;
  firstRoundZero: number;
  firstRoundDisqualified: number;
  finalRoundScored: number;
  finalRoundZero: number;
  finalRoundDisqualified: number;
  scoreImproved: number;
  zeroToScored: number;
  totalImproved: number;
  declined: number;
  promotedToTop2: number;
  kickedFromTop2: number;
  finalQualified: number;
  noChange: number;
  firstRoundFailedTotal: number;
  averageFirstRound: number;
  averageSecondRound: number;
}