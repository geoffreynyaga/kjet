import { AgreementType, CriterionComparison, HumanApplicant, LLMIneligibleApplicant, LLMRankedApplicant } from './types';

import { buildStaticDataUrl } from '../../utils';

const HUMAN_SCORE_FIELDS = ['Human Score', 'Sum of weighted scores - Penalty(if any)', 'TOTAL'];
const HUMAN_RANK_FIELDS = ['Human Rank', 'Ranking from composite score'];
const HUMAN_STATUS_FIELDS = ['PASS/FAIL', 'Status'];

const LATEST_COMPARISON_WEIGHTS: Array<{ fields: string[]; weight: number }> = [
  { fields: ['A3.1 Registration & Track Record', 'A3.1 Registration & Track Record '], weight: 0.10 },
  { fields: ['A3.2 Financial Position', 'A3.2 Financial Position '], weight: 0.20 },
  { fields: ['A3.3 Market Demand & Competitiveness', 'A3.3 Market Demand & Competitiveness '], weight: 0.20 },
  { fields: ['A3.4 Business Proposal / Growth Viability', 'A3.4 Business Proposal / Growth Viability '], weight: 0.25 },
  { fields: ['A3.5 Value Chain Alignment & Role', 'A3.5 Value Chain Alignment & Role '], weight: 0.15 },
  { fields: ['A3.6 Inclusivity & Sustainability', 'A3.6 Inclusivity & Sustainability '], weight: 0.10 },
];

const parseNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const normalized = String(value).trim().replace(/,/g, '');
  if (!normalized) return null;

  if (normalized.toLowerCase() === 'dq' || normalized.toLowerCase() === 'fail') return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getHumanScore = (humanApp: HumanApplicant): number | null => {
  for (const field of HUMAN_SCORE_FIELDS) {
    const val = parseNumericValue(humanApp[field]);
    if (val !== null) return val;
  }
  return null;
};

export const getComparableHumanScore = (humanApp: HumanApplicant, cohort: string): number | null => {
  const rawHumanScore = getHumanScore(humanApp);
  if (cohort !== 'latest') {
    return rawHumanScore;
  }

  let weightedTotal = 0;
  for (const criterion of LATEST_COMPARISON_WEIGHTS) {
    const criterionValue = criterion.fields
      .map((field) => humanApp[field])
      .find((value) => value !== undefined && value !== null && String(value).trim() !== '');
    const criterionScore = parseNumericValue(criterionValue);
    if (criterionScore === null) {
      return rawHumanScore;
    }

    weightedTotal += (criterionScore / 5) * 100 * criterion.weight;
  }

  return Number(weightedTotal.toFixed(2));
};

const getHumanCompositeRank = (humanApp: HumanApplicant): number | null => {
  for (const field of HUMAN_RANK_FIELDS) {
    const val = parseNumericValue(humanApp[field]);
    if (val !== null) return val;
  }
  return null;
};

export const getHumanStatus = (humanApp: HumanApplicant): string => {
  let explicitStatus = '';
  for (const field of HUMAN_STATUS_FIELDS) {
    const s = String(humanApp[field] || '').trim();
    if (s && s.toLowerCase() !== 'unknown') {
      explicitStatus = s;
      break;
    }
  }

  if (explicitStatus) {
    return explicitStatus.charAt(0).toUpperCase() + explicitStatus.slice(1).toLowerCase();
  }

  const rankRaw = HUMAN_RANK_FIELDS
    .map(field => String(humanApp[field] || '').toLowerCase())
    .find(val => val.includes('dq') || val.includes('fail') || val.includes('ineligible'));
  
  if (rankRaw) {
    return 'Fail';
  }

  const rank = getHumanCompositeRank(humanApp);
  if (rank !== null && rank > 0) {
    return 'Pass';
  }

  const score = getHumanScore(humanApp);
  if (score !== null && score > 0) {
    return 'Pass';
  }

  return 'Unknown';
};

// Helper function to extract numeric ID from different formats
export const extractNumericId = (applicationId: string): string => {
  // For human format: "Applicant_158" -> "158" or "applicant 302" -> "302"
  // For LLM format: "Baringo_297" -> "297"

  // First try underscore pattern
  const underscoreMatch = applicationId.match(/_(\d+)$/);
  if (underscoreMatch) {
    return underscoreMatch[1];
  }

  // Then try space pattern
  const spaceMatch = applicationId.match(/\s(\d+)$/);
  if (spaceMatch) {
    return spaceMatch[1];
  }

  // Finally try just extracting all digits
  const digitMatch = applicationId.match(/(\d+)/);
  return digitMatch ? digitMatch[1] : applicationId;
};

