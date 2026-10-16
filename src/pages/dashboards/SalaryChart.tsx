import { SalaryType } from '@/types/salaryType';
import { Column } from '@ant-design/plots';
import { uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';
import DashboardChartCard from '@/components/dashboard/DashboardChartCard';
import { memo, useEffect } from 'react';

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
      fill: '#3b82f6',
      fillOpacity: 0.9,
      cursor: 'default',
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
          valueFormatter: (value: number) =>
            `${Number(value).toLocaleString('vi-VN')} ₫`
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
  const growthRate =
    previousMonth && previousMonth.total > 0
      ? ((latestMonth.total - previousMonth.total) / previousMonth.total) * 100
      : 0;

  const statCards = [
    {
      label: 'Cao nhất',
      value: maxSalary
    },
    {
      label: 'Trung bình',
      value: avgSalary
    },
    {
      label: 'Tổng cộng',
      value: totalSalaries
    },
    {
      label: 'Thấp nhất',
      value: minSalary
    }
  ];

  return (
    <DashboardChartCard
      title="Tổng quan bảng lương"
      description={
        chartData.length
          ? `${chartData.length} kỳ lương · ${chartData[0].month} — ${latestMonth.month}`
          : 'Theo dõi tổng chi phí lương theo kỳ'
      }
      unit="Tổng lương (VND) · K: nghìn · M: triệu · B: tỷ"
      stats={statCards.map((stat) => ({
        label: stat.label,
        value: formatCurrency(stat.value)
      }))}
      empty={chartData.length === 0}
      footer={
        latestMonth && (
          <span>
            Kỳ gần nhất: <strong>{latestMonth.month}</strong> ·{' '}
            {latestMonth.total.toLocaleString('vi-VN')} ₫
            {previousMonth && previousMonth.total > 0
              ? ` · ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}% so với kỳ trước`
              : ''}
          </span>
        )
      }
    >
      <Column {...config} height={isMobile ? 320 : 380} autoFit />
    </DashboardChartCard>
  );
});
