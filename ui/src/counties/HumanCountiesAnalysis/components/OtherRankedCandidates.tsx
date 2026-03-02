import { CountyGroup, HumanApplicant } from '../types/index.ts';
import { formatScore, getNumericScore, isCohortOneApplicant } from '../utils/index.ts';
import { useLocation, useNavigate } from 'react-router-dom';

import { ExternalLink } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';

interface OtherRankedCandidatesProps {
  otherRanked: HumanApplicant[];
  currentGroup: CountyGroup | null;
}

export default function OtherRankedCandidates({ otherRanked, currentGroup }: OtherRankedCandidatesProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (otherRanked.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden bg-white border border-yellow-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-yellow-200 bg-gradient-to-r from-[#f3ce7a] to-[#feb062]">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-900">
          <div className="w-2 h-2 bg-[#f3ce7a] rounded-full" />Other Ranked Candidates
        </h3>
      </div>
      <div className="p-4 divide-y divide-yellow-100">
        {otherRanked.map((app, idx) => {
          const globalRank = currentGroup
            ? currentGroup.applicants.findIndex(a => String(a['Application ID']) === String(app['Application ID'])) + 1
            : idx + 3;
          const score = getNumericScore(app);
          return (
            <motion.div
              key={`${app['Application ID']}-other-${idx}`}
              className="flex items-center justify-between p-4 transition-colors duration-200 hover:bg-yellow-50 group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 font-semibold text-yellow-900">
                  <span>#{globalRank} {app['Application ID']}</span>
                  {isCohortOneApplicant(app['Application ID']) && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 rounded-full">
                      Cohort 1
                    </span>
                  )}
                </div>
                <div className="text-sm leading-relaxed text-yellow-700">{app['REASON(Evaluators Comments)'] || 'No comments available'}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 text-lg font-bold text-yellow-800 bg-yellow-100 rounded-lg">
                  {formatScore(score)}
                </div>
                <motion.button
                  onClick={() => navigate(`/results/${app['Application ID']}${location.search}`)}
                  className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-all duration-200 bg-yellow-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-yellow-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ExternalLink size={16} />
                  Details
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}