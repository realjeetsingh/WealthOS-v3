import React from 'react';
import { formatCurrencyShort, formatCurrencyFull } from '../lib/formatCurrency';
import { Tooltip } from './Tooltip';

interface CurrencyDisplayProps {
  value: number | string;
  currency?: string;
  className?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ 
  value, 
  currency, 
  className = "" 
}) => {
  const shortValue = formatCurrencyShort(value, currency);
  const fullValue = formatCurrencyFull(value, currency);

  // If the values are the same, don't show tooltip
  if (shortValue === fullValue) {
    return <span className={className}>{shortValue}</span>;
  }

  return (
    <Tooltip content={fullValue} className={className}>
      <span className="border-b border-dotted border-gray-300">
        {shortValue}
      </span>
    </Tooltip>
  );
};
