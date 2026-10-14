import { isAllowRole } from '@utils/authUtil';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useIsMobile } from '@hooks/useIsMobile';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query';
import {
  Table,
  Input,
  Select,
  Space,
  Spin,
  Pagination,
  TableColumnsType,
  TableProps,
  Popconfirm,
  message,
  Drawer,
  Image
} from 'antd';
import {
  FaCommentDots,
  FaReply,
  FaTrashAlt,
  FaEye,
  FaSearch
} from 'react-icons/fa';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

import AppButton from '@components/common/AppButton';
import ComponentCard from '@components/common/ComponentCard';
import RefreshButton from '@components/common/RefreshButton';
import { customPaginationProps } from '@components/custom/PaginationProps.custom';
import { customTableProps } from '@components/custom/TableProps.custom';
import {
  fetchAllFeedbacks,
  deleteFeedback,
  replyFeedback,
  type Feedback,
  type FeedbackType,
  type FeedbackStatus,
  type ReplyFeedbackPayload
} from '@services/FeedbackService';
import { Route } from '@routes/_authenticated/admin/feedbacks/index';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<FeedbackType, string> = {
  suggestion: 'Góp ý',
  complaint: 'Khiếu nại',
  bug: 'Báo lỗi',
  other: 'Khác'
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; dot: string }> = {
  pending: { label: 'Chờ xử lý', dot: 'bg-amber-400' },
  reviewed: { label: 'Đã xem', dot: 'bg-blue-400' },
  resolved: { label: 'Đã xử lý', dot: 'bg-emerald-500' },
  rejected: { label: 'Từ chối', dot: 'bg-red-400' }
};

