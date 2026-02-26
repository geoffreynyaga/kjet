import React from 'react';

interface StatisticCardProps {
  title: string;
  value: number;
  icon: string;
  iconBgColor: string;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ title, value, icon, iconBgColor }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`flex items-center justify-center w-10 h-10 ${iconBgColor} rounded-md`}>
            <span className="text-sm font-bold text-white">{icon}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 ml-5">
          <dl>
            <dt className="text-sm font-medium leading-tight text-gray-500">{title}</dt>
            <dd className="text-xl font-bold text-gray-900">{value.toLocaleString()}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StatisticCard;