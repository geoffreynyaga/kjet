import '../App.css';

import { Award, BarChart3, CheckCircle, FileText, MapPin, PieChart as PieChartIcon, TrendingUp, Users, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import React, { useEffect, useState } from 'react';
import BusinessTypePie from './BusinessTypePie.tsx';

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

  useEffect(() => {
    loadNationalSummary();
  }, []);

  const loadNationalSummary = async () => {
    try {
      const response = await fetch('/output-results/national_evaluation_summary.json');
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
      const response = await fetch(`/output-results/${countyName}_evaluation_results.json`);
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
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading KJET Evaluation Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Type guard: ensure nationalSummary is present for the main render
  if (!nationalSummary) {
    return (
      <div className="loading">
        <p>Preparing dashboard...</p>
      </div>
    );
  }

 
  return (
    <div className="app">
      <header className="header">
        <h1>KJET County Evaluation Dashboard</h1>
        <p>Comprehensive evaluation results for Kenya Youth Employment and Talent program</p>
      </header>

      <div className="dashboard-container">
        {/* Sidebar with county list */}
        <div className="sidebar">
          <h3>Counties ({countyList.length})</h3>
          <div className="county-list">
            {countyList.map(county => {
              const countyStats = nationalSummary.county_summaries[county];
              const isSelected = selectedCounty === county;

              return (
                <div
                  key={county}
                  className={`county-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => loadCountyData(county)}
                >
                  <div className="county-name">{county}</div>
                  <div className="county-stats">
                    <span className="apps">{countyStats.total_applications} apps</span>
                    <span className="eligible">{countyStats.eligible_applications} eligible</span>
                    {countyStats.scored_applications > 0 && (
                      <span
                        className="score"
                        title={`Average score: ${countyStats.average_score.toFixed(1)}`}
                        aria-label={`Average score ${countyStats.average_score.toFixed(1)}`}
                        style={{ color: getScoreColor(countyStats.average_score) }}
                      >
                        Avg: {countyStats.average_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content area */}
        <div className="main-content">
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
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(countyData.application_evaluations).map(([appId, appData]) => {
                        const businessName = appData.standardized_business_name || appData.business_name || appData.cluster_name || 'N/A';
                        const businessCategory = (appData as any).business_type || (appData as any).business_category || 'Unknown';

                        return (
                          <tr key={appId}>
                            <td>{appId}</td>
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
        </div>
      </div>
    </div>
  );
}

export default CountiesHome;