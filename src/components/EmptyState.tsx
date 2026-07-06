import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './ui/Button';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-20 px-6 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center space-y-6 ${className}`}
    >
      <div className="p-6 bg-indigo-50 rounded-full text-indigo-600">
        <Icon className="w-12 h-12" />
      </div>
      <div className="max-w-xs mx-auto space-y-2">
        <h3 className="text-gray-900 font-black text-2xl tracking-tight">{title}</h3>
        <p className="text-gray-500 font-medium leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="lg"
          onClick={onAction}
          className="bg-gray-900 hover:bg-gray-800 text-white shadow-xl shadow-gray-200 px-8 h-14 rounded-2xl"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
