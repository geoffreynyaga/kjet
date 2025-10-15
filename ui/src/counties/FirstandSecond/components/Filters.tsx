import React from 'react';

interface Statistics {
  totalApplicants: number;
  firstRoundPassed: number;
  scoreImproved: number;
  declined: number;
  zeroToScored: number;
  promotedToTop2: number;
  kickedFromTop2: number;
}

interface FiltersProps {
  filterStatus: string;
  filterCounty: string;
  uniqueCounties: string[];
  data: any[];
  stats: Statistics;
  startIndex: number;
  itemsPerPage: number;
  filteredDataLength: number;
  onFilterStatusChange: (status: string) => void;
  onFilterCountyChange: (county: string) => void;
}

const Filters: React.FC<FiltersProps> = ({
  filterStatus,
  filterCounty,
  uniqueCounties,
  data,
  stats,
  startIndex,
  itemsPerPage,
  filteredDataLength,
  onFilterStatusChange,
  onFilterCountyChange,
}) => {
  return (
    <div className="mb-6 bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Filters:</label>
              <select
                value={filterStatus}
                onChange={(e) => onFilterStatusChange(e.target.value)}
                className="min-w-[200px] px-3 py-2 text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All ({data.length})</option>
                <option value="first-round-pass">First Round Pass ({stats.firstRoundPassed})</option>
                <option value="low-to-high">Low → Higher ({stats.scoreImproved})</option>
                <option value="high-to-low">High → Lower ({stats.declined})</option>
                <option value="zero-to-ranked">Zero → Ranked ({stats.zeroToScored})</option>
                <option value="promoted-to-top2">Promoted to County Top 2 ({stats.promotedToTop2})</option>
                <option value="demoted-from-top2">Demoted from County Top 2 ({stats.kickedFromTop2})</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Filter by County:</label>
              <select
                value={filterCounty}
                onChange={(e) => onFilterCountyChange(e.target.value)}
                className="min-w-[180px] px-3 py-2 text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Counties ({uniqueCounties.length})</option>
                {uniqueCounties.map(county => {
                  const countyCount = data.filter(item => item["County"] === county).length;
                  return (
                    <option key={county} value={county}>
                      {county} ({countyCount})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDataLength)} of {filteredDataLength} results
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;