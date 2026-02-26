import React from 'react';
import { motion } from 'framer-motion';

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

interface TableRowProps {
  item: ComparisonData;
  index: number;
  getCountyRowColor: (county: string) => string;
}

const TableRow: React.FC<TableRowProps> = ({ item, index, getCountyRowColor }) => {
  const countyBgColor = getCountyRowColor(item["County"]);

  const renderRankingArrow = (firstRank: number, finalRank: number) => {
    if (finalRank < firstRank) {
      // Better ranking (lower number is better)
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
      );
    } else if (finalRank > firstRank) {
      // Worse ranking (higher number is worse)
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
        </svg>
      );
    } else {
      // Same ranking
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        </svg>
      );
    }
  };

  const renderNotes = () => {
    const firstRound = item["ONLY PASS"];
    const secondRound = item["ALL SCORED"];

    // PRIORITY 1: County ranking changes (most important)
    if (item["FIRST COUNTY RANK"] >= 3 && item["FINAL COUNTY RANK"] <= 2) {
      return (
        <motion.span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 25,
            delay: 0.1
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 4px 8px rgba(59, 130, 246, 0.3)"
          }}
        >
          Ranked → Top 2 Qualified
        </motion.span>
      );
    }

    if (item["FIRST COUNTY RANK"] <= 2 && item["FINAL COUNTY RANK"] > 2) {
      return (
        <motion.span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white"
          initial={{ scale: 0, opacity: 0, x: -10 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
            delay: 0.1
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 4px 8px rgba(239, 68, 68, 0.3)"
          }}
        >
          Top 2 → Kicked Out
        </motion.span>
      );
    }

    // PRIORITY 2: Score-based changes
    if (typeof firstRound === 'number' && firstRound === 0 && typeof secondRound === 'number' && secondRound > 0) {
      return (
        <motion.span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white"
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 30,
            delay: 0.15
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 4px 8px rgba(34, 197, 94, 0.3)"
          }}
        >
          Zero → Ranked
        </motion.span>
      );
    }

    if (firstRound === "DQ" && typeof secondRound === 'number' && secondRound > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Reconsidered (+{secondRound})
        </span>
      );
    }

    if (firstRound === "DQ") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Disqualified
        </span>
      );
    }

    if (typeof firstRound === 'number' && firstRound > 0 && typeof secondRound === 'number' && secondRound === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          No Change
        </span>
      );
    }

    if (typeof firstRound === 'number' && firstRound > 0 && typeof secondRound === 'number' && secondRound > 0) {
      const change = secondRound - firstRound;
      return (
        <motion.span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            change > 0 ? 'bg-blue-100 text-blue-800' :
            change < 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            delay: 0.2
          }}
          whileHover={{
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
        >
          {change > 0 ? `+${change} marks added` :
           change < 0 ? `${Math.abs(change)} marks deducted` :
           'Same score'}
        </motion.span>
      );
    }

    return (
      <motion.span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        No Change
      </motion.span>
    );
  };

  return (
    <motion.tr
      key={`${item["Application ID"]}-${index}`}
      className={`${countyBgColor} hover:bg-gray-100 transition-colors duration-150`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05, // Stagger animation based on row index
        ease: "easeOut"
      }}
      whileHover={{
        scale: 1.01,
        transition: { duration: 0.2 }
      }}
    >
      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
        {item["Application ID"]}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {item["County"]}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item["ONLY PASS"] === "DQ" ? 'bg-red-100 text-red-800' :
          typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {item["ONLY PASS"]}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {item["ALL SCORED"]}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            #{item["FIRST RANK"]}
          </span>
          {renderRankingArrow(item["FIRST RANK"], item["FINAL RANK"])}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            #{item["FINAL RANK"]}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            #{item["FIRST COUNTY RANK"]}
          </span>
          {renderRankingArrow(item["FIRST COUNTY RANK"], item["FINAL COUNTY RANK"])}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            #{item["FINAL COUNTY RANK"]}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        {renderNotes()}
      </td>
    </motion.tr>
  );
};

export default TableRow;