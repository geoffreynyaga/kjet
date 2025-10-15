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
        const r = await fetch('/static/data/output-results/national_evaluation_summary.json');

        // Check if response is ok and content-type is JSON
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }

        const contentType = r.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await r.text();
          console.error('Expected JSON but got:', text.substring(0, 200));
          throw new Error('Server returned HTML instead of JSON - check file path and server configuration');
        }

        const d = await r.json();
        setNationalSummary(d);
      } catch (e) {
        console.error('Fetch error:', e);
        setError(`Failed to load data: ${e.message}`);
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
    <div className="relative w-full min-h-screen overflow-hidden font-sans bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ minHeight: '200vh' }}>
        {/* Large Sun-like Orb - Travels across top */}
        <motion.div
          className="absolute w-[500px] h-[500px] bg-gradient-to-br from-yellow-200/50 via-orange-200/40 to-pink-200/30 rounded-full blur-3xl"
          initial={{ x: "-50vw", y: "-40vh", scale: 0.8, opacity: 0 }}
          animate={{
            x: ["100vw", "-50vw", "100vw"],
            y: ["-40vh", "150vh", "-40vh", "80vh", "-40vh"],
            scale: [0.8, 1.1, 0.9, 1.2, 0.8],
            opacity: [0, 0.6, 0.4, 0.5, 0.3]
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Secondary Blue Orb - Diagonal movement */}
        <motion.div
          className="absolute rounded-full w-96 h-96 bg-gradient-to-br from-blue-200/40 via-purple-200/30 to-indigo-200/25 blur-3xl"
          initial={{ x: "-60vw", y: "200vh", scale: 0.9, opacity: 0 }}
          animate={{
            x: ["120vw", "-60vw", "120vw"],
            y: ["-30vh", "200vh", "100vh", "-30vh"],
            scale: [0.9, 1.3, 0.7, 1.1, 0.9],
            opacity: [0, 0.4, 0.6, 0.3, 0.5]
          }}
          transition={{
            duration: 75,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        />

        {/* Floating Circle 1 - Figure-8 pattern */}
        <motion.div
          className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-cyan-200/50 to-blue-300/40 blur-2xl"
          initial={{ x: "50vw", y: "20vh" }}
          animate={{
            x: ["20vw", "80vw", "20vw", "80vw", "20vw"],
            y: ["20vh", "120vh", "160vh", "80vh", "20vh"],
            scale: [1, 1.3, 0.8, 1.1, 1],
            rotate: [0, 180, 360, 540, 720]
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Floating Circle 2 - Vertical bounce */}
        <motion.div
          className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-green-200/45 to-emerald-300/35 blur-2xl"
          initial={{ x: "15vw", y: "180vh" }}
          animate={{
            x: ["15vw", "85vw", "50vw", "15vw"],
            y: ["180vh", "10vh", "100vh", "180vh"],
            scale: [1, 0.6, 1.4, 0.9, 1],
            rotate: [0, -90, -180, -270, -360]
          }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 8
          }}
        />

        {/* Floating Circle 3 - Circular orbit */}
        <motion.div
          className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-pink-200/50 to-rose-300/40 blur-xl"
          initial={{ x: "70vw", y: "40vh" }}
          animate={{
            x: [
              "70vw", "80vw", "85vw", "80vw", "70vw",
              "60vw", "55vw", "60vw", "70vw"
            ],
            y: [
              "40vh", "25vh", "140vh", "55vh", "170vh",
              "55vh", "40vh", "25vh", "40vh"
            ],
            scale: [1, 1.4, 0.6, 1.2, 0.8, 1.1, 0.9, 1.3, 1],
            rotate: [0, 45, 90, 135, 180, 225, 270, 315, 360]
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear",
            delay: 12
          }}
        />

        {/* Additional wandering elements */}
        <motion.div
          className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-purple-200/40 to-violet-300/30 blur-lg"
          initial={{ x: "90vw", y: "80vh" }}
          animate={{
            x: ["90vw", "10vw", "50vw", "90vw"],
            y: ["80vh", "140vh", "190vh", "80vh"],
            scale: [0.8, 1.2, 0.9, 1.1, 0.8],
            opacity: [0.3, 0.7, 0.4, 0.6, 0.3]
          }}
          transition={{
            duration: 55,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 15
          }}
        />

        <motion.div
          className="absolute rounded-full w-28 h-28 bg-gradient-to-br from-amber-200/45 to-yellow-300/35 blur-xl"
          initial={{ x: "25vw", y: "15vh" }}
          animate={{
            x: ["25vw", "75vw", "40vw", "60vw", "25vw"],
            y: ["15vh", "185vh", "120vh", "160vh", "15vh"],
            scale: [1, 0.7, 1.3, 0.9, 1],
            rotate: [0, 120, 240, 360]
          }}
          transition={{
            duration: 70,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 10
          }}
        />

        {/* Additional elements specifically for main content area */}
        <motion.div
          className="absolute rounded-full w-36 h-36 bg-gradient-to-br from-teal-200/40 to-cyan-300/30 blur-2xl"
          initial={{ x: "10vw", y: "120vh" }}
          animate={{
            x: ["10vw", "90vw", "50vw", "10vw"],
            y: ["120vh", "150vh", "180vh", "120vh"],
            scale: [1, 1.2, 0.8, 1],
            rotate: [0, 90, 180, 270, 360]
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 18
          }}
        />

        <motion.div
          className="absolute rounded-full w-22 h-22 bg-gradient-to-br from-indigo-200/35 to-purple-300/25 blur-lg"
          initial={{ x: "80vw", y: "130vh" }}
          animate={{
            x: ["80vw", "20vw", "60vw", "80vw"],
            y: ["130vh", "170vh", "140vh", "130vh"],
            scale: [0.9, 1.4, 1.1, 0.9],
            opacity: [0.4, 0.8, 0.5, 0.4]
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 22
          }}
        />

        {/* Subtle Gradient Waves */}
        <motion.div
          className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-purple-100/30 via-blue-100/20 to-transparent blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.3, 0.4] }}
          transition={{
            duration: 30,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />

        <motion.div
          className="absolute top-0 right-0 w-full h-40 bg-gradient-to-b from-orange-100/25 via-yellow-100/15 to-transparent blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0.6, 0.3] }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 2
          }}
        />
      </div>

      <motion.nav
        className="sticky top-0 z-50 flex items-center justify-between w-full px-8 py-4 text-white shadow-lg bg-gradient-to-r from-blue-600/95 to-blue-700/95 backdrop-blur-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="text-2xl font-bold tracking-wide text-gray-900"
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
          {/* <motion.a
            href="/comparison"
            className="px-6 py-2 font-medium text-white no-underline transition-colors duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Human vs Algorithm
          </motion.a> */}
          <motion.a
            href="/firstandsecond"
            className="px-6 py-2 font-medium text-white no-underline transition-colors duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            First vs Second
          </motion.a>
          <motion.a
            href="/accounts/logout/"
            className="px-6 py-2 font-medium text-white no-underline transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Out
          </motion.a>
        </motion.div>

      </motion.nav>

      <motion.header
        className="relative z-10 px-8 py-16 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <motion.h1
          className="mb-6 text-5xl font-bold text-gray-900 gradient-text"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          KJET National Evaluation
        </motion.h1>
        <motion.p
          className="max-w-3xl mx-auto text-xl leading-relaxed text-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          A high-level summary of applications and evaluation outcomes across counties.
        </motion.p>
      </motion.header>

      <main className="relative z-10 px-8 pb-16 mx-auto max-w-7xl">
        <StatisticsDashboard />
      </main>

      <motion.footer
        className="py-8 text-center text-gray-300 bg-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <small>Generated by LeadEdge Consults Limited • {new Date().getFullYear()}</small>
      </motion.footer>
    </div>
  );
}