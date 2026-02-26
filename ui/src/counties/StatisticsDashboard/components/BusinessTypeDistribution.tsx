import React from 'react';
import { motion } from 'framer-motion';
import { NationalStats } from '../types/index.ts';

interface BusinessTypeDistributionProps {
  nationalStats: NationalStats;
}

export const BusinessTypeDistribution: React.FC<BusinessTypeDistributionProps> = ({ nationalStats }) => {
  const maxValue = Math.max(...nationalStats.businessTypeDistribution.map(d => d.value));

  console.log('BusinessTypeDistribution render with data:', nationalStats);

  // Simple solid colors for each bar
  const barColors = [
    '#3B82F6', // blue
    '#A855F7', // purple
    '#10B981', // green
    '#F97316', // orange
    '#EC4899', // pink
    '#6366F1', // indigo
    '#14B8A6', // teal
    '#EF4444', // red
    '#EAB308', // yellow
    '#06B6D4', // cyan
  ];

  return (
    <motion.div
      className="p-8 border border-gray-100 shadow-lg bg-gradient-to-br from-white to-gray-50 rounded-xl"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3 className="flex items-center mb-6 text-xl font-bold text-gray-900">
          <div
            className="w-1 h-6 mr-3 rounded-full"
            style={{
              background: 'linear-gradient(to bottom, #3B82F6, #A855F7)'
            }}
          ></div>
          Business Type Distribution
        </h3>
      </motion.div>

      <div className="space-y-2">
        {nationalStats.businessTypeDistribution.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const barColor = barColors[index % barColors.length];

          return (
            <motion.div
              key={index}
              className="group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.8 + (index * 0.1),
                duration: 0.6,
                ease: "easeOut"
              }}
            >
              <div className="flex items-center space-x-3 hover:transform hover:scale-[1.01] transition-transform duration-300">
                <div className="flex-shrink-0 w-24 text-xs font-semibold text-right text-gray-700 transition-colors group-hover:text-gray-900">
                  {item.name}
                </div>

                <div className="relative flex-1 h-5 overflow-hidden bg-gray-100 rounded-full shadow-inner">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full shadow-sm"
                    style={{ backgroundColor: barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                      delay: 1.0 + (index * 0.15),
                      duration: 1.2,
                      ease: "easeOut"
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-white rounded-full"
                      style={{ opacity: 0.2 }}
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{
                        delay: 1.0 + (index * 0.15) + 0.3,
                        duration: 0.8,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>

                  <motion.div
                    className="absolute inset-0 flex items-center justify-end pr-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      delay: 1.2 + (index * 0.15),
                      duration: 0.4
                    }}
                  >
                    <span className="text-xs font-bold text-gray-900 drop-shadow-sm">
                      {item.value}
                    </span>
                  </motion.div>
                </div>

                <motion.div
                  className="flex-shrink-0 text-xs font-medium text-gray-600 transition-colors w-14 group-hover:text-blue-600"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 1.3 + (index * 0.15),
                    duration: 0.4,
                    ease: "backOut"
                  }}
                >
                  {item.percentage.toFixed(1)}%
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Subtle bottom accent */}
      <motion.div
        className="h-1 mt-6 rounded-full"
        style={{
          background: 'linear-gradient(to right, #3B82F6, #A855F7, #EC4899)',
          opacity: 0.3
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          delay: 2.0,
          duration: 1.0,
          ease: "easeOut"
        }}
      />
    </motion.div>
  );
};