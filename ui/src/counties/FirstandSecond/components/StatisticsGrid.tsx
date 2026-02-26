import React from 'react';

interface Statistics {
  totalApplicants: number;
  firstRoundPassed: number;
  finalQualified: number;
  totalImproved: number;
  promotedToTop2: number;
  kickedFromTop2: number;
  scoreImproved: number;
  zeroToScored: number;
  averageFirstRound: number;
  averageSecondRound: number;
}

interface StatisticsGridProps {
  stats: Statistics;
}

const StatisticsGrid: React.FC<StatisticsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-md">
              <span className="text-sm font-bold text-white">T</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 ml-5">
            <dl>
              <dt className="text-sm font-medium leading-tight text-gray-500">Total Applicants</dt>
              <dd className="text-xl font-bold text-gray-900">{stats.totalApplicants.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-md">
              <span className="text-sm font-bold text-white">1st</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 ml-5">
            <dl>
              <dt className="text-sm font-medium leading-tight text-gray-500">First Results Passed</dt>
              <dd className="text-xl font-bold text-gray-900">{stats.firstRoundPassed.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-500 rounded-md">
              <span className="text-sm font-bold text-white">Q</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 ml-5">
            <dl>  
              <dt className="text-sm font-medium leading-tight text-gray-500">Final Qualified</dt>
              <dd className="text-xl font-bold text-gray-900">{stats.finalQualified.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-500 rounded-md">
              <span className="text-sm font-bold text-white">↑</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 ml-5">
            <dl>
              <dt className="text-sm font-medium leading-tight text-gray-500">Total Improved</dt>
              <dd className="text-xl font-bold text-gray-900">{stats.totalImproved.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-cyan-500">
              <span className="text-sm font-bold text-white">★</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 ml-5">
            <dl>
              <dt className="text-sm font-medium leading-tight text-gray-500">Promoted to Top 2</dt>
              <dd className="text-xl font-bold text-gray-900">{stats.promotedToTop2.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-md">
              <span className="text-sm font-bold text-white">↓</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 ml-5">
            <dl>
              <dt className="text-sm font-medium leading-tight text-gray-500">Kicked from Top 2</dt>
              <dd className="text-xl font-bold text-gray-900">{stats.kickedFromTop2.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsGrid;