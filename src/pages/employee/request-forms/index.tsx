import { useState, useEffect, useMemo } from 'react';
import { message, Modal, Alert, Spin, Tabs, Tag } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '@/hooks/useAuth';
import { usePrefetchAuthorizableEmployees } from '@/hooks/useAuthorizedEmployee';
import AppButton from '@components/common/AppButton';
import RefreshButton from '@components/common/RefreshButton';
import ComponentCard from '@components/common/ComponentCard';
import {
  DataTable,
  FilterPanel,
  ConfirmDeleteModal,
  DetailView,
  CreateEditModal,
  DelegationSignModal,
  RequestFormDetailView
} from '@components/RequestForm';
import { EmployeeRequestFormOverview } from '@components/RequestForm/EmployeeRequestFormOverview';
import AdminActionModal from '@components/RequestForm/AdminModals';
import {
  employeeRequestFormService,
  supervisorRequestFormService,
  requestFormService
} from '@services/RequestFormService';
import {
  RequestForm,
  RequestFormFilters as RequestFormFiltersType
} from '@/types/requestFormType';
import { SUPERVISOR_IDS } from '@/constants/supervisors';
import { getUserApprovalType, isRequestFormSupervisor } from '@utils/authUtil';
import { FaFileAlt, FaCheckDouble } from 'react-icons/fa';

