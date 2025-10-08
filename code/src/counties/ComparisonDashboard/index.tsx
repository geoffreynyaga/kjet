import React, { useEffect, useState } from 'react';
import { Home, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HumanApplicant } from './types.ts';
import { filterHumanDataByCounty } from './utils.ts';
import CountyComparisonView from './CountyComparisonView.tsx';

function ComparisonDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [humanData, setHumanData] = useState<HumanApplicant[]>([]);
  const [availableCounties, setAvailableCounties] = useState<string[]>([]);

  useEffect(() => {
    loadHumanData();
  }, []);

  const loadHumanData = async () => {
    try {
      setLoading(true);

      // Load human data
      const humanResponse = await fetch('/kjet-human.json');
      const data: HumanApplicant[] = await humanResponse.json();
      setHumanData(data);

      // Get unique counties from human data
      const counties = new Set<string>();
      data.forEach(app => {
        const appCounty = app['mapping'] || app['E2. County Mapping'] || '';
        if (appCounty && appCounty !== 'UNKNOWN') {
          counties.add(appCounty);
        }
      });

      const countiesList = Array.from(counties).sort();
      setAvailableCounties(countiesList);

      if (countiesList.length > 0) {
        setSelectedCounty(countiesList[0]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading human data:', err);
      setError('Failed to load human evaluation data');
      setLoading(false);
    }
  };

  const getCountyStats = (county: string) => {
    const countyData = filterHumanDataByCounty(humanData, county);
    const totalApplications = countyData.length;
    const passedApplications = countyData.filter(app =>
      (app['PASS/FAIL'] || '').toLowerCase() === 'pass'
    ).length;

    return {
      totalApplications,
      passedApplications,
      failedApplications: totalApplications - passedApplications,
      passRate: totalApplications > 0 ? (passedApplications / totalApplications * 100) : 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto mb-4 loading-spinner" />
          <p className="text-lg text-gray-600">Loading comparison data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen bg-gray-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </motion.div>
    );
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
            <div>
              <h1 className="mb-2 text-4xl font-bold text-gray-900">Human vs Algorithm Comparison</h1>
              <p className="text-xl text-gray-600">Compare human evaluations with machine-generated results</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Home size={20} />
              Home
            </button>
          </div>
        </div>
      </motion.header>

      <div className="flex mx-auto max-w-7xl">
        {/* County Sidebar */}
        <motion.div
          className="sticky top-0 h-screen overflow-y-auto bg-white shadow-lg w-80"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Counties ({availableCounties.length})</h3>
          </div>
          <div className="p-4 space-y-2">
            {availableCounties.map((county, index) => {
              const isSelected = selectedCounty === county;
              const stats = getCountyStats(county);

              return (
                <motion.div
                  key={county}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCounty(county)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.02, duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mb-2 font-semibold text-gray-900">{county}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Applications:</span>
                      <span className="font-medium">{stats.totalApplications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passed:</span>
                      <span className="font-medium text-green-600">{stats.passedApplications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failed:</span>
                      <span className="font-medium text-red-600">{stats.failedApplications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pass Rate:</span>
                      <span className={`font-medium ${stats.passRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.passRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {selectedCounty ? (
            <CountyComparisonView
              county={selectedCounty}
              humanData={humanData}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Users size={48} className="mx-auto mb-4" />
                <h3 className="text-lg font-medium">Select a County</h3>
                <p>Choose a county from the sidebar to view the comparison details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparisonDashboard;