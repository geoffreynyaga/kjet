import React from 'react';
import { motion } from 'framer-motion';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mx-auto mb-4 loading-spinner" />
        <p className="text-lg text-gray-600">Loading statistics...</p>
      </motion.div>
    </div>
  );
};

interface ErrorDisplayProps {
  error: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Data</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );
};