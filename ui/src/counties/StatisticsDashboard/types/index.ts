export interface StatisticsApplicant {
  [key: string]: any;
}

export interface CountyStats {
  county: string;
  totalApplications: number;
  passedApplications: number;
  failedApplications: number;
  passRate: number;
  averageScore: number;
  businessTypes: { [key: string]: number };
  womenOwnedCount: number;
  totalScores: number[];
  topScore: number;
  tier1Count: number;
  tier2Count: number;
}

export interface NationalStats {
  totalApplications: number;
  totalPassed: number;
  totalFailed: number;
  overallPassRate: number;
  averageScore: number;
  businessTypeDistribution: { name: string; value: number; percentage: number }[];
  countyDistribution: { county: string; applications: number; passRate: number }[];
  scoreDistribution: { range: string; count: number }[];
  womenOwnedStats: { owned: number; notOwned: number; percentage: number };
  tierDistribution: { tier1: number; tier2: number; untiered: number };
  topPerformingCounties: { county: string; passRate: number; avgScore: number; applications: number }[];
}