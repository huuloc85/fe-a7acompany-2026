import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Empty, Popconfirm, message, Spin, Image, Drawer } from 'antd';
import {
  FaPaperPlane,
  FaReply,
  FaTrashAlt,
  FaClock,
  FaCommentDots,
  FaChevronDown
} from 'react-icons/fa';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

import AppButton from '@components/common/AppButton';
import FeedbackModal from '@components/feedback/FeedbackModal';
import FeedbackStatusTag from './FeedbackStatusTag';
import {
  fetchMyFeedbacks,
  deleteMyFeedback,
  type FeedbackType,
  type FeedbackStatus
} from '@services/FeedbackService';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface FeedbackDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackDrawer({ open, onClose }: FeedbackDrawerProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['my-feedbacks'],
    queryFn: () => fetchMyFeedbacks({ per_page: 50 }),
    enabled: open
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMyFeedback(id),
    onSuccess: () => {
      message.success('Đã xóa góp ý!');
      queryClient.invalidateQueries({ queryKey: ['my-feedbacks'] });
    },
    onError: () => message.error('Xóa thất bại!')
  });

  const feedbacks = data?.data ?? [];

  return (
    <>
      <Drawer
        rootClassName="app-material-drawer"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <FaCommentDots className="text-sm" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-white">
                  Góp ý của tôi
                </div>
                <div className="text-[10px] font-normal text-gray-400">
                  {feedbacks.length} góp ý
                </div>
              </div>
            </div>
            <AppButton
              tone="primary"
              size="small"
              icon={<FaPaperPlane className="text-[10px]" />}
              onClick={() => setCreateOpen(true)}
              className="!text-xs"
            >
              Gửi mới
            </AppButton>
          </div>
        }
        open={open}
        onClose={onClose}
        width={
          typeof window !== 'undefined' && window.innerWidth < 640
            ? '100%'
            : 400
        }
        styles={{ body: { padding: '8px 12px' } }}
      >
        {/* ── Anonymous Notice ── */}
        <div className="mb-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-3.5 py-3 dark:border-emerald-800/40 dark:from-emerald-900/20 dark:to-teal-900/20">
          <p className="text-[11.5px] leading-relaxed text-emerald-700 dark:text-emerald-300">
            Mọi góp ý của bạn gửi đến quản lý hoặc IT đều được{' '}
            <span className="font-bold text-emerald-900 dark:text-emerald-100">
              ẩn danh hoàn toàn
            </span>
            . Chúng tôi cam kết{' '}
            <span className="font-bold text-emerald-900 dark:text-emerald-100">
              không ai biết bạn là ai
            </span>
            .
          </p>
        </div>

        {isLoading || isFetching ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : feedbacks.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="space-y-2 text-center">
                <div className="text-sm text-gray-400">Chưa có góp ý nào</div>
                <AppButton
                  tone="primary"
                  size="small"
                  icon={<FaPaperPlane className="text-[10px]" />}
                  onClick={() => setCreateOpen(true)}
                  className="!text-xs"
                >
                  Gửi góp ý đầu tiên
                </AppButton>
              </div>
            }
          />
        ) : (
          <div className="space-y-1.5">
            {feedbacks.map((fb) => {
              const isExpanded = expandedId === fb.id;
              const hasReply = !!fb.admin_reply;
              const statusCfg = STATUS_CONFIG[fb.status];

              return (
                <div
                  key={fb.id}
                  className={`group rounded-lg border transition-all duration-150 ${
                    isExpanded
                      ? 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30'
                      : 'border-transparent hover:border-slate-100 hover:bg-slate-50/30 dark:hover:border-slate-800 dark:hover:bg-slate-800/20'
                  }`}
                >
                  {/* Header */}
                  <div
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2"
                    onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                  >
                    {/* Status dot */}
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${statusCfg.dot}`}
                    />

                    {/* Title */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-gray-800 dark:text-white/90">
                          {fb.subject}
                        </span>
                        {hasReply && (
                          <FaReply className="shrink-0 text-[9px] text-violet-400" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span>{TYPE_LABEL[fb.type]}</span>
                        <span>·</span>
                        <FeedbackStatusTag status={fb.status} />
                        <span>·</span>
                        <span>{dayjs(fb.created_at).fromNow()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
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
                          <AppButton
                            type="text"
                            size="small"
                            danger
                            icon={<FaTrashAlt className="text-[9px]" />}
                            onClick={(e) => e.stopPropagation()}
                            className="!h-6 !w-6 !min-w-0"
                          />
                        </Popconfirm>
                      )}
                      <FaChevronDown
                        className={`text-[8px] text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="space-y-2.5 border-t border-slate-100 px-3 py-2.5 dark:border-slate-700/50">
                      <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                        {fb.content}
                      </div>

                      {fb.image_url && (
                        <Image
                          src={fb.image_url}
                          alt="Ảnh đính kèm"
                          className="!max-h-36 !rounded-lg"
                          style={{ objectFit: 'contain' }}
                        />
                      )}

                      {hasReply && (
                        <div className="rounded-lg border border-slate-100 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <FaReply className="text-[8px]" /> Phản hồi từ Admin
                          </div>
                          <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {fb.admin_reply}
                          </div>
                          <div className="mt-1.5 text-[9px] text-gray-400">
                            {fb.replied_by_employee?.name || fb.replied_by} ·{' '}
                            {fb.replied_at
                              ? dayjs(fb.replied_at).format('DD/MM/YYYY HH:mm')
                              : ''}
                          </div>
                        </div>
                      )}

                      {!hasReply && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <FaClock className="text-[9px]" />
                          <span>Đang chờ phản hồi...</span>
                        </div>
                      )}

                      <div className="text-right text-[9px] text-gray-300">
                        {dayjs(fb.created_at).format('DD/MM/YYYY HH:mm')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      <FeedbackModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
