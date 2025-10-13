import React from 'react';

interface ComparisonData {
  "Application ID": string;
  "County": string;
  "ALL SCORED": number | "DQ";
  "ONLY PASS": number | "DQ";
  "FIRST RANK": number;
  "FINAL RANK": number;
  "RANK CHANGE": number;
  "FIRST COUNTY RANK": number;
  "FINAL COUNTY RANK": number;
  "COUNTY RANK CHANGE": number;
}

interface TableHeaderProps {
  sortField: keyof ComparisonData;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof ComparisonData) => void;
  getSortIcon: (field: keyof ComparisonData) => string;
}

const TableHeader: React.FC<TableHeaderProps> = ({ sortField, sortDirection, onSort, getSortIcon }) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        <th
          onClick={() => onSort('Application ID')}
          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
        >
          Application ID {getSortIcon('Application ID')}
        </th>
        <th
          onClick={() => onSort('County')}
          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
        >
          County {getSortIcon('County')}
        </th>
        <th
          onClick={() => onSort('ONLY PASS')}
          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
        >
          First Score {getSortIcon('ONLY PASS')}
        </th>
        <th
          onClick={() => onSort('ALL SCORED')}
          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
        >
          Final Score {getSortIcon('ALL SCORED')}
        </th>
        <th
          onClick={() => onSort('FIRST RANK')}
          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
        >
         Overall Ranking {getSortIcon('FIRST RANK')}
        </th>
        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
          County Ranking
        </th>
        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
          Notes
        </th>
      </tr>
    </thead>
  );
};

export default TableHeader;