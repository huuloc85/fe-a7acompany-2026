import { SalaryType } from '@/types/salaryType';
import { Column } from '@ant-design/plots';
import { uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';
import { Badge, Card } from 'antd';
import { memo, useEffect } from 'react';
import {
  FaArrowUp,
  FaArrowDown,
  FaChartLine,
  FaEquals,
  FaWallet,
  FaClipboardList
} from 'react-icons/fa';

type salaryDataType = {
  month: string;
  total: number;
  index: number;
};

export const SalaryChart = memo(function SalaryChart({
  data
}: {
  data: SalaryType[];
}) {
  const { isMobile, theme } = useStore(uiStore);
  const isDark = theme === 'dark';

  const chartData: salaryDataType[] = data
    .map((item) => ({
      month: item.title.replace('Bảng Lương Tháng ', ''),
      total: item.total,
      index: 0
    }))
    .reverse()
    .map((item, index) => ({ ...item, index }));
  const chartRenderSignature = chartData
    .map((item) => `${item.month}:${item.total}`)
    .join('|');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [chartRenderSignature]);

  // Utility function to format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(value >= 10000000000 ? 0 : 1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    }
    return `${value.toLocaleString('vi-VN')}`;
  };

  const config = {
    theme: isDark ? 'dark' : 'light',
    data: chartData,
    xField: 'month',
    yField: 'total',
    height: 400,
    style: {
      radiusTopLeft: 8,
      radiusTopRight: 8,
      fill: 'linear-gradient(-90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
      fillOpacity: 0.9,
      cursor: 'pointer',
      maxWidth: 48
    },
    state: {
      active: {
        fillOpacity: 1,
        stroke: '#1d4ed8',
        strokeWidth: 1
      },
      inactive: {
        fillOpacity: 0.5
      }
    },
    axis: {
      y: {
        labelFormatter: (v: number) => formatCurrency(v),
        title: false,
        label: {
          style: {
            fill: isDark ? '#94a3b8' : '#64748b',
            fontSize: 11
          }
        },
        grid: true,
        gridStroke: isDark ? '#334155' : '#e2e8f0',
        gridStrokeDasharray: '4,4'
      },
      x: {
        label: {
          style: {
            fill: isDark ? '#cbd5e1' : '#64748b',
            fontSize: 11,
            fontWeight: 500
          }
        }
      }
    },
    ...(!isMobile
      ? {
          label: {
            text: (d: salaryDataType) => formatCurrency(d.total),
            textBaseline: 'bottom',
            offset: 8,
            style: {
              fill: isDark ? '#e2e8f0' : '#334155',
              fontSize: 11,
              fontWeight: 600,
              textAlign: 'center'
            }
          }
        }
      : {}),
    tooltip: {
      title: (d: salaryDataType) => `Tháng ${d.month}`,
      items: [
        {
          field: 'total',
          name: 'Tổng lương',
          valueFormatter: (value: number) => formatCurrency(value)
        }
      ]
    },
    animation: {
      appear: {
        animation: 'grow-in-y',
        duration: 800,
        delay: (_: salaryDataType, index: number) => index * 80
      }
    },
    interaction: {
      elementHighlight: true
    }
  };

  // Calculate statistics
  const totalSalaries = chartData.reduce((sum, item) => sum + item.total, 0);
  const avgSalary =
    chartData.length > 0 ? Math.round(totalSalaries / chartData.length) : 0;
  const maxSalary =
    chartData.length > 0 ? Math.max(...chartData.map((item) => item.total)) : 0;
  const minSalary =
    chartData.length > 0 ? Math.min(...chartData.map((item) => item.total)) : 0;

  // Calculate growth trend
  const latestMonth = chartData[chartData.length - 1];
  const previousMonth = chartData[chartData.length - 2];
  const growthRate = previousMonth
    ? ((latestMonth.total - previousMonth.total) / previousMonth.total) * 100
    : 0;

  const statCards = [
    {
      label: 'Cao nhất',
      value: maxSalary,
      icon: <FaArrowUp className="text-emerald-500" />
    },
    {
      label: 'Trung bình',
      value: avgSalary,
      icon: <FaEquals className="text-blue-500" />
    },
    {
      label: 'Tổng cộng',
      value: totalSalaries,
      icon: <FaChartLine className="text-indigo-500" />
    },
    {
      label: 'Thấp nhất',
      value: minSalary,
      icon: <FaArrowDown className="text-amber-500" />
    }
  ];

  return (
    <div className="h-full w-full">
      <Card
        className="liquid-glass-card dashboard-liquid-chart !rounded-[26px]"
        title={
          <div className="flex items-center gap-3">
            <div>
              <h3 className="mb-1 text-lg font-bold text-gray-800 uppercase dark:text-white">
                Tổng Quan Bảng Lương
              </h3>
              <p className="flex flex-wrap items-center gap-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                <Badge count={chartData.length} showZero color="#6b7280" />
                <span>
                  {chartData.length} bảng lương từ tháng{' '}
                  {chartData[0]?.month || 'N/A'} đến tháng{' '}
                  {chartData[chartData.length - 1]?.month || 'N/A'}
                </span>
                {growthRate > 0 ? (
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    ▲ +{growthRate.toFixed(1)}%
                  </span>
                ) : growthRate < 0 ? (
                  <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    ▼ {growthRate.toFixed(1)}%
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    Ổn định
                  </span>
                )}
              </p>
            </div>
          </div>
        }
        extra={
          <div className="hidden items-center gap-4 lg:flex">
            <span className="liquid-glass-control inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-300">
              <FaWallet aria-hidden="true" />
              Theo dõi lương
            </span>
          </div>
        }
      >
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className="dashboard-stat-card liquid-glass-control rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {stat.icon} {stat.label}
              </div>
              <div className="mt-1 text-xl font-bold tracking-tight text-gray-900 tabular-nums dark:text-white">
                {formatCurrency(stat.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="relative">
          <div className="liquid-glass-control dashboard-chart-surface w-full rounded-2xl p-4">
            <div
              className="dashboard-chart-canvas w-full"
              style={{ height: 'clamp(300px, 50vh, 400px)' }}
            >
              <Column {...config} height={undefined} autoFit={true} />
            </div>
          </div>

          {chartData.length === 0 && (
            <div className="liquid-glass-card absolute inset-0 flex items-center justify-center rounded-2xl">
              <div className="p-6 text-center">
                <p className="mb-1 text-base font-medium text-gray-600 dark:text-gray-300">
                  Chưa có dữ liệu lương
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Dữ liệu bảng lương sẽ xuất hiện tại đây
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Salary Analysis */}
        {chartData.length > 0 && (
          <div className="liquid-glass-control mt-6 rounded-2xl p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
              <FaClipboardList className="text-gray-400" aria-hidden="true" />
              Phân tích lương
            </h4>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div className="liquid-glass-control flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 dark:text-gray-400">
                  Chênh lệch:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(maxSalary - minSalary)}
                </span>
              </div>
              <div className="liquid-glass-control flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 dark:text-gray-400">
                  Trên trung bình:
                </span>
                <span className="font-semibold text-emerald-600">
                  {chartData.filter((item) => item.total >= avgSalary).length}{' '}
                  tháng
                </span>
              </div>
              <div className="liquid-glass-control flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 dark:text-gray-400">
                  Xu hướng:
                </span>
                <span
                  className={`font-semibold ${
                    growthRate > 0
                      ? 'text-red-600'
                      : growthRate < 0
                        ? 'text-green-500'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {growthRate > 0 ? '▲ +' : growthRate < 0 ? '▼ ' : ''}
                  {growthRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Latest month highlight */}
            {latestMonth && (
              <div className="liquid-glass-control mt-3 flex items-center justify-between rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    Tháng gần nhất:{' '}
                    <span className="text-blue-600 dark:text-blue-400">
                      {latestMonth.month}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Lương:{' '}
                    <strong className="text-gray-900 dark:text-white">
                      {formatCurrency(latestMonth.total)}
                    </strong>
                  </p>
                </div>
                {growthRate !== 0 && (
                  <div
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      growthRate > 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {growthRate > 0 ? '+' : ''}
                    {growthRate.toFixed(1)}%
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
});
