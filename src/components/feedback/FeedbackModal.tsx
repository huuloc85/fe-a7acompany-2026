import { useRef, useState } from 'react';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Input, Select, message } from 'antd';
import {
  FaPaperPlane,
  FaLightbulb,
  FaBug,
  FaExclamationTriangle,
  FaEllipsisH,
  FaImage,
  FaTimesCircle
} from 'react-icons/fa';

import {
  createMyFeedback,
  type FeedbackType,
  type CreateFeedbackPayload
} from '@services/FeedbackService';

// ─── Constants ────────────────────────────────────────────────────────────────

const FEEDBACK_TYPES: {
  value: FeedbackType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'suggestion', label: 'Góp ý', icon: <FaLightbulb /> },
  { value: 'complaint', label: 'Khiếu nại', icon: <FaExclamationTriangle /> },
  { value: 'bug', label: 'Báo lỗi', icon: <FaBug /> },
  { value: 'other', label: 'Khác', icon: <FaEllipsisH /> }
];

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/gif',
  'image/webp'
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// ─── Component ────────────────────────────────────────────────────────────────

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Omit<CreateFeedbackPayload, 'image'>>({
    type: 'suggestion',
    subject: '',
    content: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imagePreview = useObjectUrl(imageFile);

  const createMutation = useMutation({
    mutationFn: (payload: CreateFeedbackPayload) => createMyFeedback(payload),
    onSuccess: () => {
      message.success('Đã gửi góp ý thành công! 🎉');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['my-feedbacks'] });
      onClose();
    },
    onError: () => message.error('Gửi góp ý thất bại!')
  });

  const resetForm = () => {
    setForm({ type: 'suggestion', subject: '', content: '' });
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!form.subject.trim() || !form.content.trim()) {
      message.warning('Vui lòng nhập tiêu đề và nội dung!');
      return;
    }
    createMutation.mutate({ ...form, image: imageFile });
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error('Chỉ chấp nhận file ảnh (jpeg, png, gif, webp)!');
      return;
    }
    if (file.size > MAX_SIZE) {
      message.error('Ảnh không được vượt quá 5MB!');
      return;
    }

    setImageFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <FaPaperPlane className="text-xs" />
          </div>
          <span className="font-bold text-gray-800 dark:text-white">
            Gửi góp ý
          </span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={createMutation.isPending}
      okText="Gửi"
      cancelText="Hủy"
      width={480}
      destroyOnHidden
    >
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Loại góp ý
          </label>
          <Select
            value={form.type}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
            className="!w-full"
            options={FEEDBACK_TYPES.map((t) => ({
              value: t.value,
              label: (
                <span className="flex items-center gap-2">
                  {t.icon} {t.label}
                </span>
              )
            }))}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Tiêu đề
          </label>
          <Input
            placeholder="Nhập tiêu đề ngắn gọn..."
            value={form.subject}
            onChange={(e) =>
              setForm((p) => ({ ...p, subject: e.target.value }))
            }
            maxLength={255}
            showCount
            className="!rounded-lg"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Nội dung
          </label>
          <Input.TextArea
            placeholder="Mô tả chi tiết góp ý / phản ánh của bạn..."
            value={form.content}
            onChange={(e) =>
              setForm((p) => ({ ...p, content: e.target.value }))
            }
            rows={5}
            maxLength={5000}
            showCount
            className="!rounded-lg"
          />
        </div>

        {/* ── Image Upload ── */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Ảnh đính kèm{' '}
            <span className="font-normal text-gray-300">
              (không bắt buộc, tối đa 5MB)
            </span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-40 rounded-lg border border-gray-200 object-contain shadow-sm"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
              >
                <FaTimesCircle className="text-xs" />
              </button>
              <div className="mt-1 max-w-[200px] truncate text-[10px] text-gray-400">
                {imageFile?.name} ({((imageFile?.size ?? 0) / 1024).toFixed(0)}{' '}
                KB)
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-5 text-sm text-gray-400 transition-all hover:border-violet-300 hover:bg-violet-50/30 hover:text-violet-500 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-violet-600 dark:hover:bg-violet-900/10"
            >
              <FaImage className="text-base" />
              <span>Bấm để chọn ảnh đính kèm</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
