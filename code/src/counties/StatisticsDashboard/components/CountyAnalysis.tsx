import React from 'react';
import { motion } from 'framer-motion';
import { CountyStats } from '../types/index.ts';

interface CountyAnalysisProps {
  countyStats: CountyStats[];
  selectedCounty: string | null;
  selectedCountyData: CountyStats | null;
  onCountyChange: (county: string | null) => void;
}

export const CountyAnalysis: React.FC<CountyAnalysisProps> = ({
  countyStats,
  selectedCounty,
  selectedCountyData,
  onCountyChange
}) => {
  return (
    <div className="flex justify-center w-full">
      <motion.div
        className="w-full p-6 bg-white rounded-lg shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">County Analysis</h3>
        <select
          value={selectedCounty || ''}
          onChange={(e) => onCountyChange(e.target.value || null)}
          className="w-full max-w-2xl p-4 mb-6 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a county...</option>
          {countyStats.map(county => (
            <option key={county.county} value={county.county}>
              {county.county} ({county.totalApplications} applications)
            </option>
          ))}
        </select>

        {selectedCountyData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Applications</p>
                <p className="text-2xl font-bold">{selectedCountyData.totalApplications}</p>
              </div>

              <div className="p-4 rounded-lg bg-purple-50">
                <p className="text-sm text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-purple-600">{selectedCountyData.averageScore.toFixed(1)}</p>
              </div>

              <div className="p-4 rounded-lg bg-orange-50">
                <p className="text-sm text-gray-600">Top Score</p>
                <p className="text-2xl font-bold text-orange-600">{selectedCountyData.topScore.toFixed(1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-3 text-lg font-medium text-gray-900">Business Types Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(selectedCountyData.businessTypes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span className="font-medium text-gray-700">{type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {((count / selectedCountyData.totalApplications) * 100).toFixed(1)}%
                          </span>
                          <span className="font-bold text-blue-600">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-lg font-medium text-gray-900">Additional Metrics</h4>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-indigo-50">
                    <p className="text-sm text-gray-600">Tier 1 Businesses</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {selectedCountyData.tier1Count}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({((selectedCountyData.tier1Count / selectedCountyData.totalApplications) * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-pink-50">
                    <p className="text-sm text-gray-600">Tier 2 Businesses</p>
                    <p className="text-xl font-bold text-pink-600">
                      {selectedCountyData.tier2Count}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({((selectedCountyData.tier2Count / selectedCountyData.totalApplications) * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};