const TYPE_OPTIONS = [
  { value: 'suggestion', label: 'Góp ý' },
  { value: 'complaint', label: 'Khiếu nại' },
  { value: 'bug', label: 'Báo lỗi' },
  { value: 'other', label: 'Khác' }
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'resolved', label: 'Đã xử lý' },
  { value: 'rejected', label: 'Từ chối' }
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isSuperAdmin = isAllowRole(user, ['super admin']);
  const [anonymous, setAnonymous] = useState(true);
  const { highlightId } = Route.useSearch();
  const highlightHandled = useRef(false);

  // Phím "1" toggle ẩn danh (chỉ super admin)
  useEffect(() => {
    if (!isSuperAdmin) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '1') setAnonymous((prev) => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSuperAdmin]);

  const showIdentity = isSuperAdmin && !anonymous;

  const displayName = useCallback(
    (name?: string, id?: string) => {
      if (showIdentity) return name || id || 'N/A';
      return 'Ẩn Danh';
    },
    [showIdentity]
  );

  const displayId = useCallback(
    (id: string) => {
      if (showIdentity) return id;
      return '••••••';
    },
    [showIdentity]
  );

  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<FeedbackType | ''>('');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | ''>('');
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );

  const [replyForm, setReplyForm] = useState<ReplyFeedbackPayload>({
    admin_reply: '',
    status: 'resolved'
  });

  // ── Queries & Mutations ─────────────────────────────────────────────────

  const queryParams: Record<string, unknown> = { page, per_page: 20 };
  if (filterType) queryParams.type = filterType;
  if (filterStatus) queryParams.status = filterStatus;
  if (search.trim()) queryParams.search = search.trim();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-feedbacks', queryParams],
    queryFn: () => fetchAllFeedbacks(queryParams),
    placeholderData: keepPreviousData
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeedback(id),
    onSuccess: () => {
      message.success('Đã xóa góp ý!');
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
    },
    onError: () => message.error('Xóa thất bại!')
  });

  const replyMutation = useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: number;
      payload: ReplyFeedbackPayload;
    }) => replyFeedback(id, payload),
    onSuccess: () => {
      message.success('Đã phản hồi!');
      setReplyForm({ admin_reply: '', status: 'resolved' });
      setDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
    },
    onError: () => message.error('Phản hồi thất bại!')
  });

  const handleReply = () => {
    if (!replyForm.admin_reply.trim()) {
      message.warning('Vui lòng nhập phản hồi!');
      return;
    }
    if (selectedFeedback) {
      replyMutation.mutate({ id: selectedFeedback.id, payload: replyForm });
    }
  };

  const openDetail = useCallback((feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setReplyForm({
      admin_reply: feedback.admin_reply || '',
      status:
        feedback.status === 'pending' || feedback.status === 'reviewed'
          ? 'resolved'
          : feedback.status
    });
    setDetailOpen(true);
  }, []);

  const feedbacks = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;
  const pendingCount = feedbacks.filter((f) => f.status === 'pending').length;

  // ── Auto open detail from notification highlight ─────────────────────
  useEffect(() => {
    if (!highlightId || highlightHandled.current || feedbacks.length === 0)
      return;
    const target = feedbacks.find((f) => String(f.id) === highlightId);
    if (target) {
      highlightHandled.current = true;
      openDetail(target);
      // Scroll to row after short delay
      setTimeout(() => {
        const row = document.querySelector(`[data-row-key="${highlightId}"]`);
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [feedbacks, highlightId, openDetail]);

  // ── Table Columns ───────────────────────────────────────────────────────

  const columns: TableColumnsType<Feedback> = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_: unknown, __: Feedback, index: number) => (
        <span className="font-mono text-xs text-gray-400">
          {index + 1 + 20 * (page - 1)}
        </span>
      )
    },
    {
      title: 'Người gửi',
      key: 'employee',
      width: 170,
      render: (_: unknown, record: Feedback) => (
        <div>
          <div className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
            {displayName(record.employee?.name, record.employee_id)}
          </div>
          <div className="font-mono text-[10px] text-gray-400">
            {displayId(record.employee_id)}
          </div>
        </div>
      )
    },
    {
      title: 'Loại',
      key: 'type',
      width: 90,
      render: (_: unknown, record: Feedback) => (
        <span className="text-xs text-gray-500">{TYPE_LABEL[record.type]}</span>
      )
    },
    {
      title: 'Tiêu đề',
      key: 'subject',
      ellipsis: true,
      render: (_: unknown, record: Feedback) => (
        <span
          className="cursor-pointer text-sm font-medium text-gray-800 transition-colors hover:text-slate-600 dark:text-white/90"
          onClick={() => openDetail(record)}
        >
          {record.subject}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 110,
      align: 'center',
      render: (_: unknown, record: Feedback) => {
        const cfg = STATUS_CONFIG[record.status];
        return (
          <div className="flex items-center justify-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {cfg.label}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 120,
      align: 'center',
      render: (_: unknown, record: Feedback) => (
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {dayjs(record.created_at).format('DD/MM/YYYY')}
          </div>
          <div className="text-[10px] text-gray-400">
            {dayjs(record.created_at).fromNow()}
          </div>
        </div>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_: unknown, record: Feedback) => (
        <Space size={4}>
          <AppButton
            type="text"
            size="small"
            icon={<FaEye className="text-xs text-gray-400" />}
            onClick={() => openDetail(record)}
          />
          <Popconfirm
            title="Xóa góp ý này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <AppButton
              type="text"
              size="small"
              danger
              icon={<FaTrashAlt className="text-xs" />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const tableProps: TableProps<Feedback> = {
    ...(customTableProps as unknown as TableProps<Feedback>),
    rowKey: 'id',
    columns,
    dataSource: feedbacks,
    loading: isLoading,
    pagination: {
      ...customTableProps.pagination,
      current: page,
      pageSize: 20,
      total,
      showSizeChanger: false,
      onChange: (p) => setPage(p)
    },
    rowClassName: (record: Feedback) =>
      String(record.id) === highlightId ? 'feedback-highlight' : ''
  };

  return (
    <>
      <ComponentCard title="Góp ý & Phản hồi">
        <div className="space-y-4">
          {/* ── Action Bar ── */}
          <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4 dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/50">
            <div className="flex items-center gap-3">
              <RefreshButton isLoading={isFetching} refresh={refetch} />

              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {pendingCount} chờ xử lý
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Input
                placeholder="Tìm kiếm..."
                prefix={<FaSearch className="text-xs text-gray-300" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                allowClear
                className="!w-full !rounded-lg sm:!w-[200px]"
              />
              <Select
                allowClear
                placeholder="Loại"
                value={filterType || undefined}
                onChange={(v) => {
                  setFilterType(v || '');
                  setPage(1);
                }}
                className="!w-[calc(50%-4px)] sm:!w-[120px]"
                options={TYPE_OPTIONS}
              />
              <Select
                allowClear
                placeholder="Trạng thái"
                value={filterStatus || undefined}
                onChange={(v) => {
                  setFilterStatus(v || '');
                  setPage(1);
                }}
                className="!w-[calc(50%-4px)] sm:!w-[130px]"
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          {/* ── Content ── */}
          {isMobile ? (
            <Spin spinning={isLoading}>
              <div className="flex flex-col gap-3">
                {feedbacks.map((record, index) => {
                  const cfg = STATUS_CONFIG[record.status];
                  const isHighlighted = String(record.id) === highlightId;
                  return (
                    <div
                      key={record.id}
                      data-row-key={record.id}
                      className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 ${
                        isHighlighted
                          ? 'border-blue-300 ring-2 ring-blue-100 dark:border-blue-600 dark:ring-blue-900/30'
                          : 'border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {/* Card top: index + type + status */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {index + 1 + 20 * (page - 1)}
                          </span>
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            {TYPE_LABEL[record.type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                          />
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Subject */}
                      <div
                        className="cursor-pointer text-[15px] font-semibold text-gray-800 dark:text-white/90"
                        onClick={() => openDetail(record)}
                      >
                        {record.subject}
                      </div>

                      {/* Sender + time */}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          {displayName(
                            record.employee?.name,
                            record.employee_id
                          )}
                        </span>
                        <span>·</span>
                        <span>
                          {dayjs(record.created_at).format('DD/MM/YYYY')}
                        </span>
                        <span className="text-[10px]">
                          ({dayjs(record.created_at).fromNow()})
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                        <AppButton
                          size="small"
                          icon={<FaEye className="text-xs" />}
                          onClick={() => openDetail(record)}
                        >
                          Chi tiết
                        </AppButton>
                        <Popconfirm
                          title="Xóa góp ý này?"
                          onConfirm={() => deleteMutation.mutate(record.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <AppButton
                            size="small"
                            danger
                            icon={<FaTrashAlt className="text-xs" />}
                          >
                            Xóa
                          </AppButton>
                        </Popconfirm>
                      </div>
                    </div>
                  );
                })}
              </div>
              {total > 20 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    {...customPaginationProps}
                    current={page}
                    pageSize={20}
                    total={total}
                    onChange={(p) => setPage(p)}
                    size="small"
                    showSizeChanger={false}
                  />
                </div>
              )}
            </Spin>
          ) : (
            <Table {...tableProps} />
          )}
        </div>
      </ComponentCard>

      {/* ── Detail Drawer ── */}
      <Drawer
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <FaCommentDots className="text-xs" />
            </div>
            <span className="text-sm font-semibold text-gray-800 dark:text-white">
              Chi tiết góp ý
            </span>
          </div>
        }
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={
          typeof window !== 'undefined' && window.innerWidth < 640
            ? '100%'
            : 480
        }
      >
        {selectedFeedback && (
          <div className="space-y-5">
            {/* Header */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {TYPE_LABEL[selectedFeedback.type]}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selectedFeedback.status].dot}`}
                  />
                  <span className="text-xs text-gray-500">
                    {STATUS_CONFIG[selectedFeedback.status].label}
                  </span>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                {selectedFeedback.subject}
              </h3>
              <div className="mt-1 text-xs text-gray-400">
                {displayName(
                  selectedFeedback.employee?.name,
                  selectedFeedback.employee_id
                )}{' '}
                ·{' '}
                {dayjs(selectedFeedback.created_at).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="mb-1.5 block text-[10px] font-medium tracking-wider text-gray-400 uppercase">
                Nội dung
              </label>
              <div className="rounded-lg border border-slate-100 bg-white p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-gray-300">
                {selectedFeedback.content}
              </div>
            </div>

            {/* Image */}
            {selectedFeedback.image_url && (
              <div>
                <label className="mb-1.5 block text-[10px] font-medium tracking-wider text-gray-400 uppercase">
                  Ảnh đính kèm
                </label>
                <Image
                  src={selectedFeedback.image_url}
                  alt="Ảnh đính kèm"
                  className="!max-h-48 !rounded-lg"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}

            {/* ── Reply Section ── */}
            <div className="mt-1 border-t border-slate-100 pt-5 dark:border-slate-700">
              {selectedFeedback.admin_reply ? (
                /* ── Already replied — read only ── */
                <div className="space-y-2">
                  <label className="flex items-center gap-1 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                    <FaReply className="text-[8px]" /> Phản hồi từ Admin
                  </label>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selectedFeedback.status].dot}`}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {STATUS_CONFIG[selectedFeedback.status].label}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-gray-300">
                    {selectedFeedback.admin_reply}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {selectedFeedback.replied_by_employee?.name ||
                      selectedFeedback.replied_by}{' '}
                    ·{' '}
                    {selectedFeedback.replied_at
                      ? dayjs(selectedFeedback.replied_at).format(
                          'DD/MM/YYYY HH:mm'
                        )
                      : ''}
                  </div>
                </div>
              ) : (
                /* ── Not yet replied — form ── */
                <div className="space-y-4">
                  <label className="flex items-center gap-1 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                    <FaReply className="text-[8px]" /> Phản hồi góp ý
                  </label>

                  <Select
                    value={replyForm.status}
                    onChange={(v) => setReplyForm((p) => ({ ...p, status: v }))}
                    className="!w-full"
                    size="small"
                    options={[
                      {
                        value: 'resolved',
                        label: (
                          <span>
                            <span className="text-emerald-500">✓</span> Đã xử lý
                          </span>
                        )
                      },
                      {
                        value: 'rejected',
                        label: (
                          <span>
                            <span className="text-red-500">✕</span> Từ chối
                          </span>
                        )
                      }
                    ]}
                  />

                  <div className="mt-3">
                    <Input.TextArea
                      placeholder="Nhập nội dung phản hồi..."
                      value={replyForm.admin_reply}
                      onChange={(e) =>
                        setReplyForm((p) => ({
                          ...p,
                          admin_reply: e.target.value
                        }))
                      }
                      rows={3}
                      maxLength={5000}
                      showCount
                      className="!rounded-lg"
                    />
                  </div>

                  <AppButton
                    tone="primary"
                    icon={<FaReply className="text-xs" />}
                    block
                    onClick={handleReply}
                    loading={replyMutation.isPending}
                    className="!h-9"
                  >
                    Gửi phản hồi
                  </AppButton>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
