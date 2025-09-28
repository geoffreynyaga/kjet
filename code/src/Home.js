import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Clean single Home component
export default function Home() {
  const [nationalSummary, setNationalSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async function load() {
      try {
        const r = await fetch('/output-results/national_evaluation_summary.json');
        const d = await r.json();
        setNationalSummary(d);
      } catch (e) {
        console.error(e);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Loading KJET Summary...</p>
      </motion.div>
    </div>
  );

  if (error) return (
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

  const national = nationalSummary?.national_summary ?? { total_applications: 0, national_eligibility_rate: 0, national_average_score: 0 };
  const topCounties = nationalSummary ? Object.entries(nationalSummary.county_summaries).sort((a,b)=>b[1].total_applications-a[1].total_applications).slice(0,6) : [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <motion.nav
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div 
          className="font-bold text-2xl tracking-wide"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          KJET Analytics
        </motion.div>
        <motion.div 
          className="flex gap-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.a 
            href="/counties"
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors duration-200 text-white no-underline"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Counties Dashboard
          </motion.a>
          <motion.a 
            href="/details"
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium transition-colors duration-200 text-white no-underline"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            AI Analysis
          </motion.a>
        </motion.div>
      </motion.nav>
      <motion.header 
        className="text-center py-16 px-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <h1 className="text-5xl font-bold text-gray-900 mb-6 gradient-text">
          KJET National Evaluation
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          A high-level summary of applications and evaluation outcomes across counties.
        </p>
      </motion.header>
      
      <main className="max-w-7xl mx-auto px-8 pb-16">
        <motion.section 
          className="mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Total Applications", value: national.total_applications, color: "from-blue-500 to-blue-600" },
              { title: "National Eligibility Rate", value: `${national.national_eligibility_rate}%`, color: "from-green-500 to-green-600" },
              { title: "National Average Score", value: (national.national_average_score||0).toFixed(1), color: "from-purple-500 to-purple-600" }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className="bg-white rounded-xl shadow-lg p-8 card-hover"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <h4 className="text-lg font-semibold text-gray-700 mb-4">{item.title}</h4>
                <div className={`text-4xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                  {item.value}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Top Counties by Applications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topCounties.map(([name, stats], index) => (
              <motion.div
                key={name}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: 1.4 + index * 0.1, 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="font-bold text-xl text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  {name}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Applications:</span>
                    <span className="font-semibold text-blue-600">{stats.total_applications}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Eligible:</span>
                    <span className="font-semibold text-green-600">{stats.eligible_applications}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Avg Score:</span>
                    <span className="font-semibold text-purple-600">{stats.average_score.toFixed(1)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>
      
      <motion.footer 
        className="bg-gray-800 text-gray-300 py-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <small>Generated by LeadEdge Consultants • {new Date().getFullYear()}</small>
      </motion.footer>
    </div>
  );
}