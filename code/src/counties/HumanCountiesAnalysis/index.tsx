import React from 'react';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';

// Import custom hooks
import { useHumanData, useCountySelection, useApplicantCategories } from './hooks/index.ts';

// Import components
import CountyList from './components/CountyList.tsx';
import TopRankedCandidates from './components/TopRankedCandidates.tsx';
import PendingReview from './components/PendingReview.tsx';
import OtherRankedCandidates from './components/OtherRankedCandidates.tsx';
import FailedApplicants from './components/FailedApplicants.tsx';
import { LoadingSpinner, ErrorDisplay, EmptyState } from './components/LoadingAndError.tsx';

function HumanCountiesAnalysis() {
  // Custom hooks for data management
  const { groups, loading, error } = useHumanData();
  const { selectedCounty, setSelectedCounty, expandedRanks, setExpandedRanks, toggleExpand } = useCountySelection(groups);

  // Find current group and categorize applicants
  const currentGroup = groups.find((g) => g.county === selectedCounty) || null;
  const { topTwo, pending, failed, otherRanked } = useApplicantCategories(currentGroup);

  // Handle county selection
  const handleCountySelect = (county: string) => {
    setSelectedCounty(county);
    setExpandedRanks(new Set([1, 2]));
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="mb-2 text-4xl font-bold text-gray-900">Final Evaluations Dashboard</h1>
              <p className="text-xl text-gray-600">Final-scored applicant results grouped by county</p>
            </div>
            <div className="flex-shrink-0">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-100 transition-all duration-150 bg-red-500 border border-gray-300 rounded-lg shadow-sm hover:bg-red-300 hover:border-gray-400"
              >
                <Home size={16} />
                Home
              </a>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex mx-auto max-w-7xl">
        {/* County List Sidebar */}
        <CountyList
          groups={groups}
          selectedCounty={selectedCounty}
          onCountySelect={handleCountySelect}
        />

        {/* Main Content Area */}
        <motion.div
          className="flex-1 p-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {currentGroup ? (
            <>
              {/* Top Ranked Candidates */}
              <TopRankedCandidates
                topTwo={topTwo}
                currentGroup={currentGroup}
                expandedRanks={expandedRanks}
                onToggleExpand={toggleExpand}
              />

              {/* Pending Review */}
              <PendingReview pending={pending} />

              {/* Other Ranked Candidates */}
              <OtherRankedCandidates
                otherRanked={otherRanked}
                currentGroup={currentGroup}
              />

              {/* Failed Applicants */}
              <FailedApplicants failed={failed} />
            </>
          ) : (
            <EmptyState />
          )}
        </motion.div>
      </div>
    </div>
  );
}
export default HumanCountiesAnalysis;


