import { useState } from 'react';
import QueryErrorNotice from '@components/common/QueryErrorNotice';
import RefreshButton from '@components/common/RefreshButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Empty, Popconfirm, message, Spin, Badge, Image } from 'antd';
import Button from '@components/common/AppButton';
import {
  FaPaperPlane,
  FaLightbulb,
  FaBug,
  FaExclamationTriangle,
  FaEllipsisH,
  FaReply,
  FaTrashAlt,
  FaClock
} from 'react-icons/fa';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

import ComponentCard from '@components/common/ComponentCard';
import AppButton from '@components/common/AppButton';
import FeedbackModal from '@components/feedback/FeedbackModal';
import {
  fetchMyFeedbacks,
  deleteMyFeedback,
  type FeedbackType,
  type FeedbackStatus
} from '@services/FeedbackService';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// ─── Constants ────────────────────────────────────────────────────────────────

const FEEDBACK_TYPES: {
  value: FeedbackType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'suggestion', label: 'Góp ý', icon: <FaLightbulb />, color: 'gold' },
  {
    value: 'complaint',
    label: 'Khiếu nại',
    icon: <FaExclamationTriangle />,
    color: 'red'
  },
  { value: 'bug', label: 'Báo lỗi', icon: <FaBug />, color: 'volcano' },
  { value: 'other', label: 'Khác', icon: <FaEllipsisH />, color: 'default' }
];

const STATUS_MAP: Record<FeedbackStatus, { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: 'orange' },
  reviewed: { label: 'Đã xem', color: 'blue' },
  resolved: { label: 'Đã xử lý', color: 'green' },
  rejected: { label: 'Từ chối', color: 'red' }
};

