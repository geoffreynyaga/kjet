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
  return (
    <motion.div
      className="p-6 bg-white rounded-lg shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Performing Counties</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={nationalStats.topPerformingCounties}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="county" angle={-45} textAnchor="end" height={100} />
          <YAxis yAxisId="left" orientation="left" label={{ value: 'Applications', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Score', angle: 90, position: 'insideRight' }} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'Applications') return [value, 'Applications'];
              if (name === 'Avg Score') return [`${Number(value).toFixed(1)}`, 'Avg Score'];
              return [`${Number(value).toFixed(1)}%`, 'Pass Rate'];
            }}
          />
          <Legend />
          {showBars && (
            <Bar
              yAxisId="left"
              dataKey="applications"
              fill="#3b82f6"
              name="Applications"
              animationDuration={1200}
              isAnimationActive={true}
            />
          )}
          {showLine && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgScore"
              stroke="#ef4444"
              strokeWidth={3}
              name="Avg Score"
              dot={{
                fill: '#ef4444',
                strokeWidth: 2,
                r: 4
              }}
              animationDuration={1000}
              isAnimationActive={true}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
};