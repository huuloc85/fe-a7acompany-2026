import { Outlet } from '@tanstack/react-router';
import {
  LIST_CONTAINER_VARIANTS,
  SECTION_ITEM_VARIANTS,
  SURFACE_TRANSITION
} from '@constants/motion';
import { motion, useReducedMotion } from 'framer-motion';

interface PageLayoutProps {
  title: string;
}

export const PageLayout = ({ title }: PageLayoutProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : LIST_CONTAINER_VARIANTS}
      initial="initial"
      animate="animate"
      className="ui-page"
    >
      <motion.div
        variants={
          shouldReduceMotion
            ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 }
              }
            : SECTION_ITEM_VARIANTS
        }
        transition={shouldReduceMotion ? { duration: 0 } : SURFACE_TRANSITION}
        className="ui-page-header mb-6 flex flex-wrap items-center gap-3 py-3 text-left sm:py-4"
      >
        <h2
          className="ui-page-title !m-0 text-xl leading-snug font-semibold text-gray-800 uppercase sm:text-2xl dark:text-white/90"
          x-text="pageName"
        >
          {title}
        </h2>
      </motion.div>
      <motion.div
        variants={
          shouldReduceMotion
            ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 }
              }
            : SECTION_ITEM_VARIANTS
        }
        transition={shouldReduceMotion ? { duration: 0 } : SURFACE_TRANSITION}
      >
        <Outlet />
      </motion.div>
    </motion.div>
  );
};
