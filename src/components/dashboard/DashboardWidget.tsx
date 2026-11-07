import { Link, LinkProps } from '@tanstack/react-router';
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface WidgetProps {
  title: string;
  value?: string;
  icon: React.ReactNode;
  navLink?: LinkProps['to'];
  onClick?: () => void;
  index?: number;
  isLoading?: boolean;
  isMidAutumn?: boolean;
}

const DashboardWidget: React.FC<WidgetProps> = ({
  title,
  value,
  icon,
  navLink,
  onClick,
  isLoading = false,
  isMidAutumn = false
}: WidgetProps) => {
  const reduceMotion = useReducedMotion();
  const content = (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
      className="group relative h-full"
    >
      <div
        className={
          isMidAutumn
            ? 'mid-autumn-widget relative flex h-full min-h-[132px] flex-col items-center justify-center gap-3 rounded-[22px] p-5 text-center transition-all duration-300'
            : 'dashboard-widget-card liquid-glass-card relative flex h-full min-h-[132px] flex-col items-center justify-center gap-3 rounded-[22px] p-5 text-center'
        }
      >
        {/* Icon */}
        <motion.div
          aria-hidden="true"
          className={
            isMidAutumn
              ? 'mid-autumn-widget-icon relative flex h-12 w-12 items-center justify-center rounded-[16px] transition-colors duration-300'
              : 'dashboard-widget-icon liquid-glass-icon relative flex h-12 w-12 items-center justify-center rounded-[16px] transition-colors duration-300 lg:group-hover:bg-blue-100/55 dark:lg:group-hover:bg-blue-500/15'
          }
        >
          <span
            className={
              isMidAutumn
                ? 'flex h-6 w-6 items-center justify-center text-2xl [&>svg]:h-6 [&>svg]:w-6'
                : 'flex h-6 w-6 items-center justify-center text-2xl text-black transition-colors duration-300 lg:group-hover:text-blue-600 dark:text-gray-300 dark:lg:group-hover:text-blue-400 [&>svg]:h-6 [&>svg]:w-6'
            }
          >
            {icon}
          </span>
        </motion.div>

        {/* Title */}
        <p
          className="dashboard-widget-title relative z-10 m-0 flex min-h-12 w-full max-w-[24ch] items-center justify-center text-base leading-6 font-medium text-black/75 normal-case sm:text-lg dark:text-gray-200"
          title={title}
        >
          <span className="text-balance break-words">{title}</span>
        </p>

        {/* Value or Skeleton */}
        {/* Value */}
        {(value !== undefined || isLoading) && (
          <div className="relative z-10 flex min-h-10 items-center justify-center">
            {isLoading ? (
              <span
                className="block h-6 w-14 animate-pulse rounded-md bg-gray-200/80 dark:bg-gray-700/70"
                aria-label="Đang tải"
              />
            ) : (
              <span className="dashboard-widget-value text-[28px] leading-tight font-bold tracking-tight text-gray-950 tabular-nums sm:text-[32px] dark:text-white">
                {value}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (navLink)
    return (
      <Link to={navLink} className="block h-full no-underline">
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button
        type="button"
        className="h-full w-full cursor-pointer"
        onClick={onClick}
      >
        {content}
      </button>
    );
  return content;
};

export default React.memo(DashboardWidget);
