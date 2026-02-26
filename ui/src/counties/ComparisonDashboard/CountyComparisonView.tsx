import { ComparisonRow, CountyComparison, HumanApplicant, SortDirection, SortField } from './types.ts';
import React, { useEffect, useState } from 'react';
import {
  checkPenalties,
  createCriterionComparisons,
  determineAgreement,
  extractNumericId,
  filterHumanDataByCounty,
  findMatchingApplication,
  getHumanRank,
  getLLMReason,
  loadLLMDataForCounty
} from './utils.ts';

import ApplicantComparisonCard from './ApplicantComparisonCard.tsx';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface CountyComparisonViewProps {
  county: string;
  humanData: HumanApplicant[];
}

const CountyComparisonView: React.FC<CountyComparisonViewProps> = ({ county, humanData }) => {
  const [countyComparison, setCountyComparison] = useState<CountyComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('humanRank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadCountyComparison();
  }, [county, humanData]);

  console.log(county,"county at CountyComparisonView")

//   console.log(humanData,"humanData at CountyComparisonView")

  const loadCountyComparison = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter human data for this specific county
      const humanCountyData = filterHumanDataByCounty(humanData, county);

      console.log(`County filtering: "${county}" -> ${humanCountyData.length} human applications found`);
      if (humanCountyData.length > 0) {
        console.log('Sample human county values:', humanCountyData.slice(0, 3).map(app => app['E2. County Mapping'] || app['mapping']));
      }

      if (humanCountyData.length === 0) {
        setError(`No human evaluation data found for ${county}`);
        setLoading(false);
        return;
      }

      // Load LLM data for this county
      const llmData = await loadLLMDataForCounty(county);

      console.log(llmData,"llmData at CountyComparisonView")      // Create comparison
      const comparison = createCountyComparison(county, humanCountyData, llmData);

      console.log(comparison,"jsjsjjsjs")
      console.log(county,"county")
      setCountyComparison(comparison);
      setLoading(false);
    } catch (err) {
      console.error('Error loading county comparison:', err);
      setError('Failed to load county comparison data');
      setLoading(false);
    }
  };

  const createCountyComparison = (
    countyName: string,
    humanCountyData: HumanApplicant[],
    llmData: any | null
  ): CountyComparison => {
    const comparisonRows: ComparisonRow[] = [];
    const mismatchedApplications: ComparisonRow[] = [];

    // Process each human application
    humanCountyData.forEach(humanApp => {
      const humanId = humanApp['Application ID'];
      const numericId = extractNumericId(humanId);
      const humanRank = getHumanRank(humanApp, humanCountyData);
      const humanScore = Number(humanApp['Sum of weighted scores - Penalty(if any)']) || 0;
      const humanStatus = humanApp['PASS/FAIL'] || 'Unknown';

      if (!llmData) {
        // No LLM data available for this county - add to mismatched
        const penaltyInfo = checkPenalties(humanApp);
        mismatchedApplications.push({
          applicationId: humanId || numericId,
          applicantName: humanApp['E1. Applicant Name'] || 'Unknown',
          county: countyName,
          humanRank,
          llmRank: null,
          humanScore,
          llmScore: null,
          humanStatus,
          llmStatus: 'County Not Found',
          rankDifference: null,
          scoreDifference: null,
          humanReason: humanApp['REASON(Evaluators Comments)'] || 'No reason provided',
          llmReason: 'LLM analysis not available for this county',
          agreement: 'unknown',
          criterionComparisons: createCriterionComparisons(humanApp),
          hasPenalty: penaltyInfo.hasPenalty,
          penaltyReason: penaltyInfo.penaltyReason
        });
        return;
      }

      // Find matching LLM application by numeric ID from the unified applications array
      const llmApp = findMatchingApplication(humanId, llmData.applications, 'application_id');

      if (!llmApp) {
        // Human application not found in LLM data - add to mismatched
        const penaltyInfo = checkPenalties(humanApp);
        mismatchedApplications.push({
          applicationId: humanId || numericId,
          applicantName: humanApp['E1. Applicant Name'] || 'Unknown',
          county: countyName,
          humanRank,
          llmRank: null,
          humanScore,
          llmScore: null,
          humanStatus,
          llmStatus: 'Not Found in LLM',
          rankDifference: null,
          scoreDifference: null,
          humanReason: humanApp['REASON(Evaluators Comments)'] || 'No reason provided',
          llmReason: 'Application not found in LLM analysis',
          agreement: 'unknown',
          criterionComparisons: createCriterionComparisons(humanApp),
          hasPenalty: penaltyInfo.hasPenalty,
          penaltyReason: penaltyInfo.penaltyReason
        });
        return;
      }

      // Found matching LLM data - create comparison
      const isEligible = llmApp.eligibility_status?.toLowerCase() === 'eligible';
      const llmRank = isEligible ? llmApp.rank : null;
      const llmScore = isEligible ? llmApp.composite_score : null;
      const llmStatus = isEligible ? 'Ranked' : 'Fail';

      const rankDifference = humanRank && llmRank ? llmRank - humanRank : null;
      const scoreDifference = humanScore && llmScore ? llmScore - (humanScore / 20) : null; // Normalize human score to 5-point scale

      // Custom agreement logic for pass/fail scenarios
      const humanPassed = humanStatus?.toLowerCase() === 'pass';
      const llmPassed = llmStatus === 'Ranked';

      const agreement = (humanPassed === llmPassed) ? 'full' : 'disagreement';
      const penaltyInfo = checkPenalties(humanApp);
      const criterionComparisons = createCriterionComparisons(humanApp, isEligible ? llmApp : undefined);

      comparisonRows.push({
        applicationId: humanId || numericId,
        applicantName: llmApp?.applicant_name || humanApp['E1. Applicant Name'] || 'Unknown',
        county: countyName,
        humanRank,
        llmRank,
        humanScore,
        llmScore,
        humanStatus,
        llmStatus,
        rankDifference,
        scoreDifference,
        humanReason: humanApp['REASON(Evaluators Comments)'] || 'No reason provided',
        llmReason: isEligible
          ? (llmApp.score_breakdown ?
              Object.values(llmApp.score_breakdown)
                .sort((a: any, b: any) => b.score - a.score)
                .slice(0, 2)
                .map((breakdown: any) => breakdown.reason)
                .join('; ') || 'Ranked based on composite score'
              : 'Ranked based on composite score')
          : (llmApp.reason || 'Ineligible'),
        agreement,
        criterionComparisons,
        hasPenalty: penaltyInfo.hasPenalty,
        penaltyReason: penaltyInfo.penaltyReason
      });
    });

    // Calculate statistics
    const totalApplications = humanCountyData.length;
    const humanEvaluated = humanCountyData.length;
    const llmEvaluated = comparisonRows.filter(row => row.llmRank !== null || row.llmStatus === 'Ineligible').length;
    const perfectMatches = comparisonRows.filter(row => row.agreement === 'full').length;
    const partialMatches = comparisonRows.filter(row => row.agreement === 'partial').length;
    const disagreements = comparisonRows.filter(row => row.agreement === 'disagreement').length;

    const rankDifferences = comparisonRows
      .filter(row => row.rankDifference !== null)
      .map(row => Math.abs(row.rankDifference!));
    const averageRankDifference = rankDifferences.length > 0 ?
      rankDifferences.reduce((a, b) => a + b, 0) / rankDifferences.length : 0;

    const scoreDifferences = comparisonRows
      .filter(row => row.scoreDifference !== null)
      .map(row => Math.abs(row.scoreDifference!));
    const averageScoreDifference = scoreDifferences.length > 0 ?
      scoreDifferences.reduce((a, b) => a + b, 0) / scoreDifferences.length : 0;

    return {
      county: countyName,
      totalApplications,
      humanEvaluated,
      llmEvaluated,
      perfectMatches,
      partialMatches,
      disagreements,
      averageRankDifference,
      averageScoreDifference,
      comparisonRows,
      mismatchedApplications
    };
  };

  const sortComparisonRows = (rows: (ComparisonRow | any)[]) => {
    return [...rows].sort((a, b) => {
      // Handle sorting for both matched comparisons and mismatched applications
      let aVal, bVal;

      switch (sortField) {
        case 'humanRank':
          aVal = a.humanRank || 999;
          bVal = b.humanRank || 999;
          break;
        case 'rankDifference':
          aVal = a.rankDifference || 0;
          bVal = b.rankDifference || 0;
          break;
        case 'scoreDifference':
          aVal = a.scoreDifference || 0;
          bVal = b.scoreDifference || 0;
          break;
        case 'agreement':
          aVal = a.agreement || 'No Comparison';
          bVal = b.agreement || 'No Comparison';
          break;
        case 'applicantName':
          aVal = a.applicantName || a.applicationId || '';
          bVal = b.applicantName || b.applicationId || '';
          break;
        default:
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto mb-4 loading-spinner" />
          <p className="text-lg text-gray-600">Loading {county} comparison...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4" />
          <h3 className="text-lg font-medium">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!countyComparison) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Data</h3>
          <p>No comparison data available for {county}</p>
        </div>
      </div>
    );
  }

  // Combine all applications (matched + mismatched) for single table
  const allApplications = [
    ...countyComparison.comparisonRows,
    ...countyComparison.mismatchedApplications
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Simple County Header */}
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{county} County</h2>
            <p className="text-gray-600">
              {countyComparison.totalApplications} applications •
              {countyComparison.comparisonRows.length} with machine comparison •
              {countyComparison.mismatchedApplications.length} without machine data
            </p>
          </div>
          <select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortField(field as SortField);
              setSortDirection(direction as SortDirection);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="humanRank-asc">Human Rank (Best to Worst)</option>
            <option value="humanRank-desc">Human Rank (Worst to Best)</option>
            <option value="rankDifference-desc">Rank Difference (High to Low)</option>
            <option value="rankDifference-asc">Rank Difference (Low to High)</option>
            <option value="scoreDifference-desc">Score Difference (High to Low)</option>
            <option value="scoreDifference-asc">Score Difference (Low to High)</option>
            <option value="agreement-asc">Agreement Level</option>
            <option value="applicantName-asc">Applicant Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Single Combined Table */}
      <div className="overflow-hidden bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Applicant</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-green-500 uppercase">Human Rank</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-green-500 uppercase">Human Score</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-green-500 uppercase">Human Status</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-orange-500 uppercase">Algorithm Rank</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-orange-500 uppercase">Algorithm Status</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Agreement</th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortComparisonRows(allApplications).map((row, index) => (
                <ApplicantComparisonCard
                  key={row.applicationId}
                  comparison={row}
                  index={index}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default CountyComparisonView;