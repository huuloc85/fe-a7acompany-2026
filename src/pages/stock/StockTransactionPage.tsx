import React, { lazy, Suspense } from 'react';
import { Tabs, Spin } from 'antd';
import {
  ScanOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  PieChartOutlined,
  DiffOutlined
} from '@ant-design/icons';

import ComponentCard from '@components/common/ComponentCard';
import BarcodeScanner from '@/components/stock/BarcodeScanner';
import { useAuth } from '@hooks/useAuth';
import { useIsMobile } from '@hooks/useIsMobile';
import { isAdmin } from '@utils/authUtil';

// Lazy load heavy components to prevent background API calls
// from competing with scan operations
const RawTransactionHistory = lazy(
  () => import('@/components/stock/RawTransactionHistory')
);
const CurrentStockDashboard = lazy(
  () => import('@/components/stock/CurrentStockDashboard')
);
const ProductStockSummary = lazy(
  () => import('@/components/stock/ProductStockSummary')
);
const ExportComparisonTable = lazy(
  () => import('@/components/stock/ExportComparisonTable')
);

const StockTransactionPage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isAdminUser = isAdmin(user?.role?.name || '');

  const tabItems = [
    // Only show scanner tab for non-admin users
    ...(!isAdminUser
      ? [
          {
            key: 'scanner',
            label: (
              <span
                data-tour="stock-scan-tab"
                className="flex items-center gap-1.5"
              >
                <ScanOutlined />
                <span>Quét mã</span>
              </span>
            ),
            children: <BarcodeScanner />
          }
        ]
      : []),
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-1.5">
          <HistoryOutlined />
          <span data-tour="stock-history-tab">
            <span className="hidden sm:inline">Lịch sử xuất nhập</span>
            <span className="inline sm:hidden">Lịch sử</span>
          </span>
        </span>
      ),
      children: (
        <Suspense
          fallback={
            <div className="py-10 text-center">
              <Spin size="large" />
            </div>
          }
        >
          <RawTransactionHistory />
        </Suspense>
      )
    },
    {
      key: 'stock',
      label: (
        <span className="flex items-center gap-1.5">
          <DatabaseOutlined />
          <span className="hidden sm:inline">Tồn kho hiện tại</span>
          <span className="inline sm:hidden">Tồn kho</span>
        </span>
      ),
      children: (
        <Suspense
          fallback={
            <div className="py-10 text-center">
              <Spin size="large" />
            </div>
          }
        >
          <CurrentStockDashboard />
        </Suspense>
      )
    },
    {
      key: 'summary',
      label: (
        <span className="flex items-center gap-1.5">
          <PieChartOutlined />
          <span data-tour="stock-summary-tab">
            <span className="hidden sm:inline">Tổng hợp SP</span>
            <span className="inline sm:hidden">Tổng hợp</span>
          </span>
        </span>
      ),
      children: (
        <Suspense
          fallback={
            <div className="py-10 text-center">
              <Spin size="large" />
            </div>
          }
        >
          <ProductStockSummary />
        </Suspense>
      )
    },
    {
      key: 'export-comparison',
      label: (
        <span className="flex items-center gap-1.5">
          <DiffOutlined />
          <span className="hidden sm:inline">Đối chiếu xuất PO</span>
          <span className="inline sm:hidden">Đối chiếu</span>
        </span>
      ),
      children: (
        <Suspense
          fallback={
            <div className="py-10 text-center">
              <Spin size="large" />
            </div>
          }
        >
          <ExportComparisonTable />
        </Suspense>
      )
    }
  ];

  return (
    <ComponentCard title="Quản lý Kho">
      <Tabs
        defaultActiveKey={isAdminUser ? 'history' : 'scanner'}
        items={tabItems}
        type={isMobile ? 'line' : 'card'}
        destroyOnHidden
        size="small"
        tabBarGutter={isMobile ? 8 : 12}
        tabBarStyle={isMobile ? { marginBottom: 12 } : undefined}
      />
    </ComponentCard>
  );
};

export default StockTransactionPage;
