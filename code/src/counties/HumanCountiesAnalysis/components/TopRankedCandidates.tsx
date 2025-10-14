import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HumanApplicant, CountyGroup } from '../types/index.ts';
import { getNumericScore, formatScore } from '../utils/index.ts';
import ScoringBreakdown from './ScoringBreakdown.tsx';

interface TopRankedCandidatesProps {
  topTwo: HumanApplicant[];
  currentGroup: CountyGroup | null;
  expandedRanks: Set<number>;
  onToggleExpand: (rank: number) => void;
}

export default function TopRankedCandidates({
  topTwo,
  currentGroup,
  expandedRanks,
  onToggleExpand
}: TopRankedCandidatesProps) {
  const navigate = useNavigate();

  if (topTwo.length === 0) return null;

  return (
    <div className="mb-8 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-green-200 bg-gradient-to-r from-[#2cb978] to-[#83e85a]">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-green-900">
          <div className="w-2 h-2 bg-green-500 rounded-full" />Top Ranked Candidates
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {topTwo.map((app, idx) => {
          const score = getNumericScore(app);
          const globalRank = currentGroup
            ? currentGroup.applicants.findIndex(a => String(a['Application ID']) === String(app['Application ID'])) + 1
            : idx + 1;
          return (
            <motion.div
              key={`${app['Application ID']}-top-${idx}`}
              className="transition-all duration-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
            >
              <div
                className="flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-gray-50 group"
                onClick={() => onToggleExpand(globalRank)}
              >
                <div className="flex items-center flex-1 gap-4">
                  <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-full shadow-sm bg-gradient-to-br from-red-500 to-red-600">
                    #{globalRank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{app['Application ID']}</h4>
                  </div>
                  <div className="flex items-center gap-3">

                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/results/${app['Application ID']}`);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white transition-all duration-300 bg-gradient-to-r from-sky-400 to-blue-400 rounded-lg shadow-sm hover:shadow-md hover:from-sky-500 hover:to-blue-500"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ExternalLink size={14} />
                      Details
                    </motion.button>
                    <div className="inline-block px-3 py-1 text-sm font-bold text-white bg-green-500 rounded-lg shadow-sm">
                      {formatScore(score)}
                    </div>
                  </div>
                </div>
                <div className="ml-4 text-gray-400 transition-colors group-hover:text-gray-600">
                  {expandedRanks.has(globalRank) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>

              {expandedRanks.has(globalRank) && (
                <motion.div
                  className="px-4 pb-4 bg-gray-50"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mt-2 space-y-4">
                    {/* Penalty badge if present */}
                    {app['DQ1: Fraudulent documents or misrepresentation → Immediate disqualification.'] && (
                      <div className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 border border-red-200 rounded-full">
                        ⚠️ Penalty: {app['DQ1: Fraudulent documents or misrepresentation → Immediate disqualification.']}
                      </div>
                    )}

                    {/* Detailed Scoring Breakdown */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <ScoringBreakdown app={app} />
                    </motion.div>

                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}