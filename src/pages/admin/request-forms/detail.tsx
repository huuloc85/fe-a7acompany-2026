import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spin, Alert, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { DetailView, AdminActionModal } from '@components/RequestForm';
import {
  adminRequestFormService,
  supervisorRequestFormService
} from '@services/RequestFormService';
import {
  canUserApproveReject,
  getUserApprovalType
} from '@/utils/requestFormUtil';
import { useAuth } from '@hooks/useAuth';
import { useState } from 'react';
import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';

export default function RequestFormDetail() {
  const { id } = useParams({ from: '/_authenticated/admin/request-forms/$id' });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const queryClient = useQueryClient();
  const service =
    getUserApprovalType(user) === 'supervisor'
      ? supervisorRequestFormService
      : adminRequestFormService;
  const mutation = useMutation({
    mutationFn: (payload: {
      action: 'approve' | 'reject';
      rejection_reason?: string;
      digital_signature_supervisor?: File;
      digital_signature_manager?: File;
    }) =>
      payload.digital_signature_supervisor || payload.digital_signature_manager
        ? service.approveOrRejectWithSignatures(Number(id), payload)
        : service.approveOrReject(Number(id), payload),
    onSuccess: (response) => {
      message.success(response.message || 'Đã cập nhật đơn');
      setApprovalModalVisible(false);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = String(query.queryKey[0]);
          return (
            key.includes('request-form') ||
            [
              'attendances',
              'emp-attendance',
              'attendance-daily-results'
            ].includes(key)
          );
        }
      });
    },
    onError: (error: { response?: { data?: { message?: string } } }) =>
      message.error(error.response?.data?.message || 'Không thể xử lý đơn')
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-request-form-detail', id],
    queryFn: () => service.getDetail(Number(id)),
    enabled: !!id,
    // Performance optimizations
    staleTime: 30000, // Data fresh trong 30s
    gcTime: 10 * 60 * 1000, // Cache trong 10 phút
    refetchOnWindowFocus: true, // Refresh khi quay lại tab
    // Select chỉ data cần thiết
    select: (response) => response.data
  });

  const handleBack = () => {
    navigate({ to: '/admin/request-forms' });
  };

  const handleApproval = () => {
    setMode('approve');
    setApprovalModalVisible(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Quay lại
        </Button>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <Alert
            message="Lỗi"
            description="Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau."
            type="error"
            showIcon
          />
        </div>
      </div>
    );
  }

  const requestForm = data;

  if (!requestForm) {
    return (
      <div className="space-y-4">
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Quay lại
        </Button>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <Alert
            message="Không tìm thấy"
            description="Không tìm thấy đơn yêu cầu này."
            type="warning"
            showIcon
          />
        </div>
      </div>
    );
  }

  const { canApprove, canReject } = canUserApproveReject(requestForm, user);

  return (
    <ComponentCard title="Chi tiết đơn yêu cầu">
      <div className="space-y-5">
        {/* ── Action Bar ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
          <AppButton tone="neutral" onClick={handleBack}>
            <ArrowLeftOutlined />
            Quay lại danh sách
          </AppButton>
          {canApprove && (
            <AppButton tone="primary" onClick={handleApproval}>
              Duyệt đơn
            </AppButton>
          )}
          {canReject && (
            <Button
              danger
              onClick={() => {
                setMode('reject');
                setApprovalModalVisible(true);
              }}
            >
              Từ chối
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Tag
              color={
                requestForm.status === 'pending'
                  ? 'warning'
                  : requestForm.status === 'approved'
                    ? 'success'
                    : requestForm.status === 'rejected'
                      ? 'error'
                      : 'default'
              }
              className="!text-xs !font-bold !uppercase"
            >
              {requestForm.status === 'pending'
                ? 'Chờ duyệt'
                : requestForm.status === 'approved'
                  ? 'Đã duyệt'
                  : requestForm.status === 'rejected'
                    ? 'Đã từ chối'
                    : requestForm.status}
            </Tag>
          </div>
        </div>

        {/* ── Detail Content ───────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <DetailView data={requestForm} />
        </div>
      </div>

      {/* Approval Modal */}
      <AdminActionModal
        visible={approvalModalVisible}
        record={requestForm}
        mode={mode}
        loading={mutation.isPending}
        currentUser={user}
        onCancel={() => setApprovalModalVisible(false)}
        onApprove={(payload) => mutation.mutate(payload)}
        onReject={(payload) => mutation.mutate(payload)}
      />
    </ComponentCard>
  );
}