const getTypeInfo = (type: FeedbackType) =>
  FEEDBACK_TYPES.find((t) => t.value === type) ?? FEEDBACK_TYPES[3];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeFeedbackPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── Queries & Mutations ─────────────────────────────────────────────────

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['my-feedbacks'],
    queryFn: () => fetchMyFeedbacks({ per_page: 50 })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMyFeedback(id),
    onSuccess: () => {
      message.success('Đã xóa góp ý!');
      queryClient.invalidateQueries({ queryKey: ['my-feedbacks'] });
    },
    onError: () =>
      message.error('Xóa thất bại! Chỉ xóa được góp ý đang chờ duyệt.')
  });

  const feedbacks = data?.data ?? [];
  const pendingCount = feedbacks.filter((f) => f.status === 'pending').length;
  const repliedCount = feedbacks.filter((f) => f.admin_reply).length;

  return (
    <ComponentCard title="Góp ý của tôi" headingLevel={1}>
      <div className="space-y-5">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 p-4 dark:border-gray-700 dark:from-violet-900/10 dark:to-purple-900/10">
          <AppButton
            tone="purple"
            icon={<FaPaperPlane className="text-xs" />}
            onClick={() => setCreateOpen(true)}
          >
            Gửi góp ý mới
          </AppButton>
          <RefreshButton refresh={refetch} isLoading={isFetching} />

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs dark:bg-gray-800/50">
              <span className="text-gray-500">Tổng:</span>
              <span className="font-bold text-violet-600">
                {feedbacks.length}
              </span>
            </div>
            {pendingCount > 0 && (
              <Badge count={pendingCount} size="small">
                <div className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs dark:bg-orange-900/20">
                  <FaClock className="text-orange-400" />
                  <span className="font-medium text-orange-600">Chờ xử lý</span>
                </div>
              </Badge>
            )}
            {repliedCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs dark:bg-green-900/20">
                <FaReply className="text-green-500" />
                <span className="font-medium text-green-600">
                  {repliedCount} đã phản hồi
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Feedback List (Card-based) ────────────────────────── */}
        {isLoading || isFetching ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : isError && feedbacks.length === 0 ? (
          <QueryErrorNotice
            isError={isError}
            isFetching={isFetching}
            onRetry={refetch}
          />
        ) : feedbacks.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="space-y-2">
                <div className="text-gray-400">Bạn chưa gửi góp ý nào</div>
                <AppButton
                  tone="purple"
                  size="small"
                  icon={<FaPaperPlane className="text-xs" />}
                  onClick={() => setCreateOpen(true)}
                >
                  Gửi góp ý đầu tiên
                </AppButton>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb) => {
              const typeInfo = getTypeInfo(fb.type);
              const statusInfo = STATUS_MAP[fb.status];
              const isExpanded = expandedId === fb.id;
              const hasReply = !!fb.admin_reply;

              return (
                <div
                  key={fb.id}
                  className={`group rounded-xl border transition-all duration-200 ${
                    hasReply
                      ? 'border-violet-200 bg-gradient-to-r from-violet-50/50 to-purple-50/30 dark:border-violet-800/30 dark:from-violet-900/5 dark:to-purple-900/5'
                      : 'border-gray-100 bg-white hover:border-gray-200 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Card Header — always visible */}
                  <div
                    className="cursor-pointer px-4 py-3"
                    onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type icon */}
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                          fb.type === 'suggestion'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                            : fb.type === 'complaint'
                              ? 'bg-red-100 text-red-500 dark:bg-red-900/30'
                              : fb.type === 'bug'
                                ? 'bg-orange-100 text-orange-500 dark:bg-orange-900/30'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                        }`}
                      >
                        {typeInfo.icon}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                            {fb.subject}
                          </span>
                          {hasReply && (
                            <Tag
                              color="purple"
                              className="!m-0 shrink-0 !rounded-md !px-1.5 !text-[9px] !leading-4"
                            >
                              <FaReply className="mr-0.5 inline text-[8px]" />{' '}
                              Đã phản hồi
                            </Tag>
                          )}
                          {fb.image_url && (
                            <Tag
                              color="cyan"
                              className="!m-0 shrink-0 !rounded-md !px-1.5 !text-[9px] !leading-4"
                            >
                              📷 Ảnh
                            </Tag>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Tag
                            color={typeInfo.color}
                            className="!m-0 !rounded-md !text-[10px]"
                          >
                            {typeInfo.label}
                          </Tag>
                          <Tag
                            color={statusInfo.color}
                            className="!m-0 !rounded-md !text-[10px]"
                          >
                            {statusInfo.label}
                          </Tag>
                          <span>•</span>
                          <span>{dayjs(fb.created_at).fromNow()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {fb.status === 'pending' && (
                          <Popconfirm
                            title="Xóa góp ý này?"
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              deleteMutation.mutate(fb.id);
                            }}
                            onCancel={(e) => e?.stopPropagation()}
                            okText="Xóa"
                            cancelText="Hủy"
                          >
                            <Button
                              tone="inherit"
                              type="text"
                              size="small"
                              danger
                              icon={<FaTrashAlt className="text-xs" />}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="space-y-3 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
                      {/* My content */}
                      <div>
                        <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                          Nội dung
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                          {fb.content}
                        </div>
                      </div>

                      {/* Attached Image */}
                      {fb.image_url && (
                        <div>
                          <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                            Ảnh đính kèm
                          </div>
                          <Image
                            src={fb.image_url}
                            alt="Ảnh đính kèm"
                            className="!max-h-48 !rounded-lg !border !border-gray-200"
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                      )}

                      {/* Admin Reply */}
                      {hasReply && (
                        <div>
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-violet-500 uppercase">
                            <FaReply className="text-[9px]" /> Phản hồi từ Admin
                          </div>
                          <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:border-violet-800/30 dark:bg-violet-900/10 dark:text-gray-300">
                            {fb.admin_reply}
                          </div>
                          <div className="mt-1 text-[10px] text-gray-400">
                            {fb.replied_by_employee?.name || fb.replied_by} •{' '}
                            {fb.replied_at
                              ? dayjs(fb.replied_at).format('DD/MM/YYYY HH:mm')
                              : ''}
                          </div>
                        </div>
                      )}

                      {!hasReply && (
                        <div className="flex items-center gap-2 rounded-lg bg-orange-50/50 px-3 py-2 dark:bg-orange-900/10">
                          <FaClock className="text-xs text-orange-400" />
                          <span className="text-xs text-orange-500">
                            Đang chờ admin phản hồi...
                          </span>
                        </div>
                      )}

                      <div className="text-right text-[10px] text-gray-400">
                        Gửi lúc{' '}
                        {dayjs(fb.created_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Modal ────────────────────────────────────────── */}
      <FeedbackModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </ComponentCard>
  );
}
