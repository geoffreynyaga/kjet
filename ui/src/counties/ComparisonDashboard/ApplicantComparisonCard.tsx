import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle, ChevronDown, ChevronRight, Minus, XCircle } from 'lucide-react';
import React, { useState } from 'react';

import { ComparisonRow } from './types.ts';
import CriterionComparisonRow from './CriterionComparisonRow.tsx';
import { motion } from 'framer-motion';

interface ApplicantComparisonCardProps {
  comparison: ComparisonRow | any; // Allow for both matched and mismatched applications
  index: number;
}

const ApplicantComparisonCard: React.FC<ApplicantComparisonCardProps> = ({ comparison, index }) => {
  const [isReasonsExpanded, setIsReasonsExpanded] = useState(false);
  const [isCriterionExpanded, setIsCriterionExpanded] = useState(false);
  const [expandedCriterion, setExpandedCriterion] = useState<Set<string>>(new Set());


  // console.log(comparison,"comparison in ApplicantComparisonCard")

  // Check if this is a matched comparison (has LLM data) or a mismatched application
  const isMatched = comparison.llmStatus && comparison.llmStatus !== 'County Not Found' && comparison.llmStatus !== 'Not Found in LLM' && comparison.llmStatus !== 'No Analysis';
  const hasDetailedComparison = comparison.criterionComparisons && comparison.criterionComparisons.length > 0 && comparison.llmStatus === 'Ranked';

  // Detect pass/fail disagreements
  const humanPassed = comparison.humanStatus?.toLowerCase() === 'pass';
  const llmPassed = comparison.llmStatus === 'Ranked';
  const bothFailed = !humanPassed && !llmPassed && isMatched;
  const hasPassFailDisagreement = isMatched && (humanPassed !== llmPassed);
  const disagreementType = hasPassFailDisagreement
    ? (humanPassed ? 'llm-failed-human-passed' : 'human-failed-llm-passed')
    : null;

  const toggleCriterionSection = () => {
    if (hasDetailedComparison) {
      setIsCriterionExpanded(!isCriterionExpanded);
    }
  };

  const toggleSpecificCriterion = (criterion: string) => {
    setExpandedCriterion(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criterion)) {
        newSet.delete(criterion);
      } else {
        newSet.add(criterion);
      }
      return newSet;
    });
  };

  const getAgreementColor = (agreement: string) => {
    switch (agreement) {
      case 'full': return 'text-green-600 bg-green-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'disagreement': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAgreementIcon = (agreement: string) => {
    switch (agreement) {
      case 'full': return <CheckCircle size={16} />;
      case 'partial': return <Minus size={16} />;
      case 'disagreement': return <XCircle size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getRankChangeIcon = (difference: number | null) => {
    if (difference === null || difference === 0) return <Minus className="text-gray-400" size={16} />;
    if (difference > 0) return <ArrowDown className="text-red-500" size={16} />;
    return <ArrowUp className="text-green-500" size={16} />;
  };

  return (
    <React.Fragment>
      <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-2">
            {hasDetailedComparison && (
              <button
                onClick={toggleCriterionSection}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                {isCriterionExpanded ?
                  <ChevronDown size={16} /> :
                  <ChevronRight size={16} />
                }
              </button>
            )}
            {!hasDetailedComparison && (
              <div className="flex items-center justify-center w-4 h-4">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
            )}
            <div>
              <div className="font-medium text-gray-900">{comparison.applicantName || `Application ${comparison.applicationId}`}</div>
              <div className="text-sm text-gray-500">ID: {comparison.applicationId}</div>
              {comparison.hasPenalty && (
                <div className="px-2 py-1 mt-1 text-xs text-red-600 rounded bg-red-50">
                  ⚠️ Penalty: {comparison.penaltyReason}
                </div>
              )}
              {!isMatched && (
                <div className="px-2 py-1 mt-1 text-xs text-orange-600 rounded bg-orange-50">
                  No computer analysis available
                </div>
              )}
              {bothFailed && (
                <div className="px-2 py-1 mt-1 text-xs text-green-600 rounded bg-green-50">
                  ✓ Both evaluations agree: Failed
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-4 text-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            comparison.humanStatus?.toLowerCase() === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {comparison.humanRank || 'N/A'}
          </span>
        </td>
        <td className="px-4 py-4 text-center">
          <span className="text-sm font-medium">
            {comparison.humanScore ? comparison.humanScore.toFixed(1) : '-'}
          </span>
        </td>
        <td className="px-4 py-4 text-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            comparison.humanStatus?.toLowerCase() === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {comparison.humanStatus || 'N/A'}
          </span>
        </td>
        <td className="px-4 py-4 text-center">
          {isMatched ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              comparison.llmStatus === 'Ranked' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
            }`}>
              {comparison.llmStatus === 'Ranked' ? (comparison.llmRank || 'N/A') : 'Fail'}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              No Analysis
            </span>
          )}
        </td>
        <td className="px-4 py-4 text-center">
          {isMatched ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              comparison.llmStatus === 'Ranked' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
            }`}>
              {comparison.llmStatus === 'Ranked' ? 'Pass' : 'Fail'}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              No Analysis
            </span>
          )}
        </td>
        <td className="px-4 py-4 text-center">
          {isMatched && comparison.agreement ? (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getAgreementColor(comparison.agreement)}`}>
              {getAgreementIcon(comparison.agreement)}
              {comparison.agreement}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <AlertTriangle size={16} />
              No Comparison
            </span>
          )}
        </td>
        <td className="px-4 py-4">
          <button
            onClick={() => setIsReasonsExpanded(!isReasonsExpanded)}
            className={`text-sm cursor-pointer ${hasPassFailDisagreement ? 'text-red-600 hover:text-red-800' : bothFailed ? 'text-green-600 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'}`}
          >
            {hasPassFailDisagreement ? (
              <span className="flex items-center gap-1 font-medium">
                <AlertTriangle size={14} className="text-red-500" />
                {disagreementType === 'human-failed-llm-passed'
                  ? 'Human failed but LLM disagreed. Click to see details.'
                  : 'LLM failed but human disagreed. Click to see details.'
                }
              </span>
            ) : bothFailed ? (
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle size={14} className="text-green-500" />
                Both evaluations agree: Failed. Click to see details.
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {isReasonsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                View evaluation reasons
              </span>
            )}
          </button>
        </td>
      </tr>

      {/* Expanded reasons row */}
      {isReasonsExpanded && (
        <tr className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
          <td colSpan={8} className="px-4 py-4 border-t border-gray-200">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {hasPassFailDisagreement && (
                <div className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="flex-shrink-0 text-red-500" />
                    <span className="font-medium text-red-700">Disagreement Detected</span>
                  </div>
                  <p className="text-sm leading-relaxed text-red-600">
                    {disagreementType === 'human-failed-llm-passed'
                      ? `Human evaluation: FAIL (${comparison.humanStatus}) | LLM evaluation: PASS (${comparison.llmStatus})`
                      : `Human evaluation: PASS (${comparison.humanStatus}) | LLM evaluation: FAIL (${comparison.llmStatus})`
                    }
                  </p>
                </div>
              )}
              {bothFailed && (
                <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="flex-shrink-0 text-green-500" />
                    <span className="font-medium text-green-700">Agreement Confirmed</span>
                  </div>
                  <p className="text-sm leading-relaxed text-green-600">
                    Both human and LLM evaluations agree that this application should fail.
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Human Reason */}
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h4 className="font-medium text-gray-900">Human Evaluator Reason</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {comparison.humanReason || 'No reason provided by human evaluator'}
                  </p>
                </div>

                {/* LLM Reason */}
                {isMatched ? (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <h4 className="font-medium text-gray-900">LLM Analysis Reason</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {comparison.llmReason || 'No detailed reason available from LLM analysis'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="flex-shrink-0 text-orange-500" />
                      <h4 className="font-medium text-orange-700">Machine Analysis Status</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-orange-600">
                      {comparison.llmStatus || 'No LLM analysis found for this application'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </td>
        </tr>
      )}

      {/* Expanded detailed criterion comparison row */}
      {isCriterionExpanded && hasDetailedComparison && (
        <tr className={index % 2 === 0 ? 'bg-blue-50' : 'bg-blue-25'}>
          <td colSpan={8} className="px-4 py-6">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <h4 className="mb-4 text-lg font-semibold text-gray-900">
                Detailed Criterion-by-Criterion Analysis
              </h4>
              <div className="space-y-3">
                {comparison.criterionComparisons?.map((criterion: any) => (
                  <CriterionComparisonRow
                    key={criterion.criterion}
                    comparison={criterion}
                    isExpanded={expandedCriterion.has(criterion.criterion)}
                    onToggle={() => toggleSpecificCriterion(criterion.criterion)}
                  />
                )) || <p className="text-gray-500">No detailed comparisons available</p>}
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default ApplicantComparisonCard;