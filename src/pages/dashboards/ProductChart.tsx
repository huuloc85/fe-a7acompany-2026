import { TotalMonthQuantityType } from '@/types/totalMonthQuantityType';
import { Bar } from '@ant-design/plots';
import { uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';
import { Card, Badge } from 'antd';
import { memo, useEffect } from 'react';
import {
  FaArrowUp,
  FaArrowDown,
  FaChartBar,
  FaEquals,
  FaBoxOpen,
  FaClipboardList
} from 'react-icons/fa';

type ProductDataType = {
  product: string;
  quantity: number;
  index: number;
};

const toNumber = (value: number | string | undefined | null) =>
  Number(value || 0);

export const ProductChart = memo(function ProductChart({
  data
}: {
  data: TotalMonthQuantityType[];
}) {
  const isDark = useStore(uiStore, (state) => state.theme === 'dark');
  const chartData: ProductDataType[] = (data || [])
    .map((item) => ({
      product: item.product?.name || 'N/A',
      quantity: toNumber(item.totalQuan),
      index: 0
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map((item, index) => ({ ...item, index }));
  const chartRenderSignature = chartData
    .map((item) => `${item.product}:${item.quantity}`)
    .join('|');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [chartRenderSignature]);

  // Utility function to format numbers
  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return '0';

    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(value >= 10000000000 ? 0 : 1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    }
    return value ? value.toString() : value;
  };

  const config = {
    theme: isDark ? 'dark' : 'light',
    data: chartData,
    isGroup: false,
    xField: 'product',
    yField: 'quantity',
    height: 400,
    style: {
      radiusTopLeft: 6,
      radiusTopRight: 6,
      radiusBottomLeft: 6,
      radiusBottomRight: 6,
      fill: 'linear-gradient(0deg, #93c5fd 0%, #3b82f6 50%, #2563eb 100%)',
      fillOpacity: 0.9,
      cursor: 'pointer',
      maxWidth: 28
    },
    state: {
      active: {
        fillOpacity: 1,
        stroke: '#1d4ed8',
        strokeWidth: 1
      },
      inactive: {
        fillOpacity: 0.4
      }
    },
    legend: false,
    axis: {
      y: {
        labelFormatter: (value: number) => formatNumber(value),
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
        labelFormatter: (text: string) => {
          if (window.innerWidth < 768) {
            return text.length > 12 ? `${text.slice(0, 12)}...` : text;
          }
          return text.length > 15 ? `${text.slice(0, 15)}...` : text;
        },
        label: {
          style: {
            fill: isDark ? '#cbd5e1' : '#64748b',
            fontSize: 11,
            fontWeight: 500
          }
        }
      }
    },
    tooltip: {
      title: (d: ProductDataType) => `${d.product}`,
      items: [
        {
          field: 'quantity',
          name: 'Số lượng',
          valueFormatter: (value: number) => `${formatNumber(value)} sản phẩm`
        }
      ]
    },
    animation: {
      appear: {
        animation: 'grow-in-y',
        duration: 800,
        delay: (_: ProductDataType, index: number) => index * 60
      }
    },
    interaction: {
      elementHighlight: true
    }
  };

  // Calculate statistics
  const maxQuantity = chartData.length > 0 ? chartData[0].quantity : 0;
  const totalQuantity = chartData.reduce((sum, item) => sum + item.quantity, 0);
  const avgQuantity =
    chartData.length > 0 ? Math.round(totalQuantity / chartData.length) : 0;
  const minQuantity =
    chartData.length > 0 ? chartData[chartData.length - 1].quantity : 0;

  const statCards = [
    {
      label: 'Cao nhất',
      value: maxQuantity,
      icon: <FaArrowUp className="text-emerald-500" />
    },
    {
      label: 'Trung bình',
      value: avgQuantity,
      icon: <FaEquals className="text-blue-500" />
    },
    {
      label: 'Tổng cộng',
      value: totalQuantity,
      icon: <FaChartBar className="text-indigo-500" />
    },
    {
      label: 'Thấp nhất',
      value: minQuantity,
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
                Top Sản Phẩm Xuất Hàng
              </h3>
              <p className="flex items-center gap-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                <Badge count={chartData.length} showZero color="#6b7280" />
                <span>
                  {chartData.length} sản phẩm hàng đầu theo số lượng xuất hàng
                  theo tháng {data[0]?.month || 'N/A'}
                </span>
              </p>
            </div>
          </div>
        }
        extra={
          <div className="hidden items-center gap-4 lg:flex">
            <span className="liquid-glass-control inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-300">
              <FaBoxOpen aria-hidden="true" />
              Top sản phẩm
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
                {formatNumber(stat.value)}
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
              <Bar {...config} height={undefined} autoFit={true} />
            </div>
          </div>

          {chartData.length === 0 && (
            <div className="liquid-glass-card absolute inset-0 flex items-center justify-center rounded-2xl">
              <div className="p-6 text-center">
                <p className="mb-1 text-base font-medium text-gray-600 dark:text-gray-300">
                  Chưa có dữ liệu sản phẩm
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Dữ liệu sản phẩm sẽ xuất hiện tại đây
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Production Analysis */}
        {chartData.length > 0 && (
          <div className="liquid-glass-control mt-6 rounded-2xl p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
              <FaClipboardList className="text-gray-400" aria-hidden="true" />
              Báo cáo sản lượng
            </h4>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div className="liquid-glass-control flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 dark:text-gray-400">
                  Sản phẩm chính:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {chartData[0]?.product || 'N/A'}
                </span>
              </div>
              <div className="liquid-glass-control flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 dark:text-gray-400">
                  Sản lượng cao nhất:
                </span>
                <span className="font-semibold text-emerald-600">
                  {formatNumber(maxQuantity)}
                </span>
              </div>
              <div className="liquid-glass-control flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 dark:text-gray-400">
                  Chênh lệch:
                </span>
                <span className="font-semibold text-blue-600">
                  {formatNumber(maxQuantity - minQuantity)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});
