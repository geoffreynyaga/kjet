import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { CriterionComparison } from './types.ts';

interface CriterionComparisonRowProps {
  comparison: CriterionComparison;
  isExpanded: boolean;
  onToggle: () => void;
}

const CriterionComparisonRow: React.FC<CriterionComparisonRowProps> = ({ 
  comparison, 
  isExpanded, 
  onToggle 
}) => {

    // console.log(comparison,"comparison")


  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAgreementBadge = (agreement: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (agreement) {
      case 'full':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'partial':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'disagreement':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="pl-4 mb-4 border-l-4 border-gray-200">
      <div 
        className="flex items-center justify-between p-3 transition-colors rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-4">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-gray-900">{comparison.criterion}</span>
          <span className={getAgreementBadge(comparison.agreement)}>
            {comparison.agreement}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-600">Human: </span>
            <span className={getScoreColor(comparison.humanScore)}>
              {comparison.humanScore?.toFixed(1) ?? 'N/A'}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">LLM: </span>
            <span className={getScoreColor(comparison.llmScore)}>
              {comparison.llmScore?.toFixed(1) ?? 'N/A'}
            </span>
          </div>
          {comparison.scoreDifference !== null && (
            <div className="text-sm">
              <span className="text-gray-600">Diff: </span>
              <span className={comparison.scoreDifference > 0 ? 'text-green-600' : 'text-red-600'}>
                {comparison.scoreDifference > 0 ? '+' : ''}{comparison.scoreDifference.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 mt-3 bg-white border rounded-lg"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium text-gray-900">Human Evaluator Reasoning</h4>
              <p className="p-3 text-sm text-gray-700 rounded bg-blue-50">
                {comparison.humanReason}
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-gray-900">LLM Analysis</h4>
              <p className="p-3 text-sm text-gray-700 rounded bg-green-50">
                {comparison.llmReason}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CriterionComparisonRow;