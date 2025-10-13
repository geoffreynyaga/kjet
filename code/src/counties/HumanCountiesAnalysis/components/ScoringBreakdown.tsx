import React from 'react';
import { motion } from 'framer-motion';
import { HumanApplicant } from '../types/index.ts';

interface ScoringBreakdownProps {
  app: HumanApplicant;
}

export default function ScoringBreakdown({ app }: ScoringBreakdownProps) {
  const scoringCriteria = [
    {
      title: "Registration & Track Record",
      score: app['A3.1 Registration & Track Record '] || 0,
      logic: app['Logic'],
      color: "blue",
      delay: 0.1
    },
    {
      title: "Financial Position",
      score: app['A3.2 Financial Position '] || 0,
      logic: app['Logic.1'],
      color: "green",
      delay: 0.15
    },
    {
      title: "Market Demand & Competitiveness",
      score: app['A3.3 Market Demand & Competitiveness'] || 0,
      logic: app['Logic.2'],
      color: "purple",
      delay: 0.2
    },
    {
      title: "Business Proposal / Growth Viability",
      score: app['A3.4 Business Proposal / Growth Viability'] || 0,
      logic: app['Logic.3'],
      color: "orange",
      delay: 0.25
    },
    {
      title: "Value Chain Alignment & Role",
      score: app['A3.5 Value Chain Alignment & Role'] || 0,
      logic: app['Logic.4'],
      color: "indigo",
      delay: 0.3
    },
    {
      title: "Inclusivity & Sustainability",
      score: app['A3.6 Inclusivity & Sustainability '] || 0,
      logic: app['Logic.5'],
      color: "teal",
      delay: 0.35
    }
  ];

  const getColorStyles = (color: string) => {
    const colorMap = {
      blue: {
        text: "text-blue-600",
        shadow: "rgba(59, 130, 246, 0.15)",
        border: "rgb(59, 130, 246)"
      },
      green: {
        text: "text-green-600",
        shadow: "rgba(34, 197, 94, 0.15)",
        border: "rgb(34, 197, 94)"
      },
      purple: {
        text: "text-purple-600",
        shadow: "rgba(147, 51, 234, 0.15)",
        border: "rgb(147, 51, 234)"
      },
      orange: {
        text: "text-orange-600",
        shadow: "rgba(251, 146, 60, 0.15)",
        border: "rgb(251, 146, 60)"
      },
      indigo: {
        text: "text-indigo-600",
        shadow: "rgba(99, 102, 241, 0.15)",
        border: "rgb(99, 102, 241)"
      },
      teal: {
        text: "text-teal-600",
        shadow: "rgba(20, 184, 166, 0.15)",
        border: "rgb(20, 184, 166)"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="pt-2 order-gray-200 b">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {scoringCriteria.map((criterion, index) => {
          const colorStyles = getColorStyles(criterion.color);
          return (
            <motion.div
              key={criterion.title}
              className="p-3 bg-white border border-gray-200 rounded-lg"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: criterion.delay,
                ease: "easeOut"
              }}
              whileHover={{
                scale: 1.02,
                boxShadow: `0 4px 12px ${colorStyles.shadow}`,
                borderColor: colorStyles.border
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">{criterion.title}</span>
                <div className="flex items-center gap-1">
                  <motion.span
                    className={`text-sm font-bold ${colorStyles.text}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: criterion.delay + 0.2, type: "spring", stiffness: 500 }}
                  >
                    {criterion.score}
                  </motion.span>
                  <span className="text-xs text-gray-400">/5</span>
                </div>
              </div>
              {criterion.logic && (
                <motion.p
                  className="text-xs leading-relaxed text-gray-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: criterion.delay + 0.3 }}
                >
                  {criterion.logic}
                </motion.p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Overall Summary */}
      <div className="pt-2 mt-2 border-t border-gray-200">
        {app['REASON(Evaluators Comments)'] && (
          <div className="mt-1">
            <div className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">Overall Evaluator Comments</div>
            <div className="text-sm leading-relaxed text-gray-800">
              {app['REASON(Evaluators Comments)']}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}