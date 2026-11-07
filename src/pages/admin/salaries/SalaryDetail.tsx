import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { Alert, Empty, Radio, Select, Tabs, TabsProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  FaListAlt,
  FaMoneyCheckAlt,
  FaFileInvoiceDollar,
  FaClock,
  FaReceipt
} from 'react-icons/fa';

import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { AttendanceTable } from '@components/salaries/AttendanceTable';
import CategoryTable from '@components/salaries/CategoryTable';
import { SalaryDetailTable } from '@components/salaries/SalaryDetailTable';
import { SalaryTable } from '@components/salaries/SalaryTable';
import { PayslipDetailContent } from '@components/salaries/PayslipDetailContent';
import { fetchSalary } from '@services/SalaryService';
import { useIsMobile } from '@hooks/useIsMobile';

type CompanyType = 'vvp' | 'a7a';

const routeApi = getRouteApi('/_authenticated/admin/salaries/$id');

export default function SalaryDetail() {
  const { id } = routeApi.useParams();
  const isMobile = useIsMobile();

  const [company, setCompany] = useState<CompanyType>('vvp');
  const [selectedSalaryDetailId, setSelectedSalaryDetailId] = useState<
    number | null
  >(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['fetchSalary', id, company],
    queryFn: () => fetchSalary({ id: id, company: company })
  });

  const { category, salary, salaryDetail, attendance } = data || {
    category: [],
    salary: [],
    salaryDetail: [],
    attendance: []
  };

  const salaryDetailOptions = useMemo(
    () =>
      salaryDetail.map((item) => ({
        value: item.id,
        label: `${item.employee?.name || 'Chưa có tên'} - NV${item.employee_id}`,
        searchText: [
          item.employee?.name,
          item.employee_id,
          item.employee?.role?.role_name
        ]
          .filter(Boolean)
          .join(' ')
      })),
    [salaryDetail]
  );

  const selectedSalaryDetail = useMemo(
    () =>
      salaryDetail.find((item) => item.id === selectedSalaryDetailId) ||
      salaryDetail[0] ||
      null,
    [salaryDetail, selectedSalaryDetailId]
  );

  useEffect(() => {
    if (!salaryDetail.length) {
      setSelectedSalaryDetailId(null);
      return;
    }

    const hasSelected = salaryDetail.some(
      (item) => item.id === selectedSalaryDetailId
    );

    if (!hasSelected) {
      setSelectedSalaryDetailId(salaryDetail[0].id);
    }
  }, [salaryDetail, selectedSalaryDetailId]);

  const SalaryTabs: TabsProps['items'] = [
    {
      key: 'category',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaListAlt className="text-blue-500" />
          Danh mục
        </span>
      ),
      children: <CategoryTable data={category} loading={isLoading} />
    },
    {
      key: 'salary',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaMoneyCheckAlt className="text-emerald-500" />
          Bảng lương thanh toán
        </span>
      ),
      children: (
        <SalaryTable data={salary} company={company} loading={isLoading} />
      )
    },
    {
      key: 'salaryDetail',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaFileInvoiceDollar className="text-purple-500" />
          Bảng lương chi tiết
        </span>
      ),
      children: <SalaryDetailTable data={salaryDetail} loading={isLoading} />
    },
    {
      key: 'timekeeping',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaClock className="text-orange-500" />
          Bảng lương chấm công
        </span>
      ),
      children: (
        <AttendanceTable
          data={attendance}
          company={company}
          loading={isLoading}
        />
      )
    },
    {
      key: 'payslip',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaReceipt className="text-pink-500" />
          Phiếu lương
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Nhân viên:
              </span>
              <Select
                className="w-full sm:max-w-sm"
                placeholder="Chọn nhân viên để xem phiếu lương"
                value={selectedSalaryDetail?.id}
                options={salaryDetailOptions}
                showSearch
                optionFilterProp="searchText"
                onChange={setSelectedSalaryDetailId}
                loading={isLoading}
              />
            </div>
          </div>

          {selectedSalaryDetail ? (
            <PayslipDetailContent
              salaryDetails={selectedSalaryDetail}
              isLoading={isLoading}
              error={null}
              showAttendanceComparison={false}
            />
          ) : (
            <Empty description="Không có phiếu lương" />
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <ComponentCard actions={<BackButton />} title="Chi tiết bảng lương">
        <div className="space-y-5">
          {/* ── Action Bar ──────────────────────────────────────── */}
          <div className="ui-toolbar flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton isLoading={isFetching} refresh={refetch} />
            <div className="ml-auto flex items-center gap-2">
              <span className="mr-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Công ty:
              </span>
              <Radio.Group
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: 'VVP', value: 'vvp' },
                  { label: 'A7A', value: 'a7a' }
                ]}
              />
            </div>
          </div>

          {/* ── Error Alert ─────────────────────────────────────── */}
          {isError && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
              <Alert
                message="Có lỗi xảy ra"
                description="Vui lòng thử lại sau"
                type="error"
                showIcon
              />
            </div>
          )}

          {/* ── Tabs ────────────────────────────────────────────── */}
          <Tabs
            items={SalaryTabs}
            size={isMobile ? 'small' : 'large'}
            type={isMobile ? 'line' : 'card'}
            animated
            tabBarStyle={isMobile ? { marginBottom: 12 } : undefined}
          />
        </div>
      </ComponentCard>
    </>
  );
}
