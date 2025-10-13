import React from 'react';

interface Statistics {
  scoreImproved: number;
  zeroToScored: number;
  totalImproved: number;
  promotedToTop2: number;
  finalQualified: number;
  averageFirstRound: number;
  averageSecondRound: number;
}

interface AnalysisSummaryProps {
  stats: Statistics;
}

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ stats }) => {
  return (
    <div className="p-6 rounded-lg bg-gray-50">
      <h3 className="mb-4 text-lg font-medium text-gray-900">Analysis Summary</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">Average Scores</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>First Round Average: <span className="font-medium">{stats.averageFirstRound.toFixed(1)}</span></li>
            <li>Second Round Average: <span className="font-medium">{stats.averageSecondRound.toFixed(1)}</span></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">Evaluation Breakdown</h4>

          {/* Improvement Breakdown Table */}
          <div className="mb-4 overflow-hidden bg-white border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Improvement Type
                  </th>
                  <th className="px-3 py-2 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-900">Score Improvements</td>
                  <td className="px-3 py-2 text-sm font-medium text-right text-blue-600">{stats.scoreImproved.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-900">Zero to Scored</td>
                  <td className="px-3 py-2 text-sm font-medium text-right text-green-600">{stats.zeroToScored.toLocaleString()}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-3 py-2 text-sm font-semibold text-blue-900">Total Improved</td>
                  <td className="px-3 py-2 text-sm font-bold text-right text-blue-800">{stats.totalImproved.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Metrics */}
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Promoted to Top 2: <span className="font-medium">{stats.promotedToTop2.toLocaleString()}</span></li>
            <li>Final Qualified: <span className="font-medium">{stats.finalQualified.toLocaleString()}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalysisSummary;