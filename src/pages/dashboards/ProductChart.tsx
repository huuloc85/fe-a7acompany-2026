import { TotalMonthQuantityType } from '@/types/totalMonthQuantityType';
import { Bar } from '@ant-design/plots';
import { uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';
import DashboardChartCard from '@/components/dashboard/DashboardChartCard';
import { memo, useEffect } from 'react';

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
      return `${(value / 1000000000).toFixed(value >= 10000000000 ? 0 : 1)} Tỷ`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)} Triệu`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} Nghìn`;
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
      fill: '#3b82f6',
      fillOpacity: 0.9,
      cursor: 'default',
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
          valueFormatter: (value: number) =>
            `${Number(value).toLocaleString('vi-VN')} cái`
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
      value: maxQuantity
    },
    {
      label: 'Trung bình',
      value: avgQuantity
    },
    {
      label: 'Tổng cộng',
      value: totalQuantity
    },
    {
      label: 'Thấp nhất',
      value: minQuantity
    }
  ];

  return (
    <DashboardChartCard
      title="Top sản phẩm xuất hàng"
      description={`${chartData.length} sản phẩm có sản lượng cao nhất · Tháng ${data[0]?.month || '—'}`}
      unit="Số lượng (cái)"
      stats={statCards.map((stat) => ({
        label: stat.label,
        value: formatNumber(stat.value)
      }))}
      empty={chartData.length === 0}
      footer={
        chartData[0] && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-0 font-medium break-words">
                Dẫn đầu:{' '}
                <strong className="text-lg text-blue-700 dark:text-blue-300">
                  {chartData[0].product}
                </strong>
              </span>
              <strong className="text-xl text-blue-700 tabular-nums sm:text-2xl dark:text-blue-300">
                {maxQuantity.toLocaleString('vi-VN')} cái
              </strong>
            </div>
            <p className="!m-0 text-sm text-slate-600 dark:text-slate-300">
              Các chỉ số chỉ tính trên {chartData.length} sản phẩm hiển thị.
            </p>
          </div>
        )
      }
    >
      <Bar {...config} height={380} autoFit />
    </DashboardChartCard>
  );
});
