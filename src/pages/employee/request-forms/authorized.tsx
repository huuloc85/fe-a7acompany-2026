import { useState } from 'react';
import { authStore } from '@/stores/authStore';
import {
  Modal,
  Input,
  message,
  Table,
  TableColumnsType,
  TableProps,
  Tag,
  Space,
  Tooltip
} from 'antd';
import Button from '@components/common/AppButton';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { requestFormService } from '@/services/RequestFormService';
import {
  RequestForm,
  REQUEST_FORM_TYPES,
  REQUEST_FORM_STATUSES,
  RequestFormStatus,
  RequestFormType
} from '@/types/requestFormType';
import { SignaturePad } from '@/components/common/SignaturePad';
import { DetailView } from '@/components/RequestForm';
import RefreshButton from '@components/common/RefreshButton';
import QueryErrorNotice from '@components/common/QueryErrorNotice';
import { customTableProps } from '@components/custom/TableProps.custom';
import { dataURLToStandardFile } from '@/utils/signatureUtil';

const { TextArea } = Input;

function AuthorizedRequestFormsPage() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<RequestForm | null>(
    null
  );
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');

  // Fetch ALL requests (both pending and approved) với optimizations
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['authorized-request-forms-all'],
    queryFn: async () => {
      const response = await requestFormService.employee.getAuthorizedToMe({});
      return response;
    },
    // Realtime optimizations
    staleTime: 0, // Data luôn stale → refetch ngay khi cần
    gcTime: 5 * 60 * 1000, // Cache trong 5 phút
    refetchInterval: 5000, // Poll mỗi 5s → gần như realtime
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // Select optimization
    select: (response) => response.data || []
  });

  // Mutations với optimistic updates
  const approveMutation = useMutation({
    mutationFn: (params: { id: number; signatureFile: File }) =>
      requestFormService.employee.approveAsAuthorized(
        params.id,
        params.signatureFile
      ),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({
        queryKey: ['authorized-request-forms-all']
      });
      const previousData = queryClient.getQueryData([
        'authorized-request-forms-all'
      ]);

      // Optimistically update status
      queryClient.setQueryData(
        ['authorized-request-forms-all'],
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return old.map((form: RequestForm) =>
            form.id === id
              ? { ...form, status: 'authorized_approved' as RequestFormStatus }
              : form
          );
        }
      );

      return { previousData };
    },
    onSuccess: () => {
      message.success('Đã duyệt đơn thành công!');
      queryClient.invalidateQueries({
        queryKey: ['authorized-request-forms-all']
      });
      queryClient.invalidateQueries({ queryKey: ['employee-request-forms'] });
      closeApproveModal();
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['authorized-request-forms-all'],
          context.previousData
        );
      }
      message.error('Có lỗi xảy ra khi duyệt đơn!');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (params: { id: number; reason: string }) =>
      requestFormService.employee.rejectAsAuthorized(params.id, params.reason),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({
        queryKey: ['authorized-request-forms-all']
      });
      const previousData = queryClient.getQueryData([
        'authorized-request-forms-all'
      ]);

      // Optimistically update status
      queryClient.setQueryData(
        ['authorized-request-forms-all'],
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return old.map((form: RequestForm) =>
            form.id === id
              ? { ...form, status: 'rejected' as RequestFormStatus }
              : form
          );
        }
      );

      return { previousData };
    },
    onSuccess: () => {
      message.success('Đã từ chối đơn!');
      queryClient.invalidateQueries({
        queryKey: ['authorized-request-forms-all']
      });
      queryClient.invalidateQueries({ queryKey: ['employee-request-forms'] });
      closeRejectModal();
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['authorized-request-forms-all'],
          context.previousData
        );
      }
      message.error('Có lỗi xảy ra khi từ chối đơn!');
    }
  });

  // Modal handlers
  const closeApproveModal = () => {
    setIsApproveModalVisible(false);
    setSelectedRequest(null);
    setSignatureData('');
  };

  const closeRejectModal = () => {
    setIsRejectModalVisible(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  const handleViewDetail = async (record: RequestForm) => {
    // Fetch full detail từ API để có content đầy đủ
    try {
      const response = await requestFormService.employee.getDetail(record.id);
      const fullData = response.data;
      setSelectedRequest(fullData);
      setIsViewModalVisible(true);
    } catch {
      message.error('Không thể tải chi tiết đơn');
    }
  };

  const handleApprove = (record: RequestForm) => {
    setSelectedRequest(record);
    setIsApproveModalVisible(true);
  };

  const handleReject = (record: RequestForm) => {
    setSelectedRequest(record);
    setIsRejectModalVisible(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest || !signatureData) {
      message.warning('Vui lòng ký tên trước khi duyệt!');
      return;
    }

    try {
      const signatureFile = await dataURLToStandardFile(
        signatureData,
        `authorized_signature_${Date.now()}.png`
      );

      approveMutation.mutate({
        id: Number(selectedRequest.id),
        signatureFile
      });
    } catch (error) {
      console.error('Error processing signature:', error);
      message.error('Có lỗi khi xử lý chữ ký. Vui lòng vẽ lại.');
    }
  };

  const confirmReject = () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối!');
      return;
    }
    if (rejectionReason.length < 10) {
      message.warning('Lý do từ chối phải có ít nhất 10 ký tự!');
      return;
    }
    rejectMutation.mutate({
      id: Number(selectedRequest.id),
      reason: rejectionReason
    });
  };

  const requestForms = data || [];
  const totalCount = requestForms.length;

  // Helper: Get status color
  const getStatusColor = (status: RequestFormStatus): string => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'authorized_approved':
        return 'cyan';
      default:
        return 'default';
    }
  };

  // Helper: Check if can approve/reject
  const canApproveOrReject = (record: RequestForm): boolean => {
    if (authStore.state.user?.is_preview) return false;
    return record.status === 'pending';
  };

  // Table columns definition
  const columns: TableColumnsType<RequestForm> = [
    {
      title: 'STT',
      rowScope: 'row',
      align: 'center',
      width: 60,
      responsive: ['md' as const],
      render: (_value, _record, index) => index + 1
    },
    {
      title: 'Loại đơn',
      dataIndex: 'type',
      width: 160,
      render: (type: RequestFormType, record: RequestForm) => {
        const formData = record.form_data as Record<string, unknown>;
        let subtitle = '';

        if (type === 'don_xin_nghi_phep' && formData?.loai_nghi_phep) {
          subtitle = String(formData.loai_nghi_phep);
        } else if (
          type === 'don_xin_di_tre_ve_som' &&
          formData?.loai_di_tre_ve_som
        ) {
          subtitle =
            formData.loai_di_tre_ve_som === 'di_tre'
              ? 'Đi trễ'
              : formData.loai_di_tre_ve_som === 've_som'
                ? 'Về sớm'
                : 'Cả hai';
        } else if (type === 'giay_uy_quyen' && formData?.authorization_scope) {
          subtitle = `Ủy quyền: ${String(formData.authorization_scope)}`;
        }

        return (
          <div>
            <Tag color="blue" className="mb-1 font-medium">
              {REQUEST_FORM_TYPES[type]}
            </Tag>
            {subtitle && (
              <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Người tạo đơn',
      dataIndex: ['employee', 'name'],
      width: 180,
      render: (name: string, record: RequestForm) => (
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-gray-500">
            MSNV: {record.employee.id}
          </div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (status: RequestFormStatus) => (
        <Tag color={getStatusColor(status)} className="font-medium">
          {REQUEST_FORM_STATUSES[status]}
        </Tag>
      )
    },
    {
      title: 'Ngày nộp đơn',
      dataIndex: 'created_at',
      width: 140,
      responsive: ['sm' as const],
      render: (date: string) => (
        <span className="text-sm text-gray-600">
          {dayjs(date).format('DD/MM/YYYY HH:mm')}
        </span>
      )
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'approved_at',
      width: 140,
      responsive: ['md' as const],
      render: (date: string, record: RequestForm) => {
        if (record.status === 'approved' && date) {
          const approverInfo =
            record.approved_by && typeof record.approved_by === 'object'
              ? record.approved_by
              : null;
          const approverName = approverInfo
            ? (approverInfo as { name: string }).name
            : null;

          return (
            <div>
              <span className="text-sm text-green-600">
                {dayjs(date).format('DD/MM/YYYY HH:mm')}
              </span>
              {approverName && (
                <div className="mt-0.5 text-xs text-gray-500">
                  Duyệt bởi: {approverName}
                </div>
              )}
            </div>
          );
        } else if (record.status === 'rejected' && date) {
          const approverInfo =
            record.approved_by && typeof record.approved_by === 'object'
              ? record.approved_by
              : null;
          const approverName = approverInfo
            ? (approverInfo as { name: string }).name
            : null;

          return (
            <div>
              <span className="text-sm text-red-500">
                {dayjs(date).format('DD/MM/YYYY HH:mm')}
              </span>
              {approverName && (
                <div className="mt-0.5 text-xs text-gray-500">
                  Từ chối bởi: {approverName}
                </div>
              )}
            </div>
          );
        } else if (
          record.status === 'authorized_approved' &&
          record.authorized_approved_at
        ) {
          return (
            <span className="text-sm text-cyan-600">
              {dayjs(record.authorized_approved_at).format('DD/MM/YYYY HH:mm')}
            </span>
          );
        } else {
          return <span className="text-sm text-gray-400">-</span>;
        }
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              tone="inherit"
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>

          {canApproveOrReject(record) && (
            <>
              <Tooltip title="Duyệt đơn">
                <Button
                  tone="inherit"
                  type="text"
                  size="small"
                  style={{ color: '#52c41a' }}
                  icon={<CheckOutlined />}
                  onClick={() => handleApprove(record)}
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  tone="inherit"
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleReject(record)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      )
    }
  ];

  // Table props with standard structure
  const tableProps: TableProps<RequestForm> = {
    ...(customTableProps as unknown as TableProps<RequestForm>),
    rowKey: (record) => ['authorized-request', record.id].join('-'),
    columns: columns,
    dataSource: requestForms,
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      pageSize: 10,
      total: totalCount
    }
  };

  return (
    <>
      <div className="space-y-5">
        <QueryErrorNotice
          isError={isError}
          isFetching={isFetching}
          onRetry={refetch}
        />
        {/* ── Action Bar ──────────────────────────────────────── */}
        <div className="ui-toolbar flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <RefreshButton isLoading={isFetching} refresh={refetch} />
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800">
            <Tag color="blue" className="!m-0 !text-xs">
              📋 Tổng: <strong>{totalCount}</strong> đơn ủy quyền
            </Tag>
          </div>
        </div>

        {/* ── Mobile Card View ───────────────────────────────── */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Đang tải...
            </div>
          ) : requestForms.length > 0 ? (
            <div className="space-y-2">
              {requestForms.map((record) => (
                <div
                  key={record.id}
                  className="cursor-pointer rounded-xl border border-gray-100 bg-white p-3 shadow-sm active:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
                  onClick={() => handleViewDetail(record)}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Tag color="blue" className="!mb-1 !text-xs font-medium">
                        {REQUEST_FORM_TYPES[record.type]}
                      </Tag>
                      <div className="truncate text-xs text-gray-600">
                        {record.employee?.name}
                      </div>
                    </div>
                    <Tag
                      color={getStatusColor(record.status)}
                      className="!m-0 shrink-0 !text-[11px] font-medium"
                    >
                      {REQUEST_FORM_STATUSES[record.status]}
                    </Tag>
                  </div>
                  <div className="mb-2 text-[11px] text-gray-500">
                    {dayjs(record.created_at).format('DD/MM/YYYY HH:mm')}
                  </div>
                  <div
                    className="flex items-center gap-1 border-t border-gray-50 pt-2 dark:border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      tone="inherit"
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetail(record)}
                    >
                      Xem
                    </Button>
                    {canApproveOrReject(record) && (
                      <>
                        <div className="flex-1" />
                        <Button
                          tone="inherit"
                          type="text"
                          size="small"
                          style={{ color: '#52c41a' }}
                          icon={<CheckOutlined />}
                          onClick={() => handleApprove(record)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          tone="inherit"
                          type="text"
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => handleReject(record)}
                        >
                          Từ chối
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isError && (
              <div className="py-8 text-center text-sm text-gray-400">
                Không có đơn ủy quyền nào
              </div>
            )
          )}
        </div>

        {/* ── Desktop Table ──────────────────────────────────── */}
        <div className="hidden md:block">
          <Table<RequestForm>
            {...tableProps}
            onRow={(record) => ({
              onClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' }
            })}
          />
        </div>
      </div>

      {/* Modal Xem chi tiết */}
      <Modal
        title="Chi tiết đơn yêu cầu"
        open={isViewModalVisible}
        onCancel={() => {
          setIsViewModalVisible(false);
          setSelectedRequest(null);
        }}
        footer={[
          <Button
            tone="inherit"
            key="close"
            onClick={() => setIsViewModalVisible(false)}
          >
            Đóng
          </Button>
        ]}
        width="min(900px, 95vw)"
      >
        {selectedRequest && <DetailView data={selectedRequest} />}
      </Modal>

      {/* Modal Duyệt đơn */}
      <Modal
        title="Kí Nhận Uỷ Quyền"
        open={isApproveModalVisible}
        onOk={confirmApprove}
        onCancel={closeApproveModal}
        okText="Xác nhận duyệt"
        cancelText="Hủy"
        confirmLoading={approveMutation.isPending}
        width="min(600px, 95vw)"
        okButtonProps={{
          icon: <CheckOutlined />,
          disabled: !signatureData
        }}
      >
        {selectedRequest && (
          <div className="mt-4 space-y-4">
            {/* Request Info Card */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="mb-1 font-medium text-gray-800">
                {
                  REQUEST_FORM_TYPES[
                    selectedRequest.type as keyof typeof REQUEST_FORM_TYPES
                  ]
                }
              </p>
              <p className="text-sm text-gray-600">
                Người ủy quyền:{' '}
                <span className="font-medium">
                  {selectedRequest.employee.name} cho bạn
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Ngày tạo:{' '}
                {dayjs(selectedRequest.created_at).format('DD/MM/YYYY HH:mm')}
              </p>
              <span className="text-xs text-gray-500">
                {' '}
                - Vui lòng ký tên để xác nhận bạn đã nhận được ủy quyền từ người
                này.
              </span>
            </div>

            {/* Signature Section */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Chữ ký điện tử <span className="text-red-500">*</span>
              </label>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
                <SignaturePad
                  onSignatureChange={(signature) =>
                    setSignatureData(signature || '')
                  }
                  height={200}
                />
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">
                Vẽ chữ ký của bạn trong khung trên
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Từ chối đơn */}
      <Modal
        title="Từ chối đơn yêu cầu"
        open={isRejectModalVisible}
        onOk={confirmReject}
        onCancel={closeRejectModal}
        okText="Xác nhận từ chối"
        okButtonProps={{
          danger: true,
          icon: <CloseOutlined />,
          disabled: !rejectionReason || rejectionReason.length < 10
        }}
        cancelText="Hủy"
        confirmLoading={rejectMutation.isPending}
        width="min(600px, 95vw)"
      >
        {selectedRequest && (
          <div className="mt-4 space-y-4">
            {/* Request Info Card */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="mb-1 font-medium text-gray-800">
                {
                  REQUEST_FORM_TYPES[
                    selectedRequest.type as keyof typeof REQUEST_FORM_TYPES
                  ]
                }
              </p>
              <p className="text-sm text-gray-600">
                Người ủy quyền:{' '}
                <span className="font-medium">
                  {selectedRequest.employee.name}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Ngày tạo:{' '}
                {dayjs(selectedRequest.created_at).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>

            {/* Rejection Reason */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <TextArea
                rows={5}
                placeholder="Vui lòng nhập lý do từ chối đơn này (tối thiểu 10 ký tự)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                maxLength={500}
                showCount
                className="rounded-lg"
              />
            </div>

            {/* Notice */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Lưu ý:</strong> Người ủy quyền sẽ nhận được thông báo
                về việc từ chối này cùng với lý do bạn đã ghi.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default AuthorizedRequestFormsPage;
