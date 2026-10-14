import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Empty,
  Radio,
  Select,
  Spin,
  Tabs,
  TabsProps,
  Button,
  Modal,
  message,
  Tag
} from 'antd';
import PayrollSnapshot from '@/components/salaries/PayrollSnapshot';
import { publishPayroll } from '@/services/PayrollPublicationService';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import {
  FaCalendarAlt,
  FaClock,
  FaFileInvoiceDollar,
  FaListAlt,
  FaMoneyBillWave,
  FaMoneyCheckAlt,
  FaReceipt,
  FaUser
} from 'react-icons/fa';
import { useIsMobile } from '@hooks/useIsMobile';

import { useCrudList } from '@/hooks/useCrudList';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { Link } from '@tanstack/react-router';
import AppButton from '@components/common/AppButton';
import { AttendanceTable } from '@components/salaries/AttendanceTable';
import CategoryTable from '@components/salaries/CategoryTable';
import { DeleteModal } from '@components/salaries/DeleteModal';
import { PayslipDetailContent } from '@components/salaries/PayslipDetailContent';
import { SalaryDetailTable } from '@components/salaries/SalaryDetailTable';
import { SalaryTable } from '@components/salaries/SalaryTable';
import { fetchSalary, salariesService } from '@services/SalaryService';

type CompanyType = 'vvp' | 'a7a';

const formatVND = (value: number | null | undefined) => {
  if (value == null) return '-';
  return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

export default function SalaryList() {
  const isMobile = useIsMobile();
  const [publishing, setPublishing] = useState(false);
  const [company, setCompany] = useState<CompanyType>('vvp');
  const [selectedSalaryId, setSelectedSalaryId] = useState<string | null>(null);
  const [selectedSalaryDetailId, setSelectedSalaryDetailId] = useState<
    number | null
  >(null);

  const { data, pagination, queryResult } = useCrudList({
    service: salariesService,
    queryKey: 'salaries',
    initialFilters: {
      limit: 0,
      sort: '-end_date'
    }
  });

  const { isLoading, isFetching, refetch } = queryResult;

  const salaries = useMemo(() => data || [], [data]);
  const total = pagination.total || 0;

  const {
    data: vvpSalaryData,
    isLoading: isVvpDetailLoading,
    isFetching: isVvpDetailFetching,
    isError: isVvpDetailError
  } = useQuery({
    queryKey: ['adminSalaryPreview', selectedSalaryId, 'vvp'],
    queryFn: () => fetchSalary({ id: selectedSalaryId!, company: 'vvp' }),
    enabled: !!selectedSalaryId,
    placeholderData: keepPreviousData
  });

  const {
    data: a7aSalaryData,
    isLoading: isA7aDetailLoading,
    isFetching: isA7aDetailFetching,
    isError: isA7aDetailError
  } = useQuery({
    queryKey: ['adminSalaryPreview', selectedSalaryId, 'a7a'],
    queryFn: () => fetchSalary({ id: selectedSalaryId!, company: 'a7a' }),
    enabled: !!selectedSalaryId,
    placeholderData: keepPreviousData
  });

  const selectedSalaryData = company === 'vvp' ? vvpSalaryData : a7aSalaryData;
  const isDetailLoading =
    company === 'vvp' ? isVvpDetailLoading : isA7aDetailLoading;
  const isDetailFetching =
    company === 'vvp' ? isVvpDetailFetching : isA7aDetailFetching;
  const isDetailError = company === 'vvp' ? isVvpDetailError : isA7aDetailError;

  const category = selectedSalaryData?.category ?? [];
  const salary = selectedSalaryData?.salary ?? [];
  const attendance = selectedSalaryData?.attendance ?? [];

  const salaryDetail = useMemo(
    () => selectedSalaryData?.salaryDetail ?? [],
    [selectedSalaryData?.salaryDetail]
  );

  const selectedSalary = useMemo(
    () => salaries.find((item) => String(item.id) === selectedSalaryId) || null,
    [salaries, selectedSalaryId]
  );

  const salaryOptions = useMemo(
    () =>
      salaries.map((item) => ({
        value: String(item.id),
        label: `${item.title}${item.status === 'draft' ? ' — Bản nháp' : ''}`,
        startDate: item.start_date,
        endDate: item.end_date
      })),
    [salaries]
  );

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

  const selectedSalaryCompanyTotals = useMemo(() => {
    const vvp =
      vvpSalaryData?.snapshot?.rows.reduce((sum, row) => sum + row.net, 0) ??
      vvpSalaryData?.salary.reduce(
        (sum, item) => sum + (item.actually_received_payroll || 0),
        0
      ) ??
      0;
    const a7a =
      a7aSalaryData?.snapshot?.rows.reduce((sum, row) => sum + row.net, 0) ??
      a7aSalaryData?.salary.reduce(
        (sum, item) => sum + (item.actually_received_payroll || 0),
        0
      ) ??
      0;

    return {
      vvp,
      a7a,
      total: vvp + a7a
    };
  }, [a7aSalaryData, vvpSalaryData]);

  useEffect(() => {
    if (selectedSalaryId || !salaries.length) return;
    setSelectedSalaryId(String(salaries[0].id));
  }, [salaries, selectedSalaryId]);

  useEffect(() => {
    setSelectedSalaryDetailId(null);
  }, [selectedSalaryId, company]);

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

  const salaryTabs: TabsProps['items'] = [
    {
      key: 'category',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaListAlt className="text-blue-500" />
          Danh mục
        </span>
      ),
      children: <CategoryTable data={category} loading={isDetailLoading} />
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
        <SalaryTable
          data={salary}
          company={company}
          loading={isDetailLoading}
        />
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
      children: (
        <SalaryDetailTable data={salaryDetail} loading={isDetailLoading} />
      )
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
          loading={isDetailLoading}
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
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <FaUser className="text-emerald-500" />
              Nhân viên
            </label>
            <Select
              className="w-full sm:max-w-md"
              placeholder="Chọn nhân viên để xem phiếu lương"
              value={selectedSalaryDetail?.id}
              options={salaryDetailOptions}
              showSearch
              optionFilterProp="searchText"
              onChange={setSelectedSalaryDetailId}
              loading={isDetailLoading || isDetailFetching}
            />
          </div>

          {selectedSalaryDetail ? (
            <PayslipDetailContent
              salaryDetails={selectedSalaryDetail}
              isLoading={isDetailLoading}
              error={null}
              showAttendanceComparison={false}
            />
          ) : (
            <Empty description="Không có phiếu lương trong kỳ này" />
          )}
        </div>
      )
    }
  ];

  return (
    <ComponentCard title="Quản lý bảng lương">
      <div className="space-y-5">
        {/* ── Action Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <RefreshButton refresh={refetch} isLoading={isFetching} />
          <Link to="/admin/salaries/calculate">
            <AppButton tone="primary" icon={<FaMoneyBillWave />}>
              Tính lương
            </AppButton>
          </Link>
          {selectedSalary && (
            <Tag color={selectedSalary.status === 'draft' ? 'blue' : 'green'}>
              {selectedSalary.status === 'draft' ? 'Bản nháp' : 'Đã công bố'}
            </Tag>
          )}
          {selectedSalary?.status === 'draft' && (
            <Button
              type="primary"
              loading={publishing}
              disabled={
                isDetailFetching ||
                isDetailError ||
                selectedSalaryData?.manager?.id !== selectedSalary.id
              }
              onClick={() => {
                const id = selectedSalary.id;
                const revision = selectedSalaryData?.manager?.revision;
                if (revision == null) return;
                Modal.confirm({
                  title: 'Duyệt và công bố bảng lương?',
                  content:
                    'Nhân viên sẽ xem được phiếu lương của mình. Bản công bố không thể ghi đè.',
                  okText: 'Duyệt / Công bố',
                  cancelText: 'Hủy',
                  onOk: async () => {
                    setPublishing(true);
                    try {
                      await publishPayroll(Number(id), revision);
                      await refetch();
                      message.success('Đã công bố bảng lương.');
                    } catch {
                      message.error(
                        'Chưa công bố được. Kiểm tra quyền duyệt và tải lại bản mới nhất.'
                      );
                    } finally {
                      setPublishing(false);
                    }
                  }
                });
              }}
            >
              Duyệt / Công bố
            </Button>
          )}
          {selectedSalary &&
            !(
              selectedSalary.calculator_key &&
              selectedSalary.status === 'published'
            ) && (
              <DeleteModal
                id={String(selectedSalary.id)}
                title={selectedSalary.title}
                onDeleted={() => {
                  const nextSalary = salaries.find(
                    (item) => String(item.id) !== String(selectedSalary.id)
                  );

                  setSelectedSalaryId(
                    nextSalary ? String(nextSalary.id) : null
                  );
                  setSelectedSalaryDetailId(null);
                }}
              />
            )}
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <FaMoneyBillWave className="text-xs text-emerald-500" />
            <span className="text-xs text-gray-500">
              Tổng: <strong className="text-blue-600">{total}</strong> bản lương
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_500px] xl:items-start">
            <div className="min-w-0">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <FaReceipt className="text-emerald-500" />
                  Bảng lương đang xem
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {selectedSalary
                    ? `${selectedSalary.title} (${dayjs(selectedSalary.start_date).format('DD/MM/YYYY')} - ${dayjs(selectedSalary.end_date).format('DD/MM/YYYY')})`
                    : 'Chọn kỳ lương để xem thông tin chi tiết'}
                </p>
              </div>

              {selectedSalary && (
                <div className="mt-3 flex max-w-2xl flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 dark:border-emerald-800 dark:bg-gray-900">
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <FaMoneyBillWave className="text-emerald-500" />
                      Tổng
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatVND(selectedSalaryCompanyTotals.total)}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 dark:border-blue-800 dark:bg-gray-900">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      VVP
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatVND(selectedSalaryCompanyTotals.vvp)}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 dark:border-purple-800 dark:bg-gray-900">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      A7A
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatVND(selectedSalaryCompanyTotals.a7a)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid w-full gap-3 rounded-lg border border-gray-100 bg-white p-3 xl:grid-cols-[minmax(0,1fr)_150px] dark:border-gray-700 dark:bg-gray-900">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <FaCalendarAlt className="text-emerald-500" />
                  Kỳ lương
                </label>
                <Select
                  value={selectedSalaryId ?? undefined}
                  options={salaryOptions}
                  onChange={setSelectedSalaryId}
                  placeholder="Chọn kỳ lương"
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                  size="large"
                  loading={isLoading}
                  optionRender={(option) => {
                    const optionData = option.data as {
                      label: string;
                      startDate: string;
                      endDate: string;
                    };

                    return (
                      <div className="py-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {optionData.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {dayjs(optionData.startDate).format('DD/MM/YYYY')} -{' '}
                          {dayjs(optionData.endDate).format('DD/MM/YYYY')}
                        </div>
                      </div>
                    );
                  }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Công ty
                </label>
                <Radio.Group
                  className="w-full"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="large"
                  options={[
                    { label: 'VVP', value: 'vvp' },
                    { label: 'A7A', value: 'a7a' }
                  ]}
                />
              </div>
            </div>
          </div>

          {isDetailError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
              <Alert
                message="Không tải được thông tin bảng lương"
                description="Vui lòng thử lại hoặc chọn kỳ lương khác."
                type="error"
                showIcon
              />
            </div>
          )}

          <Spin spinning={isDetailLoading}>
            {selectedSalaryData?.snapshot ? (
              <PayrollSnapshot
                key={selectedSalaryId}
                draft={selectedSalaryData.snapshot}
              />
            ) : selectedSalaryId ? (
              <Tabs
                items={salaryTabs}
                size={isMobile ? 'small' : 'large'}
                type={isMobile ? 'line' : 'card'}
                animated
                tabBarStyle={isMobile ? { marginBottom: 12 } : undefined}
              />
            ) : (
              <Empty description="Không có dữ liệu bảng lương" />
            )}
          </Spin>
        </div>
      </div>
    </ComponentCard>
  );
}
