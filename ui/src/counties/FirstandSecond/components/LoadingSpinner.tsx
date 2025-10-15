import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading comparison data..." }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="loading-spinner"></div>
      <span className="ml-2 text-gray-600">{message}</span>
    </div>
  );
};

export default LoadingSpinner;