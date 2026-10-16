import type { ReactNode } from 'react';
import { Card } from 'antd';

interface DashboardChartCardProps {
  title: string;
  description: string;
  unit: string;
  stats: { label: string; value: string | number }[];
  empty: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export default function DashboardChartCard({
  title,
  description,
  unit,
  stats,
  empty,
  children,
  footer
}: DashboardChartCardProps) {
  return (
    <div className="h-full w-full min-w-0">
      <Card
        className="liquid-glass-card dashboard-liquid-chart dashboard-report-card !rounded-2xl"
        title={
          <div className="min-w-0 py-1">
            <h3 className="!m-0 text-base font-bold text-gray-900 uppercase dark:text-white">
              {title}
            </h3>
            <p className="mt-1 !mb-0 text-xs leading-relaxed font-normal whitespace-normal text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        }
      >
        <dl className="dashboard-report-stats mb-6 grid grid-cols-2 gap-4 border-b border-slate-200/70 pb-5 dark:border-slate-700">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                {stat.label}
              </dt>
              <dd className="mt-1 !mb-0 text-xl font-semibold tracking-tight text-gray-900 tabular-nums dark:text-white">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
          {unit}
        </div>
        {empty ? (
          <div className="flex min-h-80 items-center justify-center rounded-xl bg-slate-50 text-sm text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
            Chưa có dữ liệu trong kỳ này
          </div>
        ) : (
          <div className="dashboard-chart-canvas w-full min-w-0">
            {children}
          </div>
        )}
        {!empty && footer && (
          <div className="mt-5 rounded-xl border border-l-4 border-blue-200 border-l-blue-500 bg-blue-50 px-4 py-4 text-sm leading-relaxed text-slate-700 sm:text-base dark:border-blue-800 dark:border-l-blue-400 dark:bg-blue-950/40 dark:text-slate-200">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
