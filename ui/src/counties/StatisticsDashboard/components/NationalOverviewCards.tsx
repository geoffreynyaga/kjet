import React from 'react';
import { motion } from 'framer-motion';
import { Users, Star, MapPin } from 'lucide-react';
import { NationalStats } from '../types/index.ts';

interface NationalOverviewCardsProps {
  nationalStats: NationalStats;
}

export const NationalOverviewCards: React.FC<NationalOverviewCardsProps> = ({ nationalStats }) => {
  return (
    <motion.div
      className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Applications</p>
            <p className="text-3xl font-bold text-gray-900">{nationalStats.totalApplications.toLocaleString()}</p>
          </div>
          <Users className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="mb-3 text-sm font-medium text-gray-600">Business Tiers</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tier 1:</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-indigo-600">{nationalStats.tierDistribution.tier1.toLocaleString()}</span>
                  <span className="ml-1 text-xs text-gray-500">({((nationalStats.tierDistribution.tier1 / nationalStats.totalApplications) * 100).toFixed(1)}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tier 2:</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-purple-600">{nationalStats.tierDistribution.tier2.toLocaleString()}</span>
                  <span className="ml-1 text-xs text-gray-500">({((nationalStats.tierDistribution.tier2 / nationalStats.totalApplications) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Average Score</p>
            <p className="text-3xl font-bold text-purple-600">{nationalStats.averageScore.toFixed(1)}</p>
            <p className="text-sm text-gray-500">Among all applications</p>
          </div>
          <Star className="w-8 h-8 text-purple-600" />
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Counties Covered</p>
            <p className="text-3xl font-bold text-orange-600">47</p>
            <p className="text-sm text-gray-500">Across Kenya</p>
          </div>
          <MapPin className="w-8 h-8 text-orange-600" />
        </div>
      </div>
    </motion.div>
  );
};