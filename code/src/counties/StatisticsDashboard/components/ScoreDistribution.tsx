import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { NationalStats } from '../types/index.ts';

interface ScoreDistributionProps {
  nationalStats: NationalStats;
}

export const ScoreDistribution: React.FC<ScoreDistributionProps> = ({ nationalStats }) => {
  return (
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
  );
};