// Helper function to find matching application by numeric ID
export const findMatchingApplication = (targetId: string, applications: any[], idField: string): any => {
  const targetNumericId = extractNumericId(targetId);

  // First try numeric ID match (existing behavior)
  let found = applications.find(app => {
    const appNumericId = extractNumericId(String(app[idField] || ''));
    return appNumericId === targetNumericId;
  });
  if (found) return found;

  // Fallback: match by last-4 alphanumeric characters (handles suffixes like A8YI)
  const suffixMatch = String(targetId).match(/([A-Za-z0-9]{4})$/);
  if (suffixMatch) {
    const suffix = suffixMatch[1].toLowerCase();
    found = applications.find(app => {
      const val = String(app[idField] || '').toLowerCase();
      return val.endsWith(suffix) || val.includes(`-${suffix}`) || val.includes(`_${suffix}`) || val.includes(` ${suffix}`);
    });
    if (found) return found;
  }

  return undefined;
};

// Helper function to create detailed criterion comparisons
export const createCriterionComparisons = (
  humanApp: HumanApplicant,
  llmRankedApp?: LLMRankedApplicant
): CriterionComparison[] => {
  const comparisons: CriterionComparison[] = [];

  const getHumanValue = (candidateFields: string[]): unknown => {
    for (const field of candidateFields) {
      if (Object.prototype.hasOwnProperty.call(humanApp, field) && humanApp[field] !== undefined && humanApp[field] !== null && String(humanApp[field]).trim() !== '') {
        return humanApp[field];
      }
    }
    return null;
  };

  // Define the mapping between human and LLM criteria
  // Supports known column-name variations from human CSV conversions.
  const criteriaMapping = [
    {
      human: {
        scoreFields: ['A3.1 Registration & Track Record', 'A3.1 Registration & Track Record '],
        reasonFields: ['Logic', 'Logic.0']
      },
      llm: 'S1_Registration_Track_Record_5%',
      name: 'Registration & Track Record'
    },
    {
      human: {
        scoreFields: ['A3.2 Financial Position', 'A3.2 Financial Position '],
        reasonFields: ['Logic.1', 'Logic']
      },
      llm: 'S2_Financial_Position_20%',
      name: 'Financial Position'
    },
    {
      human: {
        scoreFields: ['A3.3 Market Demand & Competitiveness', 'A3.3 Market Demand & Competitiveness '],
        reasonFields: ['Logic.2', 'Logic.1']
      },
      llm: 'S3_Market_Demand_Competitiveness_20%',
      name: 'Market Demand & Competitiveness'
    },
    {
      human: {
        scoreFields: ['A3.4 Business Proposal / Growth Viability'],
        reasonFields: [
          'Logic.3',
          'vague plans, no detailed targets, unclear sourcing',
          'Logic.2'
        ]
      },
      llm: 'S4_Business_Proposal_Viability_25%',
      name: 'Business Proposal / Growth Viability'
    },
    {
      human: {
        scoreFields: ['A3.5 Value Chain Alignment & Role'],
        reasonFields: ['Logic.3', 'Logic.2']
      },
      llm: 'S5_Value_Chain_Alignment_10%',
      name: 'Value Chain Alignment & Role'
    },
    {
      human: {
        scoreFields: ['A3.6 Inclusivity & Sustainability ', 'A3.6 Inclusivity & Sustainability'],
        reasonFields: ['Logic.5', 'Logic.4']
      },
      llm: 'S6_Inclusivity_Sustainability_20%',
      name: 'Inclusivity & Sustainability'
    }
  ];

  criteriaMapping.forEach(criteria => {
    const humanScore = parseNumericValue(getHumanValue(criteria.human.scoreFields));
    const humanReason = String(getHumanValue(criteria.human.reasonFields) || 'No reason provided');

    const llmBreakdown = llmRankedApp?.score_breakdown?.[criteria.llm];
    const llmScore = llmBreakdown?.score || null;
    const llmReason = llmBreakdown?.reason || 'No LLM analysis';

    const scoreDifference = humanScore !== null && llmScore !== null ? llmScore - humanScore : null;

    let agreement: AgreementType = 'unknown';
    if (humanScore !== null && llmScore !== null) {
      const diff = Math.abs(scoreDifference!);
      if (diff <= 0.5) agreement = 'full';
      else if (diff <= 1.5) agreement = 'partial';
      else agreement = 'disagreement';
    }

    comparisons.push({
      criterion: criteria.name,
      humanScore,
      llmScore,
      humanReason,
      llmReason,
      scoreDifference,
      agreement
    });
  });

  return comparisons;
};

