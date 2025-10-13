import React, { useEffect, useMemo, useState } from 'react';

interface ComparisonData {
  "Application ID": string;
  "ALL SCORED": number;
  "ONLY PASS": number | "DQ";
}

const FirstandSecond: React.FC = () => {
  const [data, setData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof ComparisonData>('Application ID');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'first-round-pass' | 'low-to-high' | 'high-to-low' | 'pass-to-disqualified'>('all');

  const itemsPerPage = 50;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/comparison_data.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply filter
    if (filterStatus === 'first-round-pass') {
      // Show only those who had positive scores in first round
      filtered = data.filter(item => item["ALL SCORED"] > 0);
    } else if (filterStatus === 'low-to-high') {
      // Show only those who had low scores in first round but improved in second round
      filtered = data.filter(item => item["ALL SCORED"] > 0 && typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 && item["ONLY PASS"] > item["ALL SCORED"]);
    } else if (filterStatus === 'high-to-low') {
      // Show only those who had high scores in first round but got lower scores in second round
      filtered = data.filter(item => item["ALL SCORED"] > 0 && typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 && item["ONLY PASS"] < item["ALL SCORED"]);
    } else if (filterStatus === 'pass-to-disqualified') {
      // Show only those who passed first round but were disqualified in second round
      filtered = data.filter(item => item["ALL SCORED"] > 0 && item["ONLY PASS"] === "DQ");
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string sorting
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [data, sortField, sortDirection, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const totalApplicants = data.length;
    const firstRoundPassed = data.filter(item => item["ALL SCORED"] > 0).length;
    const secondRoundEvaluated = data.filter(item => typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0).length;
    const improved = data.filter(item => item["ALL SCORED"] > 0 && typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 && item["ONLY PASS"] > item["ALL SCORED"]).length;
    const declined = data.filter(item => item["ALL SCORED"] > 0 && typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 && item["ONLY PASS"] < item["ALL SCORED"]).length;
    const disqualified = data.filter(item => item["ALL SCORED"] > 0 && item["ONLY PASS"] === "DQ").length;
    const noChange = data.filter(item => item["ALL SCORED"] > 0 && item["ONLY PASS"] === 0).length;
    const averageFirstRound = data.reduce((sum, item) => sum + item["ALL SCORED"], 0) / totalApplicants;
    const averageSecondRound = data.reduce((sum, item) => {
      // If second round is a positive number, use it
      if (typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0) {
        return sum + item["ONLY PASS"];
      }
      // If second round is 0 (no change) or "DQ", use first round score
      else if (item["ONLY PASS"] === 0 || item["ONLY PASS"] === "DQ") {
        return sum + item["ALL SCORED"];
      }
      // Fallback (shouldn't happen but just in case)
      return sum + item["ALL SCORED"];
    }, 0) / totalApplicants;

    return {
      totalApplicants,
      firstRoundPassed,
      secondRoundEvaluated,
      improved,
      declined,
      disqualified,
      noChange,
      firstRoundFailedTotal: totalApplicants - firstRoundPassed,
      averageFirstRound: isNaN(averageFirstRound) ? 0 : averageFirstRound,
      averageSecondRound: isNaN(averageSecondRound) ? 0 : averageSecondRound,
    };
  }, [data]);

  const handleSort = (field: keyof ComparisonData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof ComparisonData) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getStatusBadges = (firstRound: number, secondRound: number | "DQ") => {
    const badges = [];

    // Check for improvement and decline cases
    const isImprovement = firstRound > 0 && typeof secondRound === 'number' && secondRound > 0 && secondRound > firstRound;
    const isDecline = firstRound > 0 && typeof secondRound === 'number' && secondRound > 0 && secondRound < firstRound;

    // First round status
    if (firstRound > 0) {
      badges.push(
        <span key="first" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-1 ${
          isImprovement ? 'bg-yellow-100 text-yellow-800' :
          isDecline ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {isImprovement ? 'Low' : isDecline ? 'High' : 'Pass'}
        </span>
      );
    } else {
      badges.push(
        <span key="first" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-1">
          Fail
        </span>
      );
    }

    // Arrow indicator
    badges.push(
      <span key="arrow" className="mx-1 text-gray-400">→</span>
    );

    // Second round status
    if (secondRound === "DQ") {
      badges.push(
        <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
          Disqualified
        </span>
      );
    } else if (typeof secondRound === 'number' && secondRound > 0) {
      if (isImprovement) {
        badges.push(
          <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-1">
            Higher
          </span>
        );
      } else if (isDecline) {
        badges.push(
          <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-1">
            Lower
          </span>
        );
      } else {
        badges.push(
          <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-1">
            Pass
          </span>
        );
      }
    } else if (firstRound > 0) {
      // Had marks in first round, zero in second means no change
      badges.push(
        <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-1">
          No Change
        </span>
      );
    } else {
      // Zero in both rounds
      badges.push(
        <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
          Fail
        </span>
      );
    }

    return <div className="flex items-center">{badges}</div>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
        <span className="ml-2 text-gray-600">Loading comparison data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchData}
                className="px-3 py-2 text-sm font-medium text-red-800 transition-colors bg-red-100 rounded-md hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">First and Second Round Evaluation Analysis</h1>
        <p className="text-gray-600">Analysis of first round scores vs second round re-evaluations and reconsiderations</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-md">
                <span className="text-sm font-bold text-white">T</span>
              </div>
            </div>
            <div className="flex-1 w-0 ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Applicants</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalApplicants.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-md">
                <span className="text-sm font-bold text-white">1st</span>
              </div>
            </div>
            <div className="flex-1 w-0 ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">First Round Passed</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.firstRoundPassed.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-md">
                <span className="text-sm font-bold text-white">2nd</span>
              </div>
            </div>
            <div className="flex-1 w-0 ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Second Round Evaluated</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.secondRoundEvaluated.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-md">
                <span className="text-sm font-bold text-white">↑</span>
              </div>
            </div>
            <div className="flex-1 w-0 ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Improved Scores</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.improved.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-red-500 rounded-md">
                <span className="text-sm font-bold text-white">DQ</span>
              </div>
            </div>
            <div className="flex-1 w-0 ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Disqualified</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.disqualified.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as 'all' | 'first-round-pass' | 'low-to-high' | 'high-to-low' | 'pass-to-disqualified');
                  setCurrentPage(1);
                }}
                className="text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All ({data.length})</option>
                <option value="first-round-pass">First Round Pass ({stats.firstRoundPassed})</option>
                <option value="low-to-high">Low → Higher ({stats.improved})</option>
                <option value="high-to-low">High → Lower ({stats.declined})</option>
                <option value="pass-to-disqualified">Pass → Disqualified ({stats.disqualified})</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('Application ID')}
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Application ID {getSortIcon('Application ID')}
                </th>
                <th
                  onClick={() => handleSort('ALL SCORED')}
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  First Round Score {getSortIcon('ALL SCORED')}
                </th>
                <th
                  onClick={() => handleSort('ONLY PASS')}
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Second Round Score {getSortIcon('ONLY PASS')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((item, index) => {
                return (
                  <tr key={`${item["Application ID"]}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item["Application ID"]}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item["ALL SCORED"]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item["ONLY PASS"] === "DQ" ? 'bg-red-100 text-red-800' :
                        typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item["ONLY PASS"]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {getStatusBadges(item["ALL SCORED"], item["ONLY PASS"])}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {(() => {
                        const firstRound = item["ALL SCORED"];
                        const secondRound = item["ONLY PASS"];

                        if (secondRound === "DQ") {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Disqualified
                            </span>
                          );
                        } else if (firstRound === 0 && typeof secondRound === 'number' && secondRound > 0) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Reconsidered (+{secondRound})
                            </span>
                          );
                        } else if (firstRound > 0 && secondRound === 0) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No Change
                            </span>
                          );
                        } else if (firstRound > 0 && typeof secondRound === 'number' && secondRound > 0) {
                          const change = secondRound - firstRound;
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              change > 0 ? 'bg-blue-100 text-blue-800' :
                              change < 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {change > 0 ? `+${change}` : change === 0 ? 'Same' : change}
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No Change
                            </span>
                          );
                        }
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div className="flex justify-between flex-1 sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Information */}
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
            <h4 className="mb-2 text-sm font-medium text-gray-700">Evaluation Breakdown</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Score Improvements: <span className="font-medium">{stats.improved.toLocaleString()}</span></li>
              <li>No Change (First Round Score Stands): <span className="font-medium">{stats.noChange.toLocaleString()}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstandSecond;
