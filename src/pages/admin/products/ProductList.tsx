import AppSearchInput from '@/components/common/AppSearchInput';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { debounce } from 'lodash';

import { DatePicker, Modal, Select, Tabs, TabsProps } from 'antd';

import { useMemo, useState } from 'react';
import { FaSearch, FaRulerCombined, FaTag } from 'react-icons/fa';
import {
  FaBox as FaBox6,
  FaIndustry,
  FaChartBar,
  FaCheckDouble,
  FaCircleXmark,
  FaTruckFast,
  FaTrashCan,
  FaPlus
} from 'react-icons/fa6';

import axiosPrivate from '@/api/axiosInstance';
import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { Check200Table } from '@components/products/Check200Table';
import { Error200Table } from '@components/products/Error200Table';
import { ExportTable } from '@components/products/ExportTable';
import { ProduceTable } from '@components/products/ProduceTable';
import { TotalTable } from '@components/products/TotalTable';
import { ProductDrawerProvider } from '@/contexts/ProductDrawerContext';
import { ProductDetailDrawer } from './ProductDetailDrawer';

import { QueryParams } from '@/types/queryParams';
import { useCrudList } from '@hooks/useCrudList';
import { ProductModelEnumOptions } from '@schemas/product/productModelEnum.enum';
import { ProductModelSizeEnumOptions } from '@schemas/product/productModelSizeEnum.enum';
import { productService } from '@services/ProductService';
import { ExportModal } from './ExportModal';

import ProductAdd from './ProductAdd';
import ProductQuantityAdd from './ProductQuantityAdd';
import ProductQuantityUpdate from './ProductQuantityUpdate';
import ProductTrash from './ProductTrash';

type ModalType = 'add' | 'quantityAdd' | 'quantityUpdate' | 'trash' | null;

const WIDE_MODAL_WIDTH = 'calc(100vw - var(--app-sidebar-width, 0px) - 32px)';

