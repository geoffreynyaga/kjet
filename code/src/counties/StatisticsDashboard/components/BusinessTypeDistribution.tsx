import React from 'react';
import { motion } from 'framer-motion';
import { NationalStats } from '../types/index.ts';

interface BusinessTypeDistributionProps {
  nationalStats: NationalStats;
}

export const BusinessTypeDistribution: React.FC<BusinessTypeDistributionProps> = ({ nationalStats }) => {
  return (
    <motion.div
      className="p-6 bg-white rounded-lg shadow-sm"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Business Type Distribution</h3>

      <div className="space-y-3">
        {nationalStats.businessTypeDistribution.map((item, index) => {
          const maxValue = Math.max(...nationalStats.businessTypeDistribution.map(d => d.value));
          const percentage = (item.value / maxValue) * 100;

          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-24 text-sm font-medium text-right text-gray-700">
                {item.name}
              </div>
              <div className="relative flex-1 h-6 bg-gray-200 rounded-full">
                <div
                  className="flex items-center justify-end h-6 pr-2 transition-all duration-500 ease-out bg-blue-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                >
                  <span className="text-xs font-medium text-white">
                    {item.value}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 w-12 text-xs text-gray-500">
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};