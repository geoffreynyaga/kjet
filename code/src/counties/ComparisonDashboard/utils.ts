import { AgreementType, CriterionComparison, HumanApplicant, LLMIneligibleApplicant, LLMRankedApplicant } from './types';

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
  return applications.find(app => {
    const appNumericId = extractNumericId(app[idField]);
    return appNumericId === targetNumericId;
  });
};

// Helper function to create detailed criterion comparisons
export const createCriterionComparisons = (
  humanApp: HumanApplicant,
  llmRankedApp?: LLMRankedApplicant
): CriterionComparison[] => {
  const comparisons: CriterionComparison[] = [];

  // Define the mapping between human and LLM criteria
  // Note: Field names must match exactly (including trailing spaces!)
  const criteriaMapping = [
    {
      human: { scoreField: 'A3.1 Registration & Track Record ', reasonField: 'Logic' },
      llm: 'S1_Registration_Track_Record_5%',
      name: 'Registration & Track Record'
    },
    {
      human: { scoreField: 'A3.2 Financial Position ', reasonField: 'Logic.1' },
      llm: 'S2_Financial_Position_20%',
      name: 'Financial Position'
    },
    {
      human: { scoreField: 'A3.3 Market Demand & Competitiveness', reasonField: 'Logic.2' },
      llm: 'S3_Market_Demand_Competitiveness_20%',
      name: 'Market Demand & Competitiveness'
    },
    {
      human: { scoreField: 'A3.4 Business Proposal / Growth Viability', reasonField: 'Logic.3' },
      llm: 'S4_Business_Proposal_Viability_25%',
      name: 'Business Proposal / Growth Viability'
    },
    {
      human: { scoreField: 'A3.5 Value Chain Alignment & Role', reasonField: 'Logic.4' },
      llm: 'S5_Value_Chain_Alignment_10%',
      name: 'Value Chain Alignment & Role'
    },
    {
      human: { scoreField: 'A3.6 Inclusivity & Sustainability ', reasonField: 'Logic.5' },
      llm: 'S6_Inclusivity_Sustainability_20%',
      name: 'Inclusivity & Sustainability'
    }
  ];

  criteriaMapping.forEach(criteria => {
    const humanScore = Number(humanApp[criteria.human.scoreField]) || null;
    const humanReason = humanApp[criteria.human.reasonField] || 'No reason provided';

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
export const getHumanRank = (targetApp: HumanApplicant, allApps: HumanApplicant[]): number => {
  const passedApps = allApps
    .filter(app => (app['PASS/FAIL'] || '').toLowerCase() === 'pass')
    .sort((a, b) => (Number(b['Sum of weighted scores - Penalty(if any)']) || 0) - (Number(a['Sum of weighted scores - Penalty(if any)']) || 0));

  const rank = passedApps.findIndex(app => app['Application ID'] === targetApp['Application ID']);
  return rank >= 0 ? rank + 1 : passedApps.length + 1;
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
    if (rankDiff !== null && Math.abs(rankDiff) <= 2 && scoreDiff !== null && Math.abs(scoreDiff) <= 0.5) {
      return 'full';
    } else if (rankDiff !== null && Math.abs(rankDiff) <= 5) {
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
    const filename = normalizeCountyName(county).replace(/['`'']/g, '');
    console.log(filename, 'normalized filename for', county);
    const response = await fetch(`/gemini/${filename}.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`Failed to load LLM data for ${county}:`, err);
  }
  return null;
};