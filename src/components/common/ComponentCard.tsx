import React from 'react';
import { motion } from 'framer-motion';
interface ComponentCardProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  uppercaseTitle?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = '',
  desc = '',
  uppercaseTitle = true
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`ui-card liquid-glass-card mb-6 overflow-hidden rounded-2xl transition-shadow duration-300 md:hover:shadow-md ${className}`}
    >
      {/* Card Header */}
      <div className="ui-card-header flex flex-col justify-center gap-1 px-4 py-3 text-left sm:px-6 sm:py-4">
        <h2
          className={`ui-page-title !m-0 leading-snug font-semibold text-gray-800 dark:text-white/90 ${uppercaseTitle ? 'text-xl uppercase sm:text-2xl' : 'text-lg'}`}
        >
          {title}
        </h2>
        {desc && (
          <p className="!m-0 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </motion.div>
  );
};

export default ComponentCard;
