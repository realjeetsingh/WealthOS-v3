import React from 'react';
import { motion } from 'motion/react';

interface ConfidenceCircleProps {
  confidence: number;
  reason?: string;
  size?: number;
}

const ConfidenceCircle: React.FC<ConfidenceCircleProps> = ({ confidence, reason, size = 80 }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // 251.327... let's use 251.2 as requested
  const strokeDashoffset = 251.2 - (confidence * 251.2) / 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
        >
          {/* Background */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />

          {/* Progress */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            stroke="#4F46E5" // Indigo-600 to match theme
            strokeWidth="8"
            fill="none"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />

          {/* Center Text */}
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fontSize="22"
            fontWeight="900"
            fill="#111827"
            className="font-sans"
          >
            {confidence}%
          </text>
        </svg>
      </div>
      <div className="text-center max-w-[160px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
          Data Quality
        </p>
        <p className="text-[9px] font-bold text-gray-500 leading-tight">
          {reason || "Based on your financial data quality"}
        </p>
      </div>
    </div>
  );
};

export default ConfidenceCircle;
