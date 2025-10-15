import React from 'react';
import { motion } from 'framer-motion';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading applicant details..."
}) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/30">
    <motion.div
      className="p-8 text-center border shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl border-gray-200/60"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin" />
      <p className="text-xl font-medium text-gray-700">{message}</p>
    </motion.div>
  </div>
);

interface ErrorStateProps {
  error: string;
  onBack: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onBack }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-red-50/20 to-pink-50/30">
    <motion.div
      className="max-w-md p-8 text-center border shadow-2xl bg-white/90 backdrop-blur-sm rounded-2xl border-red-200/60"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-red-600">
        <span className="text-2xl font-bold text-white">!</span>
      </div>
      <h2 className="mb-4 text-3xl font-bold text-transparent bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text">
        Applicant Not Found
      </h2>
      <p className="mb-6 text-lg text-gray-700">{error}</p>
      <button
        onClick={onBack}
        className="px-6 py-3 font-semibold text-white transition-all duration-300 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:shadow-xl"
      >
        Back to Results
      </button>
    </motion.div>
  </div>
);