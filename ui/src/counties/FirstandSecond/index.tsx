import { BaselineData, ComparisonData } from './types/index.ts';
import React, { useEffect, useMemo, useState } from 'react';
import { filterDataByStatus, getCountyRowColor, getSortIcon, sortData } from './utils/helpers.ts';

import AnalysisSummary from './components/AnalysisSummary.tsx';
import ErrorDisplay from './components/ErrorDisplay.tsx';
import Filters from './components/Filters.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import Pagination from './components/Pagination.tsx';
import StatisticsGrid from './components/StatisticsGrid.tsx';
import TableHeader from './components/TableHeader.tsx';
import TableRow from './components/TableRow.tsx';
import { useStatistics } from './hooks/useStatistics.ts';

const FirstandSecond: React.FC = () => {
  const [data, setData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof ComparisonData>('County');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'first-round-pass' | 'low-to-high' | 'high-to-low' | 'zero-to-ranked' | 'promoted-to-top2' | 'demoted-from-top2'>('all');
  const [filterCounty, setFilterCounty] = useState<string>('all');

  const itemsPerPage = 50;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/static/data/baseline-combined.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const baselineData: BaselineData[] = await response.json();

      // Transform baseline data to match existing ComparisonData interface
      // Swapping: "ALL SCORED" now gets final_weighted_score, "ONLY PASS" gets first_weighted_score
      const transformedData: ComparisonData[] = baselineData.map(item => ({
        "Application ID": item.application_id.replace('_', ' '),
        "County": item.county,
        "ALL SCORED": item.final_weighted_score,
        "ONLY PASS": item.first_weighted_score === "DQ" ? "DQ" : item.first_weighted_score,
        "FIRST RANK": item.first_ranking,
        "FINAL RANK": item.final_ranking,
        "RANK CHANGE": item.first_ranking - item.final_ranking, // Positive = improved rank, Negative = worse rank
        "FIRST COUNTY RANK": item.first_county_rank,
        "FINAL COUNTY RANK": item.final_county_rank,
        "COUNTY RANK CHANGE": item.first_county_rank - item.final_county_rank // Positive = improved county rank, Negative = worse county rank
      }));

      setData(transformedData);
    } catch (err) {
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Get unique counties for filter dropdown
  const uniqueCounties = useMemo(() => {
    const counties = Array.from(new Set(data.map(item => item["County"]))).sort();
    return counties;
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = filterDataByStatus(data, filterStatus);

    // Apply county filter
    if (filterCounty !== 'all') {
      filtered = filtered.filter(item => item["County"] === filterCounty);
    }

    // Apply sorting
    return sortData(filtered, sortField, sortDirection);
  }, [data, sortField, sortDirection, filterStatus, filterCounty]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);

  // Statistics using custom hook
  const stats = useStatistics(data);



  const getStatusBadges = (firstRound: number | "DQ", secondRound: number | "DQ") => {
    const badges = [];

    // Check for improvement and decline cases
    const isImprovement = typeof firstRound === 'number' && firstRound > 0 && typeof secondRound === 'number' && secondRound > 0 && secondRound > firstRound;
    const isDecline = typeof firstRound === 'number' && firstRound > 0 && typeof secondRound === 'number' && secondRound > 0 && secondRound < firstRound;

    // First round status
    if (firstRound === "DQ") {
      badges.push(
        <span key="first" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-1">
          Disqualified
        </span>
      );
    } else if (typeof firstRound === 'number' && firstRound > 0) {
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
    if (typeof secondRound === 'number' && secondRound > 0) {
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
    } else if (typeof firstRound === 'number' && firstRound > 0) {
      // Had marks in first round, zero in second means no change
      badges.push(
        <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-1">
          No Change
        </span>
      );
    } else {
      // Zero in both rounds or DQ in first round
      badges.push(
        <span key="second" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
          Fail
        </span>
      );
    }

    return <div className="flex items-center">{badges}</div>;
  };

  // Handler functions
  const handleFilterStatusChange = (status: string) => {
    setFilterStatus(status as any);
    setCurrentPage(1);
  };

  const handleFilterCountyChange = (county: string) => {
    setFilterCounty(county);
    setCurrentPage(1);
    // When filtering by a specific county, sort by final county ranking
    if (county !== 'all') {
      setSortField('FINAL COUNTY RANK');
      setSortDirection('asc');
    }
  };

  const handleSort = (field: keyof ComparisonData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />;
  }

  return (
    <div className="p-6 mx-auto max-w-7xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">First Results vs Final Results Analysis</h1>
          <p className="text-gray-600">Comparison of first results vs final weighted scores across all evaluations</p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center px-4 py-2 text-sm font-medium text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>
      </div>

      {/* Statistics Cards */}
      <StatisticsGrid stats={stats} />

      {/* Filters and Controls */}
      <Filters
        filterStatus={filterStatus}
        filterCounty={filterCounty}
        uniqueCounties={uniqueCounties}
        data={data}
        stats={stats}
        startIndex={startIndex}
        itemsPerPage={itemsPerPage}
        filteredDataLength={filteredAndSortedData.length}
        onFilterStatusChange={handleFilterStatusChange}
        onFilterCountyChange={handleFilterCountyChange}
      />

      <div className="mb-6 bg-white rounded-lg shadow">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <TableHeader
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              getSortIcon={(field) => getSortIcon(field, sortField, sortDirection)}
            />
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((item, index) => (
                <TableRow
                  key={`${item["Application ID"]}-${index}`}
                  item={item}
                  index={index}
                  getCountyRowColor={getCountyRowColor}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Summary Information */}
      <AnalysisSummary stats={stats} />
    </div>
  );
};

export default FirstandSecond;
