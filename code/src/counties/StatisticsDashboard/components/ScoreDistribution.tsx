import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import { NationalStats } from '../types/index.ts';

interface ScoreDistributionProps {
  nationalStats: NationalStats;
}

export const ScoreDistribution: React.FC<ScoreDistributionProps> = ({ nationalStats }) => {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [nationalStats]);

  // Dynamic gradient colors based on score ranges
  const getBarColor = (range: string, index: number) => {
    const colors = {
      '90-100': '#10b981', // Emerald - Excellent
      '80-89': '#06b6d4',  // Cyan - Very Good
      '70-79': '#3b82f6',  // Blue - Good
      '60-69': '#8b5cf6',  // Violet - Fair
      '50-59': '#f59e0b',  // Amber - Below Average
      '1-49': '#ef4444',   // Red - Low
      '0': '#6b7280'       // Gray - Zero
    };
    return colors[range as keyof typeof colors] || '#8884d8';
  };

  // Custom tooltip with enhanced styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <motion.div
          className="p-4 bg-white border border-gray-200 shadow-2xl rounded-xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-1 font-semibold text-gray-900">Score Range: {label}</p>
          <p className="text-lg font-bold text-blue-600">{data.value} Applications</p>
          <div className="w-8 h-1 mt-2 rounded-full" style={{ backgroundColor: data.color }} />
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="p-8 border border-gray-100 shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-xl"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mb-6"
      >
        <h3 className="flex items-center mb-2 text-xl font-bold text-gray-900">
          <div className="w-1 h-6 mr-3 rounded-full bg-gradient-to-b from-blue-500 to-purple-600"></div>
          Score Distribution
        </h3>
        <p className="text-sm text-gray-600">Application performance across score ranges</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="relative"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            key={animationKey}
            data={nationalStats.scoreDistribution}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="barGradient0" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barGradient4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barGradient5" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barGradient6" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0.6} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeOpacity={0.5}
            />

            <XAxis
              dataKey="range"
              tick={{ fontSize: 12, fontWeight: 500 }}
              stroke="#6b7280"
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />

            <YAxis
              tick={{ fontSize: 12, fontWeight: 500 }}
              stroke="#6b7280"
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)', radius: 4 }}
            />

            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              animationBegin={400}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {nationalStats.scoreDistribution.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#barGradient${index})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>


      </motion.div>

      {/* Bottom accent with animation */}
      <motion.div
        className="h-1 mt-6 rounded-full bg-gradient-to-r from-green-500 via-blue-500 via-purple-500 to-red-500 opacity-40"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          delay: 1.8,
          duration: 1.2,
          ease: "easeOut"
        }}
      />

      {/* Legend dots */}
      <motion.div
        className="flex flex-wrap gap-3 mt-4 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.6 }}
      >
        {['Excellent', 'Very Good', 'Good', 'Fair', 'Below Avg', 'Low', 'Zero'].map((label, index) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: getBarColor(nationalStats.scoreDistribution[index]?.range || '', index) }}
            />
            <span className="font-medium text-gray-600">{label}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};