export default function RequestFormList() {
  const { user } = useAuth();
  const prefetchEmployees = usePrefetchAuthorizableEmployees();

  // Check if user is supervisor (shared with onboarding step filtering)
  const isSupervisor = isRequestFormSupervisor(user);
  const userType = getUserApprovalType(user, [...SUPERVISOR_IDS]);

  // Active tab state
  const [activeTab, setActiveTab] = useState('my-requests');

  // Year & Date Range state
  const [year, setYear] = useState<Dayjs>(dayjs());

  const DEFAULT_FILTERS: RequestFormFiltersType = {
    per_page: 15,
    page: 1,
    from_date: dayjs().startOf('year').format('YYYY-MM-DD'),
    to_date: dayjs().endOf('year').format('YYYY-MM-DD')
  };

  const [filters, setFilters] =
    useState<RequestFormFiltersType>(DEFAULT_FILTERS);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<RequestForm | null>(
    null
  );
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RequestForm | null>(
    null
  );
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [delegationSignModalVisible, setDelegationSignModalVisible] =
    useState(false);

  // Admin/Supervisor approval states
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>(
    'approve'
  );

  const queryClient = useQueryClient();

  // Prefetch employees list when component mounts for faster detail view loading
  useEffect(() => {
    prefetchEmployees();
  }, [prefetchEmployees]);

  // Helper function để invalidate queries
  const invalidateRequestForms = () => {
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['emp-attendance'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-daily-results'] });
    queryClient.invalidateQueries({
      queryKey: ['employee-request-forms']
    });
    // Also invalidate supervisor queries if supervisor
    if (isSupervisor) {
      queryClient.invalidateQueries({
        queryKey: ['supervisor-request-forms']
      });
    }
  };

  const closeModals = () => {
    setApprovalModalVisible(false);
    setDelegationSignModalVisible(false);
    setDetailModalVisible(false);
    setSelectedRecord(null);
  };

  // Fetch request forms với filters và optimizations
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['employee-request-forms', filters],
    queryFn: () => employeeRequestFormService.getList(filters),
    // Realtime optimizations
    staleTime: 0, // Data luôn stale → refetch ngay khi cần
    gcTime: 5 * 60 * 1000, // Cache trong 5 phút
    refetchInterval: 5000, // Poll mỗi 5s → gần như realtime
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // Giữ data cũ khi chuyển trang
    placeholderData: (previousData) => previousData,
    // Select optimization
    select: (response) => ({
      data: response.data?.data || [],
      total: response.data?.total || 0,
      current_page: response.data?.current_page || 1,
      per_page: response.data?.per_page || 15,
      last_page: response.data?.last_page || 1
    })
  });

  // Delete mutation với optimistic updates
  const { mutate: deleteRequest, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => {
      return employeeRequestFormService.delete(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['employee-request-forms'] });
      const previousData = queryClient.getQueryData([
        'employee-request-forms',
        filters
      ]);

      // Optimistically remove from list
      queryClient.setQueryData(
        ['employee-request-forms', filters],
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
            data: old.data.filter((form: RequestForm) => form.id !== id),
            total: ('total' in old ? (old.total as number) : 0) - 1
          };
        }
      );

      return { previousData };
    },
    onSuccess: () => {
      message.success('Đã xóa đơn yêu cầu thành công');
      invalidateRequestForms();
      setDeleteModalVisible(false);
      setDeletingRecord(null);
    },
    onError: (
      error: { response?: { data?: { message?: string } } },
      _,
      context
    ) => {
      console.error('❌ Delete error:', error);
      if (context?.previousData) {
        queryClient.setQueryData(
          ['employee-request-forms', filters],
          context.previousData
        );
      }
      message.error(
        error?.response?.data?.message || 'Có lỗi xảy ra khi xóa đơn'
      );
    }
  });

  // Delegation sign mutation với optimistic updates
  const { mutate: signDelegation, isPending: isSigning } = useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: number;
      data: {
        digital_signature_delegator?: File;
        digital_signature_authorized?: File;
      };
    }) => employeeRequestFormService.signDelegation(id, data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['employee-request-forms'] });
      const previousData = queryClient.getQueryData([
        'employee-request-forms',
        filters
      ]);
      return { previousData };
    },
    onSuccess: () => {
      message.success('Đã ký đơn ủy quyền thành công');
      invalidateRequestForms();
      closeModals();
    },
    onError: (
      error: { response?: { data?: { message?: string } } },
      _,
      context
    ) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['employee-request-forms', filters],
          context.previousData
        );
      }
      message.error(
        error?.response?.data?.message || 'Có lỗi xảy ra khi ký đơn'
      );
    }
  });

  // ============================================
  // ADMIN/SUPERVISOR TAB QUERIES & MUTATIONS
  // ============================================

  // Fetch request forms for supervisor tab (BE đã filter sẵn theo supervisor_id)
  const {
    data: adminData,
    isLoading: adminIsLoading,
    isFetching: adminIsFetching,
    error: adminError,
    refetch: adminRefetch
  } = useQuery({
    queryKey: ['supervisor-request-forms', filters],
    queryFn: () => supervisorRequestFormService.getList(filters),
    enabled: !!(isSupervisor && activeTab === 'approval'), // Only fetch when supervisor and on approval tab
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: activeTab === 'approval' ? 5000 : false, // Only poll when on approval tab
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
    select: (response) => ({
      data: response.data?.data || [],
      total: response.data?.total || 0,
      current_page: response.data?.current_page || 1,
      per_page: response.data?.per_page || 15,
      last_page: response.data?.last_page || 1
    })
  });

  // Approval mutation for admin/supervisor
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
      };
    }) => {
      const { action, digital_signature_supervisor, rejection_reason } = data;

      if (action === 'reject') {
        return await requestFormService.supervisor.approveOrReject(id, {
          action,
          rejection_reason
        });
      }

      // For approve action
      const hasSignatures = digital_signature_supervisor;
      return hasSignatures
        ? await requestFormService.supervisor.approveOrRejectWithSignatures(
            id,
            {
              action,
              digital_signature_supervisor
            }
          )
        : await requestFormService.supervisor.approveOrReject(id, { action });
    },
    onMutate: async ({ id, data: actionData }) => {
      await queryClient.cancelQueries({
        queryKey: ['supervisor-request-forms']
      });
      const previousData = queryClient.getQueryData([
        'supervisor-request-forms',
        filters
      ]);

      queryClient.setQueryData(
        ['supervisor-request-forms', filters],
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
      invalidateRequestForms();
      closeModals();
    },
    onError: (
      error: Error & { response?: { data?: { message?: string } } },
      _,
      context
    ) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['supervisor-request-forms', filters],
          context.previousData
        );
      }
      console.error('Approve/Reject error:', error);
      message.error(
        `Có lỗi xảy ra: ${error.response?.data?.message || error.message}`
      );
    }
  });

  // Mutation để duyệt trực tiếp đơn Giấy Ủy Quyền
  const { mutate: approveDirectly } = useMutation({
    mutationFn: (id: number) =>
      requestFormService.supervisor.approveOrReject(id, { action: 'approve' }),
    onSuccess: () => {
      message.destroy();
      message.success('Đơn ủy quyền đã được duyệt thành công!');
      invalidateRequestForms();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.destroy();
      message.error(
        error?.response?.data?.message || 'Có lỗi xảy ra khi duyệt đơn'
      );
    }
  });

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleView = async (record: RequestForm) => {
    // Fetch full detail từ API để có content đầy đủ
    try {
      const service =
        activeTab === 'approval'
          ? supervisorRequestFormService
          : employeeRequestFormService;
      const response = await service.getDetail(record.id);
      const fullData = response.data;
      setSelectedRecord(fullData);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Error fetching detail:', error);
      message.error('Không thể tải chi tiết đơn');
    }
  };

  const handleEdit = (record: RequestForm) => {
    setSelectedRecord(record);
    setEditModalVisible(true);
  };

  const handleDelete = (record: RequestForm) => {
    setDeletingRecord(record);
    setDeleteModalVisible(true);
  };

  const handleSignDelegation = (record: RequestForm) => {
    setSelectedRecord(record);
    setDelegationSignModalVisible(true);
  };

  const handleApprove = (record: RequestForm) => {
    if (record.type === 'giay_uy_quyen') {
      message.loading('Đang duyệt đơn ủy quyền...', 0);
      approveDirectly(record.id);
    } else {
      setSelectedRecord(record);
      setApprovalMode('approve');
      setApprovalModalVisible(true);
    }
  };

  const handleReject = (record: RequestForm) => {
    setSelectedRecord(record);
    setApprovalMode('reject');
    setApprovalModalVisible(true);
  };

  const confirmDelete = () => {
    if (deletingRecord) {
      deleteRequest(deletingRecord.id);
    }
  };

  const handleFiltersChange = (newFilters: RequestFormFiltersType) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      from_date: year.startOf('year').format('YYYY-MM-DD'),
      to_date: year.endOf('year').format('YYYY-MM-DD')
    });
  };

  const handleYearChange = (date: Dayjs) => {
    setYear(date);
    setFilters((prev) => ({
      ...prev,
      from_date: date.startOf('year').format('YYYY-MM-DD'),
      to_date: date.endOf('year').format('YYYY-MM-DD'),
      page: 1
    }));
  };

  const handleTableChange = (page: number, pageSize?: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      per_page: pageSize || prev.per_page
    }));
  };

  const requestForms = data?.data || [];
  const pagination = data
    ? {
        current: data.current_page,
        total: data.total,
        pageSize: data.per_page,
        onChange: handleTableChange
      }
    : undefined;

  // Admin data and pagination for supervisor approval tab
  const adminRequestForms = useMemo(
    () => adminData?.data || [],
    [adminData?.data]
  );
  const adminPagination = adminData
    ? {
        current: adminData.current_page,
        total: adminData.total,
        pageSize: adminData.per_page,
        onChange: handleTableChange
      }
    : undefined;

  // Client-side search for supervisor tab
  const [supervisorSearchText, setSupervisorSearchText] = useState('');
  const filteredAdminRequestForms = useMemo(() => {
    if (!supervisorSearchText.trim()) return adminRequestForms;
    const keyword = supervisorSearchText.trim().toLowerCase();
    return adminRequestForms.filter((form) => {
      const name = form.employee?.name?.toLowerCase() || '';
      const id = form.employee?.id?.toString() || '';
      return name.includes(keyword) || id.includes(keyword);
    });
  }, [adminRequestForms, supervisorSearchText]);

  // Define tabs
  const tabItems = [
    {
      key: 'my-requests',
      label: (
        <span className="flex items-center gap-2 text-sm font-medium">
          <FaFileAlt className="text-blue-500" />
          Đơn của tôi
        </span>
      ),
      children: (
        <div className="space-y-5">
          {/* ── Overview ────────────────────────────────────── */}
          <EmployeeRequestFormOverview
            mode="employee"
            year={year}
            onYearChange={handleYearChange}
          />

          {/* ── Action Bar ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <AppButton
              data-tour="request-create"
              tone="success"
              onClick={() => setCreateModalVisible(true)}
            >
              <PlusOutlined />
              Tạo đơn mới
            </AppButton>
            <RefreshButton isLoading={isFetching} refresh={refetch} />
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
              <Tag color="blue" className="!m-0 !text-xs">
                📋 Tổng: <strong>{data?.total ?? 0}</strong> đơn
              </Tag>
            </div>
          </div>

          {/* ── Filter Panel ───────────────────────────────── */}
          <div
            data-tour="request-filters"
            className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50"
          >
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              isAdmin={false}
            />
          </div>

          {/* ── Error Alert ────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
              <Alert
                message="Đã có lỗi xảy ra vui lòng thử lại sau"
                type="error"
                showIcon
              />
            </div>
          )}

          {/* ── Table ──────────────────────────────────────── */}
          <Spin spinning={isLoading}>
            <DataTable
              data={requestForms}
              loading={isLoading}
              pagination={pagination}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSignDelegation={handleSignDelegation}
              isAdmin={false}
              hideSignDelegation={true}
            />
          </Spin>
        </div>
      )
    },
    ...(isSupervisor
      ? [
          {
            key: 'approval',
            label: (
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  data-tour="request-approval-tab"
                  className="flex items-center gap-2"
                >
                  <FaCheckDouble className="text-emerald-500" />
                  Duyệt đơn
                </span>
              </span>
            ),
            children: (
              <div className="space-y-5">
                {/* ── Overview ──────────────────────────────── */}
                <EmployeeRequestFormOverview
                  mode="supervisor"
                  year={year}
                  onYearChange={handleYearChange}
                />

                {/* ── Action Bar ────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
                  <RefreshButton
                    isLoading={adminIsFetching}
                    refresh={adminRefetch}
                  />
                  <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
                    <Tag color="blue" className="!m-0 !text-xs">
                      📋 Tổng: <strong>{adminData?.total ?? 0}</strong> đơn
                    </Tag>
                  </div>
                </div>

                {/* ── Filter Panel ─────────────────────────── */}
                <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    onClearFilters={handleClearFilters}
                    isAdmin={true}
                    searchText={supervisorSearchText}
                    onSearchTextChange={setSupervisorSearchText}
                  />
                </div>

                {/* ── Error Alert ───────────────────────────── */}
                {adminError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
                    <Alert
                      message="Đã có lỗi xảy ra vui lòng thử lại sau"
                      type="error"
                      showIcon
                    />
                  </div>
                )}

                {/* ── Table ────────────────────────────────── */}
                <Spin spinning={adminIsLoading}>
                  <DataTable
                    data={filteredAdminRequestForms}
                    loading={adminIsLoading}
                    pagination={adminPagination}
                    onView={handleView}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onSignDelegation={handleSignDelegation}
                    isAdmin={true}
                    currentUserId={user?.id}
                    userType={userType || undefined}
                  />
                </Spin>
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <>
      <ComponentCard
        title={
          <div className="flex items-center gap-3">
            <FaFileAlt className="text-blue-500" />
            <span>Quản lý đơn yêu cầu</span>
          </div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          type="card"
          size="large"
          animated
        />
      </ComponentCard>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={deleteModalVisible}
        record={deletingRecord}
        loading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingRecord(null);
        }}
      />

      {/* Detail Modal */}
      <Modal
        title="Chi tiết đơn yêu cầu"
        open={detailModalVisible}
        onCancel={closeModals}
        footer={null}
        width="min(960px, 95vw)"
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
        {selectedRecord &&
          (activeTab === 'approval' ? (
            <RequestFormDetailView data={selectedRecord} />
          ) : (
            <DetailView data={selectedRecord} />
          ))}
      </Modal>

      {/* Approval Modal - Only for supervisor */}
      {isSupervisor && (
        <AdminActionModal
          visible={approvalModalVisible}
          record={selectedRecord}
          mode={approvalMode}
          loading={approveRejectMutation.isPending}
          currentUser={user}
          onCancel={closeModals}
          onApprove={(data: { digital_signature_supervisor?: File }) => {
            if (selectedRecord) {
              approveRejectMutation.mutate({
                id: selectedRecord.id,
                data: {
                  action: 'approve',
                  digital_signature_supervisor:
                    data.digital_signature_supervisor
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
      )}

      {/* Delegation Sign Modal */}
      <DelegationSignModal
        visible={delegationSignModalVisible}
        record={selectedRecord}
        loading={isSigning}
        currentUserId={user?.id}
        onCancel={closeModals}
        onSign={(data) => {
          if (selectedRecord) {
            signDelegation({ id: selectedRecord.id, data });
          }
        }}
      />

      {/* Create Modal */}
      <Modal
        title={null}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width="min(1000px, 95vw)"
        styles={{
          body: {
            height: 'auto',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            padding: '0',
            margin: '0',
            border: 'none',
            borderRadius: '0',
            scrollbarWidth: 'none' /* Firefox */,
            msOverflowStyle: 'none' /* IE and Edge */
          },
          content: {
            padding: '0',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }}
        className="seamless-modal [&_.ant-modal-body::-webkit-scrollbar]:hidden"
      >
        <CreateEditModal
          onSuccess={() => {
            setCreateModalVisible(false);
            invalidateRequestForms();
          }}
          onCancel={() => {
            setCreateModalVisible(false);
          }}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={null}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={null}
        width="min(1000px, 95vw)"
        styles={{
          body: {
            height: 'auto',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            padding: '0',
            margin: '0',
            border: 'none',
            borderRadius: '0',
            scrollbarWidth: 'none' /* Firefox */,
            msOverflowStyle: 'none' /* IE and Edge */
          },
          content: {
            padding: '0',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }}
        className="seamless-modal [&_.ant-modal-body::-webkit-scrollbar]:hidden"
      >
        {selectedRecord && (
          <CreateEditModal
            editData={selectedRecord}
            onSuccess={async () => {
              setEditModalVisible(false);
              invalidateRequestForms();

              // Nếu DetailView đang mở, refetch detail để hiển thị chữ ký mới
              if (detailModalVisible && selectedRecord) {
                try {
                  const service =
                    activeTab === 'approval'
                      ? supervisorRequestFormService
                      : employeeRequestFormService;
                  const response = await service.getDetail(selectedRecord.id);
                  const updatedData = response.data;
                  setSelectedRecord(updatedData);
                } catch (error) {
                  console.error('Error refreshing detail:', error);
                }
              } else {
                // Nếu DetailView không mở, clear selectedRecord
                setSelectedRecord(null);
              }
            }}
            onCancel={() => {
              setEditModalVisible(false);
              // Không clear selectedRecord khi cancel để DetailView vẫn hiển thị
            }}
          />
        )}
      </Modal>
    </>
  );
}
