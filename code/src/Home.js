import React, { useEffect, useState } from 'react';

import { StatisticsDashboard } from './counties';
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto mb-4 loading-spinner"></div>
        <p className="text-lg text-gray-600">Loading KJET Summary...</p>
      </motion.div>
    </div>
  );

  if (error) return (
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

  const national = nationalSummary?.national_summary ?? { total_applications: 0, national_eligibility_rate: 0, national_average_score: 0 };
  const topCounties = nationalSummary ? Object.entries(nationalSummary.county_summaries).sort((a,b)=>b[1].total_applications-a[1].total_applications).slice(0,6) : [];

  return (
    <div className="min-h-screen font-sans bg-gray-50">
      <motion.nav
        className="sticky top-0 z-50 flex items-center justify-between w-full px-8 py-4 text-white shadow-lg bg-gradient-to-r from-blue-600 to-blue-700"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div 
          className="text-2xl font-bold tracking-wide"
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
          {/* <motion.a 
            href="/counties"
            className="px-6 py-2 font-medium text-white no-underline transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Counties Dashboard
          </motion.a>
          <motion.a 
            href="/details"
            className="px-6 py-2 font-medium text-white no-underline transition-colors duration-200 bg-purple-600 rounded-lg hover:bg-purple-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Score Analysis
          </motion.a> */}

      

          <motion.a 
            href="/results"
            className="px-6 py-2 font-medium text-white no-underline transition-colors duration-200 bg-green-600 rounded-lg hover:bg-green-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Final Analysis
          </motion.a>
          <motion.a 
            href="/comparison"
            className="px-6 py-2 font-medium text-white no-underline transition-colors duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Human vs AI
          </motion.a>
        </motion.div>
      </motion.nav>
      <motion.header 
        className="px-8 py-16 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <h1 className="mb-6 text-5xl font-bold text-gray-900 gradient-text">
          KJET National Evaluation
        </h1>
        <p className="max-w-3xl mx-auto text-xl leading-relaxed text-gray-600">
          A high-level summary of applications and evaluation outcomes across counties.
        </p>
      </motion.header>
      
      <main className="px-8 pb-16 mx-auto max-w-7xl">
        <StatisticsDashboard />
      </main>
      
      <motion.footer 
        className="py-8 text-center text-gray-300 bg-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <small>Generated by LeadEdge Consultants • {new Date().getFullYear()}</small>
      </motion.footer>
    </div>
  );
}