export default function ProductList() {
  const [month, setMonth] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const [params, setParams] = useState<QueryParams>({
    page: 1,
    limit: 50,
    include: [
      'totaldailyquantities',
      'totalmonthquantities',
      'dailyquantities',
      'totaldailyquantitiespo'
    ],
    month: dayjs().format('YYYY-MM')
  });

  const [displayMode, setDisplayMode] = useState<string>('');

  const { data: monthList } = useQuery<{ months: string[] }>({
    queryKey: ['months'],
    queryFn: () => {
      return axiosPrivate.get('/api/products/month-list');
    },
    placeholderData: keepPreviousData,
    // Month list ít thay đổi
    staleTime: 5 * 60 * 1000
  });

  const { queryResult } = useCrudList({
    service: productService,
    queryKey: 'products',
    initialFilters: params
  });

  const fallbackMonths = useMemo(() => {
    const selectedMonth = month ?? dayjs();
    return Array.from({ length: selectedMonth.month() + 1 }, (_, index) =>
      selectedMonth.subtract(index, 'month').format('MM-YYYY')
    );
  }, [month]);

  const months = useMemo(() => {
    const sourceMonths = monthList?.months?.length
      ? monthList.months
      : fallbackMonths;

    return [...sourceMonths].sort((a, b) => {
      const [monthA, yearA] = a.split('-').map(Number);
      const [monthB, yearB] = b.split('-').map(Number);
      return yearB * 12 + monthB - (yearA * 12 + monthA);
    });
  }, [fallbackMonths, monthList]);

  const years: string[] = useMemo(() => {
    return Array.from(
      new Set(months.map((m: string) => m.split('-')[1]).filter(Boolean))
    )
      .sort()
      .reverse();
  }, [months]);

  const activeDisplayMode = displayMode || years[0] || dayjs().format('YYYY');

  const handleSearch = debounce((value: string) => {
    setParams((prev) => ({
      ...prev,
      'filter[search]': value || undefined
    }));
  }, 300);

  const productTabs: TabsProps['items'] = [
    {
      key: 'total',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaChartBar className="text-blue-500" />
          Tổng quan
        </span>
      ),
      children: (
        <TotalTable
          months={months}
          queryResult={queryResult}
          params={params}
          setParams={setParams}
          displayMode={activeDisplayMode}
        />
      )
    },
    {
      key: 'produce',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaIndustry className="text-emerald-500" />
          Hàng sản xuất
        </span>
      ),
      children: (
        <ProduceTable
          month={month}
          queryResult={queryResult}
          params={params}
          setParams={setParams}
        />
      )
    },
    {
      key: 'check-200',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaCheckDouble className="text-cyan-500" />
          Hàng kiểm 200%
        </span>
      ),
      children: (
        <Check200Table
          month={month}
          queryResult={queryResult}
          params={params}
          setParams={setParams}
        />
      )
    },
    {
      key: 'error-200',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaCircleXmark className="text-red-500" />
          Hàng lỗi 200%
        </span>
      ),
      children: (
        <Error200Table
          month={month}
          queryResult={queryResult}
          params={params}
          setParams={setParams}
        />
      )
    },
    {
      key: 'export',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaTruckFast className="text-amber-500" />
          Xuất hàng
        </span>
      ),
      children: (
        <ExportTable
          month={month}
          queryResult={queryResult}
          params={params}
          setParams={setParams}
        />
      )
    }
  ];

  const modalConfig: Record<
    Exclude<ModalType, null>,
    { title: string; width: number | string }
  > = {
    add: { title: 'Thêm sản phẩm', width: 600 },
    quantityAdd: { title: 'Thêm sản lượng sản xuất', width: WIDE_MODAL_WIDTH },
    quantityUpdate: {
      title: 'Cập nhật số lượng hàng',
      width: WIDE_MODAL_WIDTH
    },
    trash: { title: 'Thùng rác', width: WIDE_MODAL_WIDTH }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'add':
        return <ProductAdd />;
      case 'quantityAdd':
        return <ProductQuantityAdd />;
      case 'quantityUpdate':
        return <ProductQuantityUpdate />;
      case 'trash':
        return <ProductTrash />;
      default:
        return null;
    }
  };

  return (
    <ProductDrawerProvider>
      <ComponentCard
        title="Quản lý sản phẩm"
        className="admin-sticky-table-card !overflow-visible"
      >
        <div className="space-y-5">
          {/* ── Action Bar ───────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <RefreshButton
              isLoading={queryResult.isFetching}
              refresh={queryResult.refetch}
            />

            <AppButton
              tone="success"
              onClick={() => setActiveModal('add')}
              className="!gap-1.5 !px-3 !py-1.5 !text-xs"
            >
              <FaPlus className="text-[10px] text-gray-500" />
              Thêm SP
            </AppButton>

            <AppButton
              tone="primary"
              onClick={() => setActiveModal('quantityAdd')}
              className="!gap-1.5 !px-3 !py-1.5 !text-xs"
            >
              <FaIndustry className="text-[10px] text-gray-500" />
              Thêm SL
            </AppButton>

            <AppButton
              tone="info"
              onClick={() => setActiveModal('quantityUpdate')}
              className="!gap-1.5 !px-3 !py-1.5 !text-xs"
            >
              <FaBox6 className="text-[10px] text-gray-500" />
              Cập nhật SL
            </AppButton>

            <AppButton
              tone="warning"
              onClick={() => setActiveModal('trash')}
              className="!gap-1.5 !px-3 !py-1.5 !text-xs"
            >
              <FaTrashCan className="text-[10px] text-gray-500" />
              Thùng rác
            </AppButton>

            <div className="ml-auto">
              <ExportModal />
            </div>
          </div>

          {/* ── Filter Bar ───────────────────────────────────────────── */}
          <div
            data-tour="products-filters"
            className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  📅 Tháng
                </label>
                <DatePicker
                  format="MM/YYYY"
                  value={month}
                  picker="month"
                  placeholder="Chọn tháng"
                  className="!rounded-lg"
                  onChange={(date) => {
                    const newMonth = date
                      ? date.startOf('month')
                      : dayjs().startOf('month');
                    setMonth(newMonth);
                    setParams((prev) => ({
                      ...prev,
                      month: newMonth.format('YYYY-MM')
                    }));
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaChartBar className="mr-1 inline-block text-blue-500" />
                  Dữ liệu xuất hàng
                </label>
                <Select
                  value={activeDisplayMode}
                  onChange={setDisplayMode}
                  className="!rounded-lg"
                  options={[
                    { value: 'hide', label: 'Ẩn xuất hàng' },
                    ...(years.length === 0 && activeDisplayMode !== 'hide'
                      ? [
                          {
                            value: activeDisplayMode,
                            label: `Năm ${activeDisplayMode}`
                          }
                        ]
                      : []),
                    ...years.map((y) => ({ value: y, label: `Năm ${y}` }))
                  ]}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaTag className="mr-1 inline-block text-emerald-500" />
                  Mã thùng
                </label>
                <Select
                  options={ProductModelEnumOptions}
                  placeholder="Chọn mã thùng"
                  popupMatchSelectWidth={false}
                  allowClear
                  className="!rounded-lg"
                  onSelect={(value) => {
                    setParams((prev) => ({
                      ...prev,
                      'filter[binCode]': value
                    }));
                  }}
                  onClear={() => {
                    setParams((prev) => ({
                      ...prev,
                      'filter[binCode]': undefined
                    }));
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaRulerCombined className="mr-1 inline-block text-orange-500" />
                  Kích thước khuôn
                </label>
                <Select
                  options={ProductModelSizeEnumOptions}
                  placeholder="Chọn kích thước"
                  popupMatchSelectWidth={false}
                  allowClear
                  className="!rounded-lg"
                  onSelect={(value) => {
                    setParams((prev) => ({
                      ...prev,
                      'filter[moldSize]': value
                    }));
                  }}
                  onClear={() => {
                    setParams((prev) => ({
                      ...prev,
                      'filter[moldSize]': undefined
                    }));
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaSearch className="mr-1 inline-block text-gray-400" />
                  Tìm kiếm
                </label>
                <AppSearchInput
                  placeholder="Tìm kiếm sản phẩm..."
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    handleSearch(inputValue);
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <Tabs
            data-tour="products-tabs"
            items={productTabs}
            type="card"
            size="large"
            animated
          />
        </div>

        {/* ── Modal ─────────────────────────────────────────────────── */}
        <Modal
          title={activeModal ? modalConfig[activeModal].title : ''}
          open={activeModal !== null}
          onCancel={() => setActiveModal(null)}
          footer={null}
          width={activeModal ? modalConfig[activeModal].width : undefined}
          destroyOnHidden
          centered
          styles={{
            body: {
              maxHeight: '75vh',
              overflowY: 'auto',
              paddingRight: 8
            }
          }}
        >
          {renderModalContent()}
        </Modal>
        <ProductDetailDrawer />
      </ComponentCard>
    </ProductDrawerProvider>
  );
}
