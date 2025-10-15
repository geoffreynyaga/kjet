import { Award, BarChart3, CheckCircle, FileText, MapPin, PieChart as PieChartIcon, TrendingUp, Users, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import React, { useEffect, useState } from 'react';

import BusinessTypePie from './BusinessTypePie.tsx';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { s3BaseUrl } from '../utils';

// Interfaces for evaluation data
interface ScoringSummary {
  total_scored: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  score_distribution: {
    excellent_80_100: number;
    good_70_79: number;
    fair_60_69: number;
    poor_below_60: number;
  };
}

interface EligibilitySummary {
  total_applications: number;
  eligible_applications: number;
  ineligible_applications: number;
  eligibility_rate: number;
  criteria_failure_breakdown: Record<string, number>;
}

interface DataEnrichmentSummary {
  applications_with_business_name: number;
  applications_with_standardized_business_name: number;
  applications_with_woman_owned_flag: number;
  applications_with_woman_owned_proof: number;
}

interface ApplicationEvaluation {
  application_id?: string;
  cluster_name?: string;
  business_name?: string;
  standardized_business_name?: string;
  woman_owned?: boolean | string;
  woman_owned_proof?: string;
  eligibility: {
    eligible: boolean;
    criteria_results: Record<string, boolean>;
  };
  scoring?: {
    composite_score: number;
  };
  human_score?: number;
}

interface CountyEvaluation {
  evaluation_metadata: {
    county: string;
    evaluation_date: string;
    rules_version?: string;
  };
  data_enrichment?: DataEnrichmentSummary;
  eligibility_summary: EligibilitySummary;
  scoring_summary: ScoringSummary;
  application_evaluations: Record<string, ApplicationEvaluation>;
}

interface CountySummariesMap {
  [county: string]: {
    total_applications: number;
    eligible_applications: number;
    scored_applications: number;
    average_score: number;
  };
}

interface NationalSummary {
  national_summary: {
    total_applications: number;
    national_eligibility_rate: number;
    national_average_score: number;
  };
  county_summaries: CountySummariesMap;
}

function CountiesHome() {
  const [nationalSummary, setNationalSummary] = useState<NationalSummary | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [countyData, setCountyData] = useState<CountyEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadNationalSummary();
  }, []);

  const loadNationalSummary = async () => {
    try {
      const response = await fetch(`${s3BaseUrl}/static/data/output-results/national_evaluation_summary.json`);
      const data: NationalSummary = await response.json();
      setNationalSummary(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading national summary:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const loadCountyData = async (countyName: string) => {
    try {
      const response = await fetch(`${s3BaseUrl}/static/data/output-results/${countyName}_evaluation_results.json`);
      const data: CountyEvaluation = await response.json();
      console.log(data,"county data")
      setCountyData(data);
      setSelectedCounty(countyName);
    } catch (err) {
      console.error('Error loading county data:', err);
      setError(`Failed to load data for ${countyName}`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00C49F';
    if (score >= 70) return '#0088FE';
    if (score >= 60) return '#FFBB28';
    return '#FF8042';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  // Prepare county list for sidebar
  const countyList = nationalSummary ? Object.keys(nationalSummary.county_summaries).sort() : [];

  // Prepare scoring distribution data for selected county
  const scoringData = countyData?.scoring_summary?.score_distribution ? [
    { name: 'Excellent (80-100)', value: countyData.scoring_summary.score_distribution.excellent_80_100 || 0, color: '#00C49F' },
    { name: 'Good (70-79)', value: countyData.scoring_summary.score_distribution.good_70_79 || 0, color: '#0088FE' },
    { name: 'Fair (60-69)', value: countyData.scoring_summary.score_distribution.fair_60_69 || 0, color: '#FFBB28' },
    { name: 'Poor (<60)', value: countyData.scoring_summary.score_distribution.poor_below_60 || 0, color: '#FF8042' }
  ] : [];


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-4 loading-spinner"></div>
          <p className="text-lg text-gray-600">Loading KJET Evaluation Dashboard...</p>
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
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </motion.div>
    );
  }

  // Type guard: ensure nationalSummary is present for the main render
  if (!nationalSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-lg text-gray-600">Preparing dashboard...</p>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <motion.header
        className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">KJET County Evaluation Dashboard</h1>
          <p className="text-xl text-gray-600">Comprehensive evaluation results for Kenya Youth Employment and Talent program</p>
        </div>
      </motion.header>

      <div className="flex mx-auto max-w-7xl">
        {/* Sidebar with county list */}
        <motion.div
          className="sticky top-0 h-screen overflow-y-auto bg-white shadow-lg w-80"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Counties ({countyList.length})</h3>
          </div>
          <div className="p-4 space-y-2">
            {countyList.map((county, index) => {
              const countyStats = nationalSummary.county_summaries[county];
              const isSelected = selectedCounty === county;

              return (
                <motion.div
                  key={county}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => loadCountyData(county)}
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
                      <span className="font-medium text-blue-600">{countyStats.total_applications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Eligible:</span>
                      <span className="font-medium text-green-600">{countyStats.eligible_applications}</span>
                    </div>
                    {countyStats.scored_applications > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Score:</span>
                        <span
                          className="font-medium"
                          title={`Average score: ${countyStats.average_score.toFixed(1)}`}
                          style={{ color: getScoreColor(countyStats.average_score) }}
                        >
                          {countyStats.average_score.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Main content area */}
        <motion.div
          className="flex-1 p-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {selectedCounty && countyData ? (
            <>
              {/* County Header */}
              <div className="county-header">
                <h2>{selectedCounty} County Evaluation Results</h2>
                <div className="county-meta">
                  <span>Evaluation Date: {new Date(countyData.evaluation_metadata.evaluation_date).toLocaleDateString()}</span>
                  <span>Rules Version: {countyData.evaluation_metadata.rules_version}</span>
                </div>
              </div>

              {/* County Statistics Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <FileText size={24} />
                  </div>
                  <div className="stat-content">
                    <h3>Total Applications</h3>
                    <p className="stat-number">{countyData.eligibility_summary.total_applications}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <CheckCircle size={24} />
                  </div>
                  <div className="stat-content">
                    <h3>Eligible Applications</h3>
                    <p className="stat-number">{countyData.eligibility_summary.eligible_applications}</p>
                    <p className="stat-subtitle">{countyData.eligibility_summary.eligibility_rate}% rate</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <XCircle size={24} />
                  </div>
                  <div className="stat-content">
                    <h3>Ineligible Applications</h3>
                    <p className="stat-number">{countyData.eligibility_summary.ineligible_applications}</p>
                  </div>
                </div>

                {/* Woman-owned percentage card */}
                <div className="stat-card">
                  <div className="stat-icon">
                    <Users size={24} />
                  </div>
                  <div className="stat-content">
                    <h3>Woman-owned</h3>
                    {(() => {
                      const apps = Object.values(countyData.application_evaluations);
                      const wom = apps.filter(a => {
                        const v = (a as any).woman_owned;
                        if (typeof v === 'string') return v.toLowerCase().includes('yes') || v.toLowerCase().includes('true');
                        return v === true;
                      }).length;
                      const total = apps.length || 1;
                      const pct = Math.round((wom / total) * 100 * 10) / 10;
                      return (
                        <>
                          <p className="stat-number">{wom} ({pct}%)</p>
                          <p className="stat-subtitle">of applications declared woman-owned</p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {countyData.scoring_summary.total_scored > 0 && (
                  <div className="stat-card">
                    <div className="stat-icon">
                      <Award size={24} />
                    </div>
                    <div className="stat-content">
                      <h3>Average Score</h3>
                      <p className="stat-number" style={{ color: getScoreColor(countyData.scoring_summary.average_score) }}>
                        {countyData.scoring_summary.average_score.toFixed(1)}
                      </p>
                      <p className="stat-subtitle">{getScoreGrade(countyData.scoring_summary.average_score)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Eligibility Failure Breakdown */}
              {countyData.eligibility_summary.ineligible_applications > 0 && (
                <div className="chart-card">
                  <h3>Eligibility Failure Reasons</h3>
                  <div className="failure-breakdown">
                    {Object.entries(countyData.eligibility_summary.criteria_failure_breakdown).map(([criterion, count]) => (
                      count > 0 && (
                        <div key={criterion} className="failure-item">
                          <span className="criterion">{criterion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span className="count">{count} applications</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Scoring Distribution Chart and Business Type Pie Chart */}
              <div className="charts-row">
                {scoringData.length > 0 && scoringData.some(item => item.value > 0) && (
                  <div className="chart-card" style={{ flex: 1 }}>
                    <h3>Application Scoring Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={scoringData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8">
                          {scoringData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Business types pie chart */}
                <div className="chart-card" style={{ width: 360, marginLeft: 16 }}>
                  <h3>Business Types</h3>
                  {(() => {
                    // Build distribution of business types from application evaluations
                    const apps = Object.values(countyData.application_evaluations) as ApplicationEvaluation[];
                    const counts: Record<string, number> = {};
                    apps.forEach(a => {
                      const t = (a as any).business_type || (a as any).business_category || 'Unknown';
                      counts[t] = (counts[t] || 0) + 1;
                    });
                    const pieData = Object.entries(counts).map(([name, value]) => ({ name, value }));

                    return <BusinessTypePie items={pieData} width="100%" height={300} />;
                  })()}
                </div>
              </div>

              {/* Applications Table */}
                {/* Score Filter */}
                <div className="flex items-center gap-4 mb-4">
                <label htmlFor="scoreFilter" className="font-medium text-gray-700">Filter by Score:</label>
                <select
                  id="scoreFilter"
                  className="px-2 py-1 border rounded"
                  value={scoreFilter}
                  onChange={e => setScoreFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="excellent">Excellent (80-100)</option>
                  <option value="good">Good (70-79)</option>
                  <option value="fair">Fair (60-69)</option>
                  <option value="poor">Poor (&lt;60)</option>
                  <option value="scored">Scored Only</option>
                  <option value="unscored">Unscored Only</option>
                </select>
                </div>

                <div className="applications-table">
                <h3>Application Details</h3>
                <div className="table-container">
                  <table>
                  <thead>
                    <tr>
                    <th>Application ID</th>
                    <th>Business Name</th>
                    <th>Business Category</th>
                    <th>Eligible</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Human Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(countyData.application_evaluations)
                    .filter(([_, appData]) => {
                      if (scoreFilter === 'all') return true;
                      if (scoreFilter === 'scored') return !!appData.scoring;
                      if (scoreFilter === 'unscored') return !appData.scoring;
                      if (!appData.scoring) return false;
                      const score = appData.scoring.composite_score;
                      if (scoreFilter === 'excellent') return score >= 80;
                      if (scoreFilter === 'good') return score >= 70 && score < 80;
                      if (scoreFilter === 'fair') return score >= 60 && score < 70;
                      if (scoreFilter === 'poor') return score < 60;
                      return true;
                    })
                    .map(([appId, appData]) => {
                      const businessName = appData.standardized_business_name || appData.business_name || appData.cluster_name || 'N/A';
                      const businessCategory = (appData as any).business_type || (appData as any).business_category || 'Unknown';

                      return (
                      <tr key={appId}>
                        <td>
                          <button
                            onClick={() => navigate(`/counties/${appId}`)}
                            className="font-medium text-blue-600 underline hover:text-blue-800"
                          >
                            {appId}
                          </button>
                        </td>
                        <td>{businessName}</td>
                        <td>{businessCategory}</td>
                        <td>
                        <span className={`status ${appData.eligibility.eligible ? 'eligible' : 'ineligible'}`}>
                          {appData.eligibility.eligible ? '✓' : '✗'}
                        </span>
                        </td>
                        <td>
                        {appData.scoring ? (
                          <span style={{ color: getScoreColor(appData.scoring.composite_score) }}>
                          {appData.scoring.composite_score.toFixed(1)}
                          </span>
                        ) : '-'}
                        </td>
                        <td>
                        {appData.scoring ? getScoreGrade(appData.scoring.composite_score) : '-'}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="w-20 px-2 py-1 border rounded"
                            value={appData.human_score || ''}
                            onChange={async (e) => {
                              const newScore = parseFloat(e.target.value);
                              const updatedAppData = { ...appData, human_score: newScore };

                              // Update the local state
                              setCountyData((prevData) => {
                                if (!prevData) return prevData;
                                const updatedEvaluations = {
                                  ...prevData.application_evaluations,
                                  [appId]: updatedAppData,
                                };
                                return { ...prevData, application_evaluations: updatedEvaluations };
                              });

                              // Update the upstream JSON file
                              try {
                                await fetch(`${s3BaseUrl}/static/data/output-results/${selectedCounty}_evaluation_results.json`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedAppData),
                                });
                              } catch (err) {
                                console.error('Failed to update human score:', err);
                              }
                            }}
                          />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
                </div>
            </>
          ) : (
            <div className="welcome-message">
              <MapPin size={48} />
              <h2>Select a County</h2>
              <p>Click on a county from the list on the left to view detailed evaluation results, eligibility analysis, and application scores.</p>
              <div className="national-overview">
                <h3>National Overview</h3>
                <div className="overview-stats">
                  <div className="overview-stat">
                    <span className="label">Total Applications:</span>
                    <span className="value">{nationalSummary.national_summary.total_applications}</span>
                  </div>
                  <div className="overview-stat">
                    <span className="label">National Eligibility Rate:</span>
                    <span className="value">{nationalSummary.national_summary.national_eligibility_rate}%</span>
                  </div>
                  <div className="overview-stat">
                    <span className="label">National Average Score:</span>
                    <span className="value" style={{ color: getScoreColor(nationalSummary.national_summary.national_average_score) }}>
                      {nationalSummary.national_summary.national_average_score.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default CountiesHome;
