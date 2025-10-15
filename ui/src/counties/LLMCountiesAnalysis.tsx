import { Award, BarChart3, CheckCircle, ChevronDown, ChevronRight, FileText, MapPin, PieChart as PieChartIcon, Star, Target, TrendingUp, Users, XCircle, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import React, { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { s3BaseUrl } from '../utils';

interface ScoreBreakdown {
  score: number;
  reason: string;
}

interface ApplicantScoreBreakdown {
  [criterion: string]: ScoreBreakdown;
}

interface RankedApplicant {
  rank: number;
  application_id: string;
  applicant_name: string;
  eligibility_status: string;
  composite_score: number;
  score_breakdown: ApplicantScoreBreakdown;
}

interface IneligibleApplicant {
  application_id: string;
  applicant_name: string;
  eligibility_status: string;
  ineligibility_criterion_failed: string;
  reason: string;
}

interface LLMAnalysisData {
  report_title: string;
  selection_criteria_weights: { [key: string]: number };
  ranked_applicants: RankedApplicant[];
  ineligible_applicants: IneligibleApplicant[];
}

interface CountyAnalysis {
  county: string;
  data: LLMAnalysisData;
}

function LLMCountiesAnalysis() {
  const [analyses, setAnalyses] = useState<CountyAnalysis[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [countyData, setCountyData] = useState<LLMAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedApplicants, setExpandedApplicants] = useState<Set<number>>(new Set());
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading Analysis Dashboard...');
  const applicationsPerPage = 5;

  useEffect(() => {
    loadLLMAnalyses();
  }, []);

  const loadLLMAnalyses = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Loading  Analysis Dashboard...');

      // Fetch the list of available counties
      const countiesResponse = await fetch(`${s3BaseUrl}/static/data/counties.json`);
      const countiesData = await countiesResponse.json();
      const availableCounties = countiesData.counties;

      // Load all county data
      const analyses: CountyAnalysis[] = [];
      const failedCounties: string[] = [];

      for (let i = 0; i < availableCounties.length; i++) {
        const county = availableCounties[i];
        setLoadingMessage(`Loading ${county} County... (${i + 1}/${availableCounties.length})`);
        try {
          // Convert county name to filename format (lowercase, spaces preserved, apostrophes removed)
          const filename = county.toLowerCase().replace(/'/g, '');
          console.log(`Attempting to fetch: /gemini/${filename}.json for county: ${county}`);

          const response = await fetch(`${s3BaseUrl}/static/data/gemini/${filename}.json`);

          // Check if response is ok and content type is JSON
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText} for /gemini/${filename}.json`);
          }

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            // This is likely a 404 page or error page
            throw new Error(`Received HTML instead of JSON for /gemini/${filename}.json - file may not exist`);
          }

          const rawData = await response.json();

          // Transform the data structure to match our interface
          let data: LLMAnalysisData;

          if (rawData.applications) {
            // New format: has 'applications' array with mixed eligible/ineligible
            const eligible = rawData.applications.filter((app: any) => app.eligibility_status === 'ELIGIBLE');
            const ineligible = rawData.applications.filter((app: any) => app.eligibility_status === 'INELIGIBLE');

            data = {
              report_title: rawData.report_title || '',
              selection_criteria_weights: rawData.selection_criteria_weights || {},
              ranked_applicants: eligible,
              ineligible_applicants: ineligible
            };
          } else {
            // Old format: already has separate arrays
            data = rawData as LLMAnalysisData;
          }

          // Ensure the data has the expected structure
          if (!data.ranked_applicants) {
            data.ranked_applicants = [];
          }
          if (!data.ineligible_applicants) {
            data.ineligible_applicants = [];
          }

          analyses.push({
            county: county,
            data: data
          });
          console.log(`Successfully loaded data for ${county}`);
        } catch (err) {
          console.warn(`Failed to load data for ${county}:`, err);
          failedCounties.push(county);
          // Continue with other counties even if one fails
        }
      }

      console.log(`Successfully loaded ${analyses.length} counties, failed: ${failedCounties.length}`, failedCounties);

      setLoadingMessage('Finalizing dashboard...');

      if (analyses.length > 0) {
        setAnalyses(analyses);
        setSelectedCounty(analyses[0].county);
        setCountyData(analyses[0].data);
        // Set the first ranked applicant (rank 1) as expanded by default
        setExpandedApplicants(new Set([1]));
      } else {
        console.error('No county data could be loaded. Please check that JSON files exist in /public/gemini/');
        setError(`No county data could be loaded. Failed counties: ${failedCounties.join(', ')}`);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading LLM analyses:', err);
      setError('Failed to load LLM analysis data');
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return '#00C49F';
    if (score >= 4.0) return '#0088FE';
    if (score >= 3.5) return '#FFBB28';
    return '#FF8042';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 4.0) return 'Very Good';
    if (score >= 3.5) return 'Good';
    return 'Fair';
  };

  const formatCriterionName = (criterion: string) => {
    return criterion.replace(/_/g, ' ').replace(/\d+%/g, '').trim();
  };

  const toggleApplicantExpansion = (rank: number) => {
    const newExpanded = new Set(expandedApplicants);
    if (newExpanded.has(rank)) {
      newExpanded.delete(rank);
    } else {
      newExpanded.add(rank);
    }
    setExpandedApplicants(newExpanded);
  };

  const nextPage = () => {
    if (countyData && countyData.ranked_applicants && (currentPage + 1) * applicationsPerPage < countyData.ranked_applicants.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getCurrentPageApplicants = () => {
    if (!countyData || !countyData.ranked_applicants) return [];
    const startIndex = currentPage * applicationsPerPage;
    const endIndex = startIndex + applicationsPerPage;
    return countyData.ranked_applicants.slice(startIndex, endIndex);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-gray-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-4 loading-spinner"></div>
          <p className="text-lg text-gray-600">{loadingMessage}</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="flex items-center justify-center w-full min-h-screen bg-gray-50"
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

  return (
    <div className="w-full min-h-screen bg-gray-50">
            <motion.header
        className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex-1">
            <h1 className="mb-2 text-4xl font-bold text-gray-900"> Counties Analysis Dashboard</h1>
            <p className="text-xl text-gray-600">AI-powered evaluation and ranking of KJET applications</p>
          </div>
          {selectedCounty && countyData && (
            <div className="max-w-4xl p-4 mt-6 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-semibold tracking-wide text-blue-900 uppercase">{selectedCounty} County - Selection Criteria</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
                {Object.entries(countyData.selection_criteria_weights).map(([criterion, weight]) => (
                  <div key={criterion} className="px-3 py-2 bg-white border border-blue-100 rounded-md shadow-sm">
                    <div className="text-xs font-medium text-gray-600 truncate" title={formatCriterionName(criterion)}>
                      {formatCriterionName(criterion)}
                    </div>
                    <div className="mt-1 text-sm font-bold text-blue-600">
                      {Math.round(weight * 100)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-blue-700">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Weights determine scoring priority</span>
              </div>
            </div>
          )}
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
            <h3 className="text-xl font-bold text-gray-900">Analyzed Counties ({analyses.length})</h3>
          </div>
          <div className="p-4 space-y-2">
            {analyses.map((analysis, index) => {
              const isSelected = selectedCounty === analysis.county;

              return (
                <motion.div
                  key={analysis.county}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedCounty(analysis.county);
                    setCountyData(analysis.data);
                    setCurrentPage(0);
                    // Set the first ranked applicant (rank 1) as expanded by default
                    setExpandedApplicants(new Set([1]));
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.02, duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mb-2 font-semibold text-gray-900">{analysis.county} County</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium text-blue-600">{analysis.data.ranked_applicants?.length || 0}</span>
                    </div>
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
                <h2>{selectedCounty} County Analysis</h2>
              </div>              {/* Top Two Ranked Candidates with Accordion */}
              {countyData.ranked_applicants && countyData.ranked_applicants.length >= 2 && (
                <div className="mb-8 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-green-900">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Top Ranked Candidates
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {countyData.ranked_applicants?.slice(0, 2).map((applicant, index) => (
                      <motion.div
                        key={applicant.application_id}
                        className="transition-all duration-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <div
                          className="flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-gray-50 group"
                          onClick={() => toggleApplicantExpansion(applicant.rank)}
                        >
                          <div className="flex items-center flex-1 gap-4">
                            <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-full shadow-sm bg-gradient-to-br from-red-500 to-red-600">
                              #{applicant.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{applicant.applicant_name}</h4>
                              <p className="text-sm text-gray-600">ID: {applicant.application_id}</p>
                            </div>
                            <div className="text-right">
                              <div
                                className="inline-block px-3 py-1 mb-1 text-sm font-bold text-white rounded-lg shadow-sm"
                                style={{ backgroundColor: getScoreColor(applicant.composite_score) }}
                              >
                                {applicant.composite_score.toFixed(1)}
                              </div>
                              <div className="text-xs font-medium text-gray-600">{getScoreGrade(applicant.composite_score)}</div>
                            </div>
                          </div>
                          <div className="ml-4 text-gray-400 transition-colors group-hover:text-gray-600">
                            {expandedApplicants.has(applicant.rank) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </div>
                        </div>

                        {expandedApplicants.has(applicant.rank) && (
                          <motion.div
                            className="px-4 pb-4 bg-gray-50"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="grid grid-cols-1 gap-3 mt-4 md:grid-cols-2">
                              {Object.entries(applicant.score_breakdown).map(([criterion, breakdown]) => (
                                <div key={criterion} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700 truncate" title={formatCriterionName(criterion)}>
                                      {formatCriterionName(criterion)}
                                    </span>
                                    <span
                                      className="px-2 py-1 text-sm font-bold rounded"
                                      style={{
                                        color: getScoreColor(breakdown.score),
                                        backgroundColor: `${getScoreColor(breakdown.score)}20`
                                      }}
                                    >
                                      {breakdown.score}/5
                                    </span>
                                  </div>
                                  <p className="text-xs leading-relaxed text-gray-600">{breakdown.reason}</p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applications Overview with Card Layout */}
              <div className="chart-card">
                <div className="flex items-center justify-between mb-6">
                  <h3>Applications Overview</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 0}
                      className="px-4 py-2 text-sm font-medium text-white transition-all duration-200 rounded-lg shadow-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-medium text-gray-600">
                      Page {currentPage + 1} of {Math.ceil((countyData.ranked_applicants?.length || 0) / applicationsPerPage)}
                    </span>
                    <button
                      onClick={nextPage}
                      disabled={(currentPage + 1) * applicationsPerPage >= (countyData.ranked_applicants?.length || 0)}
                      className="px-4 py-2 text-sm font-medium text-white transition-all duration-200 rounded-lg shadow-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getCurrentPageApplicants().map((applicant) => (
                    <div key={applicant.application_id} className="p-4 transition-shadow duration-200 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 text-xs font-bold text-white rounded-full shadow-sm bg-gradient-to-r from-red-500 to-red-600">
                            #{applicant.rank}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm truncate max-w-[120px]" title={applicant.applicant_name}>
                              {applicant.applicant_name}
                            </div>
                            <div className="text-xs text-gray-500">ID: {applicant.application_id}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="px-2 py-1 text-lg font-bold text-white rounded-md shadow-sm"
                            style={{ backgroundColor: getScoreColor(applicant.composite_score) }}
                          >
                            {applicant.composite_score.toFixed(1)}
                          </div>
                          <div className="mt-1 text-xs font-medium text-gray-600">
                            {getScoreGrade(applicant.composite_score)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ineligible Applicants */}
              {countyData.ineligible_applicants && countyData.ineligible_applicants.length > 0 && (
                <div className="chart-card">
                  <h3>Ineligible Applicants ({countyData.ineligible_applicants?.length || 0})</h3>
                  <div className="mt-4 space-y-3">
                    {countyData.ineligible_applicants?.map((applicant) => (
                      <div key={applicant.application_id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <strong className="text-red-900">{applicant.applicant_name}</strong>
                            <span className="ml-2 text-sm text-red-700">(ID: {applicant.application_id})</span>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">Ineligible</span>
                        </div>
                        <div className="text-sm text-red-800">
                          <strong>Failed:</strong> {applicant.ineligibility_criterion_failed}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="welcome-message">
              <Target size={48} />
              <h2>Select a County</h2>
              <p>Click on a county from the list on the left to view detailed LLM analysis results, rankings, and evaluation criteria.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default LLMCountiesAnalysis;