// Helper function to check for penalties
export const checkPenalties = (humanApp: HumanApplicant): { hasPenalty: boolean; penaltyReason: string } => {
  const penaltyField = humanApp['DQ1: Fraudulent documents or misrepresentation'];
  if (penaltyField && String(penaltyField).trim() !== '') {
    return {
      hasPenalty: true,
      penaltyReason: String(penaltyField)
    };
  }
  return {
    hasPenalty: false,
    penaltyReason: ''
  };
};

// Helper function to get human rank within county
export const getHumanRank = (targetApp: HumanApplicant, allApps: HumanApplicant[]): number | null => {
  const explicitRank = getHumanCompositeRank(targetApp);
  if (explicitRank !== null) {
    return explicitRank;
  }

  const rankableApps = allApps
    .filter(app => getHumanStatus(app).toLowerCase() === 'pass')
    .sort((a, b) => {
      const scoreDiff = (getHumanScore(b) ?? -Infinity) - (getHumanScore(a) ?? -Infinity);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return String(a['Application ID'] || '').localeCompare(String(b['Application ID'] || ''));
    });

  const rank = rankableApps.findIndex(app => app['Application ID'] === targetApp['Application ID']);
  return rank >= 0 ? rank + 1 : null;
};

// Helper function to get LLM reasoning
export const getLLMReason = (rankedApp?: LLMRankedApplicant, ineligibleApp?: LLMIneligibleApplicant): string => {
  if (ineligibleApp) {
    return ineligibleApp.reason || 'Ineligible';
  }
  if (rankedApp) {
    // Get the top reasons from score breakdown
    const reasons = Object.values(rankedApp.score_breakdown)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(breakdown => breakdown.reason)
      .join('; ');
    return reasons || 'Ranked based on composite score';
  }
  return 'No reason provided';
};

// Helper function to determine agreement level
export const determineAgreement = (
  humanStatus: string,
  llmStatus: string,
  rankDiff: number | null,
  scoreDiff: number | null
): AgreementType => {
  if (humanStatus === 'Not Evaluated' || llmStatus === 'Not Evaluated') {
    return 'unknown';
  }

  const humanPassed = humanStatus.toLowerCase() === 'pass';
  const llmPassed = llmStatus === 'Ranked';

  if (humanPassed && llmPassed) {
    // Both passed - check rank and score differences
    if (rankDiff !== null && Math.abs(rankDiff) <= 2 && scoreDiff !== null && Math.abs(scoreDiff) <= 10) {
      return 'full';
    } else if ((rankDiff !== null && Math.abs(rankDiff) <= 5) || (scoreDiff !== null && Math.abs(scoreDiff) <= 20)) {
      return 'partial';
    } else {
      return 'disagreement';
    }
  } else if (!humanPassed && !llmPassed) {
    return 'full'; // Both failed
  } else {
    return 'disagreement'; // One passed, one failed
  }
};

// Helper function to normalize county names for comparison
const normalizeCountyName = (countyName: string): string => {
  return countyName
    .toLowerCase()
    .replace(/['`'']/g, "'") // Normalize different apostrophe characters to standard single quote
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Helper function to filter human data by county
export const filterHumanDataByCounty = (humanData: HumanApplicant[], county: string): HumanApplicant[] => {
  const normalizedTargetCounty = normalizeCountyName(county);

  return humanData.filter(app => {
    const appCounty = app['mapping'] || app['E2. County Mapping'] || '';
    const normalizedAppCounty = normalizeCountyName(appCounty);
    return normalizedAppCounty === normalizedTargetCounty;
  });
};

// Helper function to load LLM data for a specific county
export const loadLLMDataForCounty = async (county: string): Promise<any | null> => {
  try {
    // Convert county name to filename format - normalize apostrophes and remove them for filename
    const filename = normalizeCountyName(county).replace(/['`'']/g, '').toLowerCase();
    console.log(filename, 'normalized filename for', county);
    const response = await fetch(buildStaticDataUrl(`gemini/${filename}.json`));
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`Failed to load LLM data for ${county}:`, err);
  }
  return null;
};