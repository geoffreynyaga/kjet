import React from 'react';
import { motion } from 'framer-motion';
import { HumanApplicant } from '../types/index.ts';
import ScoringBreakdown from '../components/ScoringBreakdown.tsx';

interface ScoreBreakdownSectionProps {
  applicant: HumanApplicant;
}

export const ScoreBreakdownSection: React.FC<ScoreBreakdownSectionProps> = ({ applicant }) => (
  <motion.div
    className="p-8 border shadow-xl bg-gradient-to-b from-white to-gray-50/50 rounded-2xl border-gray-200/60"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
  >
    <h2 className="mb-6 text-2xl font-bold text-gray-800">Score Breakdown</h2>
    <ScoringBreakdown app={applicant} />
  </motion.div>
);