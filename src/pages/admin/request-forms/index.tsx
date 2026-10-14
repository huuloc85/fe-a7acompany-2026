import { useState, useMemo } from 'react';
import { Modal, message, Alert, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { DataTable } from '@components/RequestForm/DataTable';
import { FilterPanel } from '@components/RequestForm/FilterPanel';
import { RequestFormDetailView } from '@components/RequestForm';
import { RequestFormOverview } from '@components/RequestForm/RequestFormOverview';
import AdminActionModal from '@components/RequestForm/AdminModals';
import {
  adminRequestFormService,
  requestFormService
} from '@services/RequestFormService';
import {
  RequestForm,
  RequestFormFilters as RequestFormFiltersType
} from '@/types/requestFormType';
import { useAuth } from '@hooks/useAuth';
import { getUserApprovalType } from '@/utils/requestFormUtil';

export default function RequestFormList() {
  const { user } = useAuth();
  const isSupervisor = getUserApprovalType(user) === 'supervisor';
  const approvalService = isSupervisor
    ? requestFormService.supervisor
    : adminRequestFormService;
  const queryClient = useQueryClient();

  // State for Year Overview & Default Filters
  const [year, setYear] = useState<Dayjs>(dayjs());

  // Constants
  const DEFAULT_FILTERS: RequestFormFiltersType = {
    per_page: 15,
    page: 1,
    from_date: dayjs().startOf('year').format('YYYY-MM-DD'),
    to_date: dayjs().endOf('year').format('YYYY-MM-DD')
  };
  const QUERY_KEYS = {
    requestForms: isSupervisor
      ? `supervisor-request-forms-${user?.id}`
      : 'admin-request-forms',
    statistics: 'admin-request-forms-statistics'
  } as const;

  // State
  const [filters, setFilters] =
    useState<RequestFormFiltersType>(DEFAULT_FILTERS);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RequestForm | null>(
    null
  );
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>(
    'approve'
  );

  const userType = isSupervisor ? 'supervisor' : 'admin';

  // Helper functions
  const invalidateAdminRequestForms = () => {
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['emp-attendance'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-daily-results'] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.requestForms] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.statistics] });
  };

  const closeModals = () => {
    setApprovalModalVisible(false);
    setDetailModalVisible(false);
    setSelectedRecord(null);
  };

  // Approval mutation với optimistic updates
  const approveRejectMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: number;
      data: {
        action: 'approve' | 'reject';
        rejection_reason?: string;
        digital_signature_supervisor?: File;
        digital_signature_manager?: File;
      };
    }) => {
      const {
        action,
        digital_signature_supervisor,
        digital_signature_manager,
        rejection_reason
      } = data;

      if (action === 'reject') {
        return await approvalService.approveOrReject(id, {
          action,
          rejection_reason
        });
      }

      // For approve action
      const hasSignatures =
        digital_signature_supervisor || digital_signature_manager;
      return hasSignatures
        ? await approvalService.approveOrRejectWithSignatures(id, {
            action,
            digital_signature_supervisor,
            digital_signature_manager
          })
        : await approvalService.approveOrReject(id, { action });
    },
    // Optimistic update: Cập nhật UI ngay lập tức
    onMutate: async ({ id, data: actionData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.requestForms] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData([
        QUERY_KEYS.requestForms,
        filters
      ]);

      // Optimistically update cache
      queryClient.setQueryData(
        [QUERY_KEYS.requestForms, filters],
        (old: unknown) => {
          if (
            !old ||
            typeof old !== 'object' ||
            !('data' in old) ||
            !Array.isArray(old.data)
          )
            return old;
          return {
            ...old,
            data: old.data.map((form: RequestForm) =>
              form.id === id
                ? {
                    ...form,
                    status:
                      actionData.action === 'reject' ? 'rejected' : form.status
                  }
                : form
            )
          };
        }
      );

      return { previousData };
    },
    onSuccess: (response) => {
      message.success(response.message || 'Đã cập nhật trạng thái đơn');
      invalidateAdminRequestForms();
      closeModals();
    },
    onError: (
      error: Error & { response?: { data?: { message?: string } } },
      _,
      context
    ) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(
          [QUERY_KEYS.requestForms, filters],
          context.previousData
        );
      }
      console.error('Approve/Reject error:', error);
      message.error(
        `Có lỗi xảy ra: ${error.response?.data?.message || error.message}`
      );
    }
  });

  // Fetch request forms với realtime polling và caching
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.requestForms, filters],
    queryFn: () => approvalService.getList(filters),
    // Realtime optimizations
    staleTime: 0, // Data luôn stale → refetch ngay khi cần
    gcTime: 5 * 60 * 1000, // Cache trong 5 phút (thay cacheTime cũ)
    refetchInterval: 5000, // Poll mỗi 5s → gần như realtime
    refetchIntervalInBackground: false, // Chỉ poll khi tab active
    refetchOnWindowFocus: true, // Refresh khi quay lại tab
    // Giữ data cũ khi chuyển trang để UX mượt hơn
    placeholderData: (previousData) => previousData,
    // Chỉ select data cần thiết để giảm re-render
    select: (response) => {
      const allData = response.data?.data || [];
      // Admin thấy tất cả đơn
      return {
        data: allData,
        total: response.data?.total || 0,
        current_page: response.data?.current_page || 1,
        per_page: response.data?.per_page || 15,
        last_page: response.data?.last_page || 1
      };
    }
  });

  // Mutation để duyệt trực tiếp đơn Giấy Ủy Quyền
  const { mutate: approveDirectly } = useMutation({
    mutationFn: (id: number) =>
      approvalService.approveOrReject(id, {
        action: 'approve'
      }),
    onSuccess: () => {
      message.destroy(); // Ẩn loading message
      message.success('Đơn ủy quyền đã được duyệt thành công!');
      invalidateAdminRequestForms();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.destroy(); // Ẩn loading message
      message.error(
        error?.response?.data?.message || 'Có lỗi xảy ra khi duyệt đơn'
      );
    }
  });

  const requestForms = useMemo(() => data?.data || [], [data?.data]);

  // Client-side search by employee name or ID
  const [searchText, setSearchText] = useState('');

  const filteredRequestForms = useMemo(() => {
    if (!searchText.trim()) return requestForms;
    const keyword = searchText.trim().toLowerCase();
    return requestForms.filter((form) => {
      const name = form.employee?.name?.toLowerCase() || '';
      const id = form.employee?.id?.toString() || '';
      return name.includes(keyword) || id.includes(keyword);
    });
  }, [requestForms, searchText]);

  const getFilteredTotal = () => {
    if (searchText.trim()) return filteredRequestForms.length;
    return data?.total || 0;
  };

  // Event handlers
  const handlers = {
    tableChange: (page: number, pageSize?: number) => {
      setFilters((prev) => ({
        ...prev,
        page,
        per_page: pageSize || prev.per_page
      }));
    },
    view: async (record: RequestForm) => {
      // Fetch full detail từ API để có content đầy đủ
      try {
        const response = await approvalService.getDetail(record.id);
        const fullData = response.data;
        setSelectedRecord(fullData);
        setDetailModalVisible(true);
      } catch (error) {
        console.error('Error fetching detail:', error);
        message.error('Không thể tải chi tiết đơn');
      }
    },
    approve: (record: RequestForm) => {
      setDetailModalVisible(false);
      if (record.type === 'giay_uy_quyen') {
        message.loading('Đang duyệt đơn ủy quyền...', 0);
        approveDirectly(record.id);
      } else {
        setSelectedRecord(record);
        setApprovalMode('approve');
        setApprovalModalVisible(true);
      }
    },
    reject: (record: RequestForm) => {
      setDetailModalVisible(false);
      setSelectedRecord(record);
      setApprovalMode('reject');
      setApprovalModalVisible(true);
    },

    filtersChange: (newFilters: RequestFormFiltersType) => {
      setFilters(newFilters);
    },
    clearFilters: () => {
      setFilters({
        ...DEFAULT_FILTERS,
        from_date: year.startOf('year').format('YYYY-MM-DD'),
        to_date: year.endOf('year').format('YYYY-MM-DD')
      });
    },
    yearChange: (date: Dayjs) => {
      setYear(date);
      setFilters((prev) => ({
        ...prev,
        from_date: date.startOf('year').format('YYYY-MM-DD'),
        to_date: date.endOf('year').format('YYYY-MM-DD'),
        page: 1
      }));
    }
  };

  const pagination = data
    ? {
        current: data.current_page,
        total: data.total,
        pageSize: data.per_page,
        onChange: handlers.tableChange
      }
    : undefined;

  return (
    <>
      <ComponentCard title="Quản lý đơn yêu cầu">
        <div className="space-y-5">
          {/* ── Overview Section ────────────────────────────────── */}
          <RequestFormOverview
            year={year}
            onYearChange={handlers.yearChange}
            supervisorId={isSupervisor ? user?.id : undefined}
          />

          {/* ── Action Bar ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <RefreshButton isLoading={isFetching} refresh={refetch} />
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-xs text-gray-500">
                📋 Tổng:{' '}
                <strong className="text-blue-600">{getFilteredTotal()}</strong>{' '}
                đơn
              </span>
            </div>
          </div>

          {/* ── Filter Panel ────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
            <FilterPanel
              filters={filters}
              onFiltersChange={handlers.filtersChange}
              onClearFilters={handlers.clearFilters}
              isAdmin={true}
              searchText={searchText}
              onSearchTextChange={setSearchText}
            />
          </div>

          {/* ── Error Alert ─────────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
              <Alert
                message="Đã có lỗi xảy ra vui lòng thử lại sau"
                type="error"
                showIcon
              />
            </div>
          )}

          {/* ── Table ───────────────────────────────────────────── */}
          <Spin spinning={isLoading}>
            <DataTable
              data={filteredRequestForms}
              loading={isLoading}
              pagination={pagination}
              onView={handlers.view}
              onApprove={handlers.approve}
              onReject={handlers.reject}
              isAdmin={true}
              currentUserId={user?.id}
              userType={userType || undefined}
            />
          </Spin>
        </div>
      </ComponentCard>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết đơn yêu cầu"
        open={detailModalVisible}
        onCancel={closeModals}
        footer={null}
        width={960}
        styles={{
          body: {
            maxHeight: '85vh',
            overflowY: 'auto',
            scrollbarWidth: 'none' /* Firefox */,
            msOverflowStyle: 'none' /* IE and Edge */
          }
        }}
        className="[&_.ant-modal-body::-webkit-scrollbar]:hidden"
      >
        {selectedRecord && <RequestFormDetailView data={selectedRecord} />}
      </Modal>

      {/* Approval Modal */}
      <AdminActionModal
        visible={approvalModalVisible}
        record={selectedRecord}
        mode={approvalMode}
        loading={approveRejectMutation.isPending}
        currentUser={user}
        onCancel={() => {
          setApprovalModalVisible(false);
          setSelectedRecord(null);
        }}
        onApprove={(data: {
          digital_signature_supervisor?: File;
          digital_signature_manager?: File;
        }) => {
          if (selectedRecord) {
            approveRejectMutation.mutate({
              id: selectedRecord.id,
              data: {
                action: 'approve',
                digital_signature_supervisor: data.digital_signature_supervisor,
                digital_signature_manager: data.digital_signature_manager
              }
            });
          }
        }}
        onReject={(data: { action: 'reject'; rejection_reason: string }) => {
          if (selectedRecord) {
            approveRejectMutation.mutate({
              id: selectedRecord.id,
              data: {
                action: 'reject',
                rejection_reason: data.rejection_reason
              }
            });
          }
        }}
      />
    </>
  );
}
