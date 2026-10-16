import { Card, Skeleton } from 'antd';
import {
  LIST_CONTAINER_VARIANTS,
  SECTION_ITEM_VARIANTS,
  SURFACE_TRANSITION
} from '@constants/motion';
import { motion, useReducedMotion } from 'framer-motion';

interface PageSkeletonProps {
  /** Số dòng skeleton hiển thị */
  rows?: number;
  /** Hiện avatar placeholder */
  avatar?: boolean;
  /** Hiện title placeholder */
  title?: boolean;
  /** Số card skeleton */
  cards?: number;
}

/**
 * Skeleton loading component nhất quán cho toàn app.
 * Dùng để hiển thị khi data đang load lần đầu (chưa có cache).
 */
export default function PageSkeleton({
  rows = 5,
  avatar = false,
  title = true,
  cards = 1
}: PageSkeletonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : LIST_CONTAINER_VARIANTS}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <motion.div
          key={i}
          variants={shouldReduceMotion ? undefined : SECTION_ITEM_VARIANTS}
          transition={shouldReduceMotion ? { duration: 0 } : SURFACE_TRANSITION}
        >
          <Card className="ui-card liquid-glass-card !rounded-2xl">
            <Skeleton
              active
              avatar={avatar}
              title={title}
              paragraph={{ rows }}
            />
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Skeleton cho Table - hiển thị dạng bảng giả
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : SURFACE_TRANSITION}
      className="space-y-3 p-4"
    >
      {/* Header row */}
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5].map((col) => (
          <Skeleton.Button
            key={col}
            active
            size="small"
            style={{ width: `${15 + col * 3}%`, height: 20 }}
            block
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {[1, 2, 3, 4, 5].map((col) => (
            <Skeleton.Input
              key={col}
              active
              size="small"
              style={{ width: `${15 + col * 3}%`, height: 16 }}
              block
            />
          ))}
        </div>
      ))}
    </motion.div>
  );
}
