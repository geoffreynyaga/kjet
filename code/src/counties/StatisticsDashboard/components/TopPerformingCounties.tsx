import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line } from 'recharts';
import { NationalStats } from '../types/index.ts';

interface TopPerformingCountiesProps {
  nationalStats: NationalStats;
}

export const TopPerformingCounties: React.FC<TopPerformingCountiesProps> = ({ nationalStats }) => {
  const [showBars, setShowBars] = useState(false);
  const [showLine, setShowLine] = useState(false);

  useEffect(() => {
    // Show bars first
    const barTimer = setTimeout(() => setShowBars(true), 800);
    // Show line after bars
    const lineTimer = setTimeout(() => setShowLine(true), 1600);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(lineTimer);
    };
  }, []);
  // Custom tooltip with modern styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          className="p-4 border border-gray-200 shadow-2xl bg-white/95 backdrop-blur-sm rounded-xl"
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-3 text-base font-bold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between mb-2 min-w-[180px]">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-gray-700">{entry.name}:</span>
              </div>
              <span className="font-bold text-gray-900">
                {entry.name === 'Avg Score' ? `${Number(entry.value).toFixed(1)}` : entry.value}
              </span>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="px-6 py-6 border border-gray-100 shadow-lg bg-gradient-to-br from-white via-orange-50/30 to-red-50/30 rounded-xl"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mb-2"
      >
        <h3 className="flex items-center mb-1 text-xl font-bold text-gray-900">
          <div className="w-1 h-6 mr-3 rounded-full bg-gradient-to-b from-orange-500 to-red-600"></div>
          Top Performing Counties
        </h3>
        <p className="text-sm text-gray-600">Counties with highest application volumes and average scores</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="relative"
      >
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={nationalStats.topPerformingCounties}
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="barGradientCounties" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset="50%" stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeOpacity={0.5}
            />

            <XAxis
              dataKey="county"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11, fontWeight: 500 }}
              stroke="#6b7280"
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />

            <YAxis
              yAxisId="left"
              orientation="left"
              label={{
                value: 'Applications',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 600, fill: '#3b82f6' }
              }}
              tick={{ fontSize: 11, fontWeight: 500, fill: '#3b82f6' }}
              tickLine={{ stroke: '#3b82f6' }}
              axisLine={{ stroke: '#3b82f6' }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              label={{
                value: 'Avg Score',
                angle: 90,
                position: 'insideRight',
                style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 600, fill: '#ef4444' }
              }}
              tick={{ fontSize: 11, fontWeight: 500, fill: '#ef4444' }}
              tickLine={{ stroke: '#ef4444' }}
              axisLine={{ stroke: '#ef4444' }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                fill: 'rgba(59, 130, 246, 0.1)',
                stroke: 'rgba(59, 130, 246, 0.3)',
                strokeWidth: 2,
                radius: 4
              }}
            />

            {showBars && (
              <Bar
                yAxisId="left"
                dataKey="applications"
                fill="url(#barGradientCounties)"
                name="Applications"
                animationDuration={1200}
                isAnimationActive={true}
                radius={[4, 4, 0, 0]}
                stroke="#1d4ed8"
                strokeWidth={1}
              />
            )}

            {showLine && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgScore"
                stroke="url(#lineGradient)"
                strokeWidth={4}
                name="Avg Score"
                dot={{
                  fill: '#ef4444',
                  strokeWidth: 3,
                  r: 5,
                  stroke: '#ffffff',
                  filter: 'url(#glow)'
                }}
                activeDot={{
                  r: 7,
                  fill: '#ef4444',
                  stroke: '#ffffff',
                  strokeWidth: 3,
                  filter: 'url(#glow)'
                }}
                animationDuration={1000}
                isAnimationActive={true}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>


      </motion.div>

      {/* Bottom gradient accent */}
      <motion.div
        className="h-1 mt-0 rounded-full bg-gradient-to-r from-blue-500 via-orange-500 to-red-500 opacity-40"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          delay: 2.4,
          duration: 1.0,
          ease: "easeOut"
        }}
      />

      {/* Performance insights */}
      <motion.div
        className="flex items-center justify-between mt-4 text-xs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6, duration: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shadow-sm bg-gradient-to-r from-blue-500 to-blue-600" />
          <span className="font-medium text-gray-700">Application Volume</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shadow-sm bg-gradient-to-r from-red-500 to-orange-500" />
          <span className="font-medium text-gray-700">Average Score</span>
        </div>
      </motion.div>
    </motion.div>
  );
};