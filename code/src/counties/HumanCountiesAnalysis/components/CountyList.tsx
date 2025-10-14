import React from 'react';
import { motion } from 'framer-motion';
import { CountyGroup } from '../types/index.ts';
import { getNumericScore } from '../utils/index.ts';

interface CountyListProps {
  groups: CountyGroup[];
  selectedCounty: string | null;
  onCountySelect: (county: string) => void;
}

export default function CountyList({ groups, selectedCounty, onCountySelect }: CountyListProps) {
  return (
    <motion.div
      className="sticky top-0 h-screen overflow-y-auto bg-white shadow-lg w-80"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">
          Counties ({groups.filter(g => g.county !== 'UNKNOWN').length})
        </h3>
      </div>
      <div className="p-2 space-y-2">
        {groups.map((g, i) => {
          const isUnknown = g.county === 'UNKNOWN';
          const selected = selectedCounty === g.county;
          return (
            <motion.div
              key={g.county}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: i * 0.05,
                ease: "easeOut"
              }}
              whileHover={{
                scale: 1.02,
                x: 4,
                boxShadow: selected
                  ? "0 8px 25px rgba(59, 130, 246, 0.25)"
                  : isUnknown
                    ? "0 6px 20px rgba(239, 68, 68, 0.15)"
                    : "0 6px 20px rgba(0, 0, 0, 0.1)",
                transition: { duration: 0.2, ease: "easeOut" }
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCountySelect(g.county)}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selected
                  ? 'bg-blue-100 border-2 border-blue-500 shadow-lg'
                  : isUnknown
                    ? 'bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-300'
                    : 'bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-400'
              }`}
            >
              {/* applicant count badge (top-right) */}
              <motion.div
                className="absolute top-2 right-3"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 + 0.2, type: "spring", stiffness: 500 }}
              >
                <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                  isUnknown
                    ? 'bg-red-600 text-white'
                    : selected
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-800 group-hover:bg-blue-200'
                }`}>
                  {g.applicants.length}
                </span>
              </motion.div>

              <div className="flex-1 min-w-0">
                <motion.div
                  className={`truncate ${
                    isUnknown ? 'font-semibold text-red-900' : 'font-medium text-gray-900'
                  } font-sans tracking-tight transition-colors duration-200`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                >
                  {g.county}
                </motion.div>
                <motion.div
                  className="flex items-center mt-1 space-x-4 text-xs text-gray-600"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 + 0.15 }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-500">Avg Score</span>
                    <motion.span
                      className="font-semibold text-blue-600"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {(() => {
                        const scoredApplicants = g.applicants.filter(a => getNumericScore(a) > 0);
                        if (scoredApplicants.length === 0) return '0';
                        const avgScore = scoredApplicants.reduce((sum, a) => sum + getNumericScore(a), 0) / scoredApplicants.length;
                        return Math.round(avgScore * 10) / 10;
                      })()}
                    </motion.span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-gray-500">Top Score</span>
                    <motion.span
                      className="font-semibold text-amber-600"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {g.applicants.length > 0
                        ? Math.round(getNumericScore(g.applicants[0]) * 10) / 10
                        : '0'
                      }
                    </motion.span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}