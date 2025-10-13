import React from 'react';
import { useStatisticsData, useCountySelection } from './hooks/index.ts';
import {
  NationalOverviewCards,
  BusinessTypeDistribution,
  ScoreDistribution,
  TopPerformingCounties,
  CountyAnalysis,
  LoadingSpinner,
  ErrorDisplay
} from './components/index.ts';

function StatisticsDashboard() {
  const { data, nationalStats, countyStats, loading, error } = useStatisticsData();
  const { selectedCounty, setSelectedCounty, selectedCountyData } = useCountySelection(countyStats);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 mx-auto max-w-7xl">
        {/* National Overview Cards */}
        {nationalStats && <NationalOverviewCards nationalStats={nationalStats} />}

        {/* First Row - Charts */}
        <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-2">
          {/* Business Type Distribution */}
          {nationalStats && <BusinessTypeDistribution nationalStats={nationalStats} />}

          {/* Score Distribution */}
          {nationalStats && <ScoreDistribution nationalStats={nationalStats} />}

          {/* Top Performing Counties */}
          {nationalStats && <TopPerformingCounties nationalStats={nationalStats} />}

          {/* County Analysis */}
          <CountyAnalysis
            countyStats={countyStats}
            selectedCounty={selectedCounty}
            selectedCountyData={selectedCountyData || null}
            onCountyChange={setSelectedCounty}
          />
        </div>
      </div>
    </div>
  );
}

export default StatisticsDashboard;
