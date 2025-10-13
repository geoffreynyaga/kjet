import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading final evaluations..." }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-auto mb-4 loading-spinner" />
        <p className="text-lg text-gray-600">{message}</p>
      </motion.div>
    </div>
  );
}

interface ErrorDisplayProps {
  error: string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Data</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "Select a County",
  description = "Choose a county from the list on the left to view final-scored top applicants and failed applicants."
}: EmptyStateProps) {
  return (
    <div className="text-center text-gray-600 welcome-message">
      <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-gray-400 bg-gray-100 rounded-full">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
      <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
      <p className="mt-2">{description}</p>
    </div>
  );
}