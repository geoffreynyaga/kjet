import React from 'react';
import { CountyComparison } from './types.ts';

interface CountySummaryStatsProps {
  countyComparison: CountyComparison;
}

const CountySummaryStats: React.FC<CountySummaryStatsProps> = ({ countyComparison }) => {
  return (
    <div className="mb-8 overflow-hidden bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-2xl font-bold text-gray-900">{countyComparison.county} County Comparison</h2>
        <p className="text-gray-600">Detailed analysis of human vs algorithm evaluation agreement</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{countyComparison.totalApplications}</div>
            <div className="text-sm text-gray-600">Human Applications</div>
            <div className="text-xs text-gray-500">
              {countyComparison.comparisonRows.length} matched
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{countyComparison.perfectMatches}</div>
            <div className="text-sm text-gray-600">Perfect Matches</div>
            <div className="text-xs text-gray-500">
              {countyComparison.totalApplications > 0 ?
                `${(countyComparison.perfectMatches / countyComparison.totalApplications * 100).toFixed(1)}%` :
                '0%'
              }
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{countyComparison.partialMatches}</div>
            <div className="text-sm text-gray-600">Partial Matches</div>
            <div className="text-xs text-gray-500">
              {countyComparison.totalApplications > 0 ?
                `${(countyComparison.partialMatches / countyComparison.totalApplications * 100).toFixed(1)}%` :
                '0%'
              }
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{countyComparison.disagreements}</div>
            <div className="text-sm text-gray-600">Disagreements</div>
            <div className="text-xs text-gray-500">
              {countyComparison.totalApplications > 0 ?
                `${(countyComparison.disagreements / countyComparison.totalApplications * 100).toFixed(1)}%` :
                '0%'
              }
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{countyComparison.mismatchedApplications.length}</div>
            <div className="text-sm text-gray-600">Not Found</div>
            <div className="text-xs text-gray-500">
              {countyComparison.totalApplications > 0 ?
                `${(countyComparison.mismatchedApplications.length / countyComparison.totalApplications * 100).toFixed(1)}%` :
                '0%'
              }
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">±{countyComparison.averageRankDifference.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg Rank Difference</div>
            <div className="text-xs text-gray-500">
              Score: ±{countyComparison.averageScoreDifference.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Agreement Rate Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Agreement Rate</span>
            <span className="text-sm font-bold text-gray-900">
              {countyComparison.totalApplications > 0 ?
                `${((countyComparison.perfectMatches + countyComparison.partialMatches) / countyComparison.totalApplications * 100).toFixed(1)}%` :
                '0%'
              }
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full">
            <div className="flex h-3 overflow-hidden rounded-full">
              <div
                className="bg-green-500"
                style={{
                  width: countyComparison.totalApplications > 0 ?
                    `${(countyComparison.perfectMatches / countyComparison.totalApplications * 100)}%` :
                    '0%'
                }}
              ></div>
              <div
                className="bg-yellow-500"
                style={{
                  width: countyComparison.totalApplications > 0 ?
                    `${(countyComparison.partialMatches / countyComparison.totalApplications * 100)}%` :
                    '0%'
                }}
              ></div>
              <div
                className="bg-red-500"
                style={{
                  width: countyComparison.totalApplications > 0 ?
                    `${(countyComparison.disagreements / countyComparison.totalApplications * 100)}%` :
                    '0%'
                }}
              ></div>
            </div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Perfect Match</span>
            <span>Partial Match</span>
            <span>Disagreement</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountySummaryStats;