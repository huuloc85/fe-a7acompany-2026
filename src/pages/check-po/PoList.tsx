import AppSearchInput from '@/components/common/AppSearchInput';
import { DatePicker, Tabs, TabsProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  FaCalendarDay,
  FaExclamationTriangle,
  FaCalendarWeek
} from 'react-icons/fa';
import { FaCheckDouble, FaTruck, FaWarehouse } from 'react-icons/fa6';

import { PoSummaryTable } from '@components/check-po/PoSummaryTable';
import { DailyTable } from '@components/check-po/DailyTable';
import { ErrorTable } from '@components/check-po/ErrorTable';
import { WeekTable } from '@components/check-po/WeekTable';
import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import { getWeeksInMonth } from '@utils/weeksInMonth';
import { useIsMobile } from '@hooks/useIsMobile';

import { IconAdd, IconHistory } from '@components/icons';
import { ExportPoModal } from './ExportPoModal';
import { AddQuantityModal } from './AddQuantityModal';
import { AddExportQuantityModal } from './AddExportQuantityModal';
import { InventoryQuantityModal } from './InventoryQuantityModal';
import { PoHistoryModal } from './PoHistoryModal';

export const PoList = () => {
  const isMobile = useIsMobile();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [search, setSearch] = useState('');

  // ── Modal States ──────────────────────────────────────────
  const [addQuantityOpen, setAddQuantityOpen] = useState(false);
  const [addExportOpen, setAddExportOpen] = useState(false);
  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { weeksInMonth, startOfMonth, endOfMonth } = getWeeksInMonth(month);

  const weekTabs: TabsProps['items'] = Array.from(
    { length: weeksInMonth },
    (_, index) => {
      // Calculate the start and end of the week within the current month
      let weekStart = startOfMonth.startOf('isoWeek').add(index, 'week');
      let weekEnd = weekStart.add(6, 'day');

      // Clamp weekStart and weekEnd to the current month
      if (weekStart.isBefore(startOfMonth)) weekStart = startOfMonth;
      if (weekEnd.isAfter(endOfMonth)) weekEnd = endOfMonth;

      return {
        key: `week-${index + 1}`,
        label: (
          <span className="flex items-center gap-2 text-sm font-medium">
            <FaCalendarWeek className="text-blue-500" />
            Tuần {index + 1} ({weekStart.format('DD/MM')} -{' '}
            {weekEnd.format('DD/MM')})
          </span>
        ),
        children: (
          <div className="space-y-2">
            <div className="text-center text-lg font-semibold uppercase">
              Tuần {index + 1}
              <br />
              {`(${weekStart.format('DD/MM/YYYY')} - ${weekEnd.format('DD/MM/YYYY')})`}
            </div>
            <WeekTable
              month={month}
              startDate={weekStart}
              endDate={weekEnd}
              search={search}
            />
          </div>
        )
      };
    }
  );

  const poTabs: TabsProps['items'] = [
    {
      key: 'check-200',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaCheckDouble className="text-cyan-500" />
          Tổng hợp
        </span>
      ),
      children: (
        <div className="space-y-2">
          <div className="text-center text-lg font-semibold uppercase">
            Bảng tổng hợp
            <br />
            Tháng {month.format('MM-YYYY')}
          </div>
          <PoSummaryTable month={month} search={search} />
        </div>
      )
    },
    ...weekTabs,
    {
      key: 'daily',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaCalendarDay className="text-emerald-500" />
          Hàng ngày
        </span>
      ),
      children: (
        <div className="space-y-2">
          <div className="text-center text-lg font-semibold uppercase">
            Bảng sản lượng sản xuất hàng ngày
            <br />
            Tháng {month.format('MM-YYYY')}
          </div>
          <DailyTable month={month} search={search} />
        </div>
      )
    },
    {
      key: 'error',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaExclamationTriangle className="text-red-500" />
          Hàng lỗi
        </span>
      ),
      children: (
        <div className="space-y-2">
          <div className="text-center text-lg font-semibold uppercase">
            Bảng sản lượng sản xuất hàng lỗi hàng ngày
            <br />
            Tháng {month.format('MM-YYYY')}
          </div>
          <ErrorTable month={month} search={search} />
        </div>
      )
    }
  ];

  return (
    <ComponentCard
      title="Quản lý PO"
      className="admin-sticky-table-card !overflow-visible"
    >
      <div className="space-y-5">
        {/* ── Action Bar ────────────────────────────────────────── */}
        <div className="check-po-action-bar flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <AppButton
            tone="success"
            icon={<IconAdd />}
            onClick={() => setAddQuantityOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            Thêm sản lượng
          </AppButton>
          <AppButton
            tone="primary"
            icon={<FaTruck />}
            onClick={() => setAddExportOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            Thêm PO xuất hàng
          </AppButton>
          <AppButton
            tone="info"
            icon={<FaWarehouse />}
            onClick={() => setAddInventoryOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            Thêm tồn đầu kỳ
          </AppButton>
          <AppButton
            tone="purple"
            icon={<IconHistory />}
            onClick={() => setHistoryOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            Lịch sử nhập PO
          </AppButton>
          <ExportPoModal />

          <div className="ml-auto flex w-full flex-wrap items-center gap-3 md:w-auto">
            <div className="min-w-0 flex-1 lg:flex-none">
              <AppSearchInput
                placeholder="Tìm sản phẩm..."
                className="!w-full lg:!w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 sm:w-auto dark:border-gray-600 dark:bg-gray-800">
              <span className="text-xs text-gray-500">📅 Tháng:</span>
              <DatePicker
                format="DD/MM/YYYY"
                picker="month"
                value={month}
                size={isMobile ? 'small' : 'middle'}
                className="!rounded-lg"
                onChange={(date) => (date ? setMonth(date) : setMonth(dayjs()))}
              />
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <Tabs
          items={poTabs}
          type={isMobile ? 'line' : 'card'}
          size={isMobile ? 'small' : 'large'}
          animated
          destroyOnHidden
          tabBarStyle={isMobile ? { marginBottom: 12 } : undefined}
        />
      </div>

      {/* ── Modals ────────────────────────────────────────────── */}
      <AddQuantityModal
        open={addQuantityOpen}
        onClose={() => setAddQuantityOpen(false)}
      />
      <AddExportQuantityModal
        open={addExportOpen}
        onClose={() => setAddExportOpen(false)}
      />
      <InventoryQuantityModal
        open={addInventoryOpen}
        onClose={() => setAddInventoryOpen(false)}
      />
      <PoHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </ComponentCard>
  );
};
