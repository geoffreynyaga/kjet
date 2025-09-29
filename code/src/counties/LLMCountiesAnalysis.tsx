import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, BarChart3, CheckCircle, FileText, MapPin, PieChart as PieChartIcon, TrendingUp, Users, XCircle, Star, Target, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  const applicationsPerPage = 5;

  useEffect(() => {
    loadLLMAnalyses();
  }, []);

  const loadLLMAnalyses = async () => {
    try {
      setLoading(true);

      // Fetch the list of available counties
      const countiesResponse = await fetch('/counties.json');
      const countiesData = await countiesResponse.json();
      const availableCounties = countiesData.counties;

      // Load all county data
      const analyses: CountyAnalysis[] = [];

      for (const county of availableCounties) {
        try {
          const response = await fetch(`/gemini/${county.toLowerCase()}.json`);
          const data: LLMAnalysisData = await response.json();
          analyses.push({
            county: county,
            data: data
          });
        } catch (err) {
          console.warn(`Failed to load data for ${county}:`, err);
          // Continue with other counties even if one fails
        }
      }

      if (analyses.length > 0) {
        setAnalyses(analyses);
        setSelectedCounty(analyses[0].county);
        setCountyData(analyses[0].data);
        // Set the first ranked applicant (rank 1) as expanded by default
        setExpandedApplicants(new Set([1]));
      } else {
        setError('No county data could be loaded');
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
    if (countyData && (currentPage + 1) * applicationsPerPage < countyData.ranked_applicants.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getCurrentPageApplications = () => {
    if (!countyData) return [];
    const startIndex = currentPage * applicationsPerPage;
    const endIndex = startIndex + applicationsPerPage;
    return countyData.ranked_applicants.slice(startIndex, endIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading AI Analysis Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
            <motion.header
        className="bg-white shadow-sm border-b border-gray-200 px-8 py-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2"> Counties Analysis Dashboard</h1>
            <p className="text-xl text-gray-600">AI-powered evaluation and ranking of KJET applications</p>
          </div>
          {selectedCounty && countyData && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 max-w-4xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">{selectedCounty} County - Selection Criteria</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(countyData.selection_criteria_weights).map(([criterion, weight]) => (
                  <div key={criterion} className="bg-white border border-blue-100 rounded-md px-3 py-2 shadow-sm">
                    <div className="text-xs text-gray-600 font-medium truncate" title={formatCriterionName(criterion)}>
                      {formatCriterionName(criterion)}
                    </div>
                    <div className="text-sm font-bold text-blue-600 mt-1">
                      {Math.round(weight * 100)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-blue-700 flex items-center gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Weights determine scoring priority</span>
              </div>
            </div>
          )}
        </div>
      </motion.header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar with county list */}
        <motion.div
          className="w-80 bg-white shadow-lg h-screen sticky top-0 overflow-y-auto"
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
                  <div className="font-semibold text-gray-900 mb-2">{analysis.county} County</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium text-blue-600">{analysis.data.ranked_applicants.length}</span>
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
                <h2>{selectedCounty} County LLM Analysis</h2>
              </div>              {/* Top Two Ranked Candidates with Accordion */}
              {countyData.ranked_applicants.length >= 2 && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Top Ranked Candidates
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {countyData.ranked_applicants.slice(0, 2).map((applicant, index) => (
                      <motion.div
                        key={applicant.application_id}
                        className="transition-all duration-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between group"
                          onClick={() => toggleApplicantExpansion(applicant.rank)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                              #{applicant.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{applicant.applicant_name}</h4>
                              <p className="text-gray-600 text-sm">ID: {applicant.application_id}</p>
                            </div>
                            <div className="text-right">
                              <div
                                className="text-white px-3 py-1 rounded-lg font-bold text-sm inline-block mb-1 shadow-sm"
                                style={{ backgroundColor: getScoreColor(applicant.composite_score) }}
                              >
                                {applicant.composite_score.toFixed(1)}
                              </div>
                              <div className="text-gray-600 text-xs font-medium">{getScoreGrade(applicant.composite_score)}</div>
                            </div>
                          </div>
                          <div className="ml-4 text-gray-400 group-hover:text-gray-600 transition-colors">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                              {Object.entries(applicant.score_breakdown).map(([criterion, breakdown]) => (
                                <div key={criterion} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-700 text-sm truncate" title={formatCriterionName(criterion)}>
                                      {formatCriterionName(criterion)}
                                    </span>
                                    <span
                                      className="font-bold text-sm px-2 py-1 rounded"
                                      style={{
                                        color: getScoreColor(breakdown.score),
                                        backgroundColor: `${getScoreColor(breakdown.score)}20`
                                      }}
                                    >
                                      {breakdown.score}/5
                                    </span>
                                  </div>
                                  <p className="text-gray-600 text-xs leading-relaxed">{breakdown.reason}</p>
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
                <div className="flex justify-between items-center mb-6">
                  <h3>Applications Overview</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 0}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                      Page {currentPage + 1} of {Math.ceil(countyData.ranked_applicants.length / applicationsPerPage)}
                    </span>
                    <button
                      onClick={nextPage}
                      disabled={(currentPage + 1) * applicationsPerPage >= countyData.ranked_applicants.length}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getCurrentPageApplications().map((applicant) => (
                    <div key={applicant.application_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full shadow-sm">
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
                            className="text-lg font-bold px-2 py-1 rounded-md text-white shadow-sm"
                            style={{ backgroundColor: getScoreColor(applicant.composite_score) }}
                          >
                            {applicant.composite_score.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">
                            {getScoreGrade(applicant.composite_score)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ineligible Applicants */}
              {countyData.ineligible_applicants.length > 0 && (
                <div className="chart-card">
                  <h3>Ineligible Applicants ({countyData.ineligible_applicants.length})</h3>
                  <div className="space-y-3 mt-4">
                    {countyData.ineligible_applicants.map((applicant) => (
                      <div key={applicant.application_id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <strong className="text-red-900">{applicant.applicant_name}</strong>
                            <span className="text-red-700 text-sm ml-2">(ID: {applicant.application_id})</span>
                          </div>
                          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">Ineligible</span>
                        </div>
                        <div className="text-red-800 text-sm">
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