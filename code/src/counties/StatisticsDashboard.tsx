import { AlertTriangle, Award, Building, MapPin, Star, Target, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import React, { useEffect, useState } from 'react';

import { motion } from 'framer-motion';

interface StatisticsApplicant {
  [key: string]: any;
}

interface CountyStats {
  county: string;
  totalApplications: number;
  passedApplications: number;
  failedApplications: number;
  passRate: number;
  averageScore: number;
  businessTypes: { [key: string]: number };
  womenOwnedCount: number;
  totalScores: number[];
  topScore: number;
  tier1Count: number;
  tier2Count: number;
}

interface NationalStats {
  totalApplications: number;
  totalPassed: number;
  totalFailed: number;
  overallPassRate: number;
  averageScore: number;
  businessTypeDistribution: { name: string; value: number; percentage: number }[];
  countyDistribution: { county: string; applications: number; passRate: number }[];
  scoreDistribution: { range: string; count: number }[];
  womenOwnedStats: { owned: number; notOwned: number; percentage: number };
  tierDistribution: { tier1: number; tier2: number; untiered: number };
  topPerformingCounties: { county: string; passRate: number; avgScore: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function StatisticsDashboard() {
  const [data, setData] = useState<StatisticsApplicant[]>([]);
  const [nationalStats, setNationalStats] = useState<NationalStats | null>(null);
  const [countyStats, setCountyStats] = useState<CountyStats[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatisticsData();
  }, []);

  const loadStatisticsData = async () => {
    try {
      setLoading(true);
      const resp = await fetch('/kjet-human.json');
      const data: StatisticsApplicant[] = await resp.json();
      
      // Load women-owned data from county JSON files
      const womenOwnedData = await loadWomenOwnedData();
      
      setData(data);
      
      // Calculate national statistics with women-owned data
      const nationalStats = calculateNationalStats(data, womenOwnedData);
      setNationalStats(nationalStats);
      
      // Calculate county statistics with women-owned data
      const countyStats = calculateCountyStats(data, womenOwnedData);
      setCountyStats(countyStats);
      
      setLoading(false);
    } catch (e: any) {
      console.error('Error loading statistics data:', e);
      setError(String(e));
      setLoading(false);
    }
  };

  const loadWomenOwnedData = async (): Promise<{ [key: string]: string }> => {
    const womenOwnedMap: { [key: string]: string } = {};
    
    // List of counties to load data from
    const counties = [
      'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeiyo Marakwet', 'Embu', 'Garissa',
      'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
      'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
      'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
      'Murang\'a', 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
      'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta', 'Tana River', 'Tharaka Nithi',
      'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ];

    try {
      const promises = counties.map(async (county) => {
        try {
          const response = await fetch(`/output-results/${county}_evaluation_results.json`);
          if (!response.ok) return;
          
          const countyData = await response.json();
          const applications = countyData.application_evaluations || {};
          
          Object.entries(applications).forEach(([appId, appData]: [string, any]) => {
            if (appData.woman_owned) {
              // Map from county format (e.g., "Busia_158") to applicant format (e.g., "Applicant_158")
              const applicantId = appId.replace(/^[^_]+_/, 'Applicant_');
              womenOwnedMap[applicantId] = appData.woman_owned;
              // Also store the original format in case it's needed
              womenOwnedMap[appId] = appData.woman_owned;
            }
          });
        } catch (error) {
          console.warn(`Failed to load data for county: ${county}`, error);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error loading women-owned data:', error);
    }

    return womenOwnedMap;
  };

  const calculateNationalStats = (data: StatisticsApplicant[], womenOwnedData: { [key: string]: string } = {}): NationalStats => {
    const totalApplications = data.length;
    const passedApps = data.filter(app => String(app['PASS/FAIL'] || '').toLowerCase() === 'pass');
    const totalPassed = passedApps.length;
    const totalFailed = totalApplications - totalPassed;
    const overallPassRate = totalApplications > 0 ? (totalPassed / totalApplications) * 100 : 0;

    // Average score calculation
    const scores = passedApps
      .map(app => Number(app['Sum of weighted scores - Penalty(if any)']) || 0)
      .filter(score => score > 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Business type distribution
    const businessTypes: { [key: string]: number } = {};
    data.forEach(app => {
      const type = app['E3. Priority Value Chain'] || 'Unknown';
      businessTypes[type] = (businessTypes[type] || 0) + 1;
    });
    
    const businessTypeDistribution = Object.entries(businessTypes)
      .map(([name, value]) => ({
        name,
        value,
        percentage: (value / totalApplications) * 100
      }))
      .sort((a, b) => b.value - a.value);

    // County distribution
    const countyApps: { [key: string]: { total: number; passed: number } } = {};
    data.forEach(app => {
      const county = app['mapping'] || app['E2. County Mapping'] || 'Unknown';
      if (!countyApps[county]) {
        countyApps[county] = { total: 0, passed: 0 };
      }
      countyApps[county].total++;
      if (String(app['PASS/FAIL'] || '').toLowerCase() === 'pass') {
        countyApps[county].passed++;
      }
    });

    const countyDistribution = Object.entries(countyApps)
      .map(([county, stats]) => ({
        county,
        applications: stats.total,
        passRate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.applications - a.applications);

    // Score distribution
    const scoreRanges = [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '60-69', count: 0 },
      { range: '50-59', count: 0 },
      { range: '0-49', count: 0 }
    ];
    
    scores.forEach(score => {
      if (score >= 90) scoreRanges[0].count++;
      else if (score >= 80) scoreRanges[1].count++;
      else if (score >= 70) scoreRanges[2].count++;
      else if (score >= 60) scoreRanges[3].count++;
      else if (score >= 50) scoreRanges[4].count++;
      else scoreRanges[5].count++;
    });

    // Women owned statistics using county JSON data
    const womenOwnedApps = data.filter(app => {
      const appId = app['Application ID'];
      if (appId && womenOwnedData[appId]) {
        return String(womenOwnedData[appId]).toLowerCase() === 'yes';
      }
      // Fallback to CSV fields if available
      return String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'yes' ||
             String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'true';
    });
    const womenOwnedStats = {
      owned: womenOwnedApps.length,
      notOwned: totalApplications - womenOwnedApps.length,
      percentage: totalApplications > 0 ? (womenOwnedApps.length / totalApplications) * 100 : 0
    };

    // Tier distribution
    const tier1 = data.filter(app => String(app['TIERS'] || '').includes('Tier 1')).length;
    const tier2 = data.filter(app => String(app['TIERS'] || '').includes('Tier 2')).length;
    const tierDistribution = {
      tier1,
      tier2,
      untiered: totalApplications - tier1 - tier2
    };

    // Top performing counties
    const topPerformingCounties = countyDistribution
      .filter(county => county.applications >= 5) // Minimum threshold
      .map(county => {
        const countyApps = data.filter(app => 
          (app['mapping'] || app['E2. County Mapping'] || 'Unknown') === county.county
        );
        const countyScores = countyApps
          .filter(app => String(app['PASS/FAIL'] || '').toLowerCase() === 'pass')
          .map(app => Number(app['Sum of weighted scores - Penalty(if any)']) || 0)
          .filter(score => score > 0);
        const avgScore = countyScores.length > 0 ? 
          countyScores.reduce((a, b) => a + b, 0) / countyScores.length : 0;
        
        return {
          county: county.county,
          passRate: county.passRate,
          avgScore
        };
      })
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, 10);

    return {
      totalApplications,
      totalPassed,
      totalFailed,
      overallPassRate,
      averageScore,
      businessTypeDistribution,
      countyDistribution,
      scoreDistribution: scoreRanges,
      womenOwnedStats,
      tierDistribution,
      topPerformingCounties
    };
  };

  const calculateCountyStats = (data: StatisticsApplicant[], womenOwnedData: { [key: string]: string } = {}): CountyStats[] => {
    const countyGroups: { [key: string]: StatisticsApplicant[] } = {};
    
    data.forEach(app => {
      const county = app['mapping'] || app['E2. County Mapping'] || 'Unknown';
      if (!countyGroups[county]) {
        countyGroups[county] = [];
      }
      countyGroups[county].push(app);
    });

    return Object.entries(countyGroups).map(([county, apps]) => {
      const totalApplications = apps.length;
      const passedApps = apps.filter(app => String(app['PASS/FAIL'] || '').toLowerCase() === 'pass');
      const passedApplications = passedApps.length;
      const failedApplications = totalApplications - passedApplications;
      const passRate = totalApplications > 0 ? (passedApplications / totalApplications) * 100 : 0;

      const scores = passedApps
        .map(app => Number(app['Sum of weighted scores - Penalty(if any)']) || 0)
        .filter(score => score > 0);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const topScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Business types in this county
      const businessTypes: { [key: string]: number } = {};
      apps.forEach(app => {
        const type = app['E3. Priority Value Chain'] || 'Unknown';
        businessTypes[type] = (businessTypes[type] || 0) + 1;
      });

      const womenOwnedCount = apps.filter(app => {
        const appId = app['Application ID'];
        if (appId && womenOwnedData[appId]) {
          return String(womenOwnedData[appId]).toLowerCase() === 'yes';
        }
        // Fallback to CSV fields if available
        return String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'yes' ||
               String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'true';
      }).length;

      const tier1Count = apps.filter(app => String(app['TIERS'] || '').includes('Tier 1')).length;
      const tier2Count = apps.filter(app => String(app['TIERS'] || '').includes('Tier 2')).length;

      return {
        county,
        totalApplications,
        passedApplications,
        failedApplications,
        passRate,
        averageScore,
        businessTypes,
        womenOwnedCount,
        totalScores: scores,
        topScore,
        tier1Count,
        tier2Count
      };
    }).sort((a, b) => b.totalApplications - a.totalApplications);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto mb-4 loading-spinner" />
          <p className="text-lg text-gray-600">Loading statistics...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const selectedCountyData = selectedCounty ? 
    countyStats.find(county => county.county === selectedCounty) : null;

  return (
    <div className="min-h-screen bg-gray-50">
     

      <div className="p-8 mx-auto max-w-7xl">
        {/* National Overview Cards */}
        {nationalStats && (
          <motion.div 
            className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-3xl font-bold text-gray-900">{nationalStats.totalApplications.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Pass Rate</p>
                  <p className="text-3xl font-bold text-green-600">{nationalStats.overallPassRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">{nationalStats.totalPassed} passed</p>
                </div>
                <Award className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-3xl font-bold text-purple-600">{nationalStats.averageScore.toFixed(1)}</p>
                  <p className="text-sm text-gray-500">Among passed applications</p>
                </div>
                <Star className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Counties Covered</p>
                  <p className="text-3xl font-bold text-orange-600">47</p>
                  <p className="text-sm text-gray-500">Across Kenya</p>
                </div>
                <MapPin className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </motion.div>
        )}

        {/* First Row - Charts */}
        <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-3">
          {/* Business Type Distribution */}
          {nationalStats && (
            <motion.div 
              className="p-6 bg-white rounded-lg shadow-sm"
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Business Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={nationalStats.businessTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {nationalStats.businessTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Score Distribution */}
          {nationalStats && (
            <motion.div 
              className="p-6 bg-white rounded-lg shadow-sm"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nationalStats.scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Top Performing Counties */}
          {nationalStats && (
            <motion.div 
              className="p-6 bg-white rounded-lg shadow-sm"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Performing Counties</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nationalStats.topPerformingCounties}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="county" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="passRate" fill="#10B981" name="Pass Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>

        {/* Second Row - County Analysis (75% width) */}
        <div className="flex justify-center">
          <motion.div 
            className="w-full max-w-6xl p-6 bg-white rounded-lg shadow-sm"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.8, duration: 0.6 }}
            style={{ width: '75%' }}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">County Analysis</h3>
            <select
              value={selectedCounty || ''}
              onChange={(e) => setSelectedCounty(e.target.value || null)}
              className="w-full max-w-md p-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-600">Applications</p>
                    <p className="text-2xl font-bold">{selectedCountyData.totalApplications}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50">
                    <p className="text-sm text-gray-600">Pass Rate</p>
                    <p className="text-2xl font-bold text-green-600">{selectedCountyData.passRate.toFixed(1)}%</p>
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
                      <div className="p-3 rounded-lg bg-blue-50">
                        <p className="text-sm text-gray-600">Women-Owned Businesses</p>
                        <p className="text-xl font-bold text-blue-600">
                          {selectedCountyData.womenOwnedCount} 
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({((selectedCountyData.womenOwnedCount / selectedCountyData.totalApplications) * 100).toFixed(1)}%)
                          </span>
                        </p>
                      </div>
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
      </div>
    </div>
  );
}

export default StatisticsDashboard;