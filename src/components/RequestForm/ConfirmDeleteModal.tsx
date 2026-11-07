import React from 'react';
import { Modal } from 'antd';
import Button from '@components/common/AppButton';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { RequestForm } from '@/types/requestFormType';

interface DeleteConfirmModalProps {
  visible: boolean;
  record: RequestForm | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  record,
  loading = false,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ExclamationCircleOutlined className="text-orange-500" />
          <span>Xóa đơn yêu cầu</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width="min(400px, 92vw)"
      footer={[
        <Button tone="inherit" key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button
          tone="inherit"
          key="confirm"
          type="primary"
          danger
          loading={loading}
          onClick={onConfirm}
        >
          Xóa
        </Button>
      ]}
    >
      <div className="py-2">
        <p className="mb-3 text-gray-700">
          Bạn có chắc chắn muốn xóa đơn này không?
        </p>

        {record && (
          <div className="mb-3 rounded bg-gray-50 p-3">
            <div className="text-sm">
              <div className="mb-1 font-medium text-gray-800">
                {record.title}
              </div>
              <div className="text-gray-600">
                Trạng thái:{' '}
                {record.status === 'pending'
                  ? 'Chờ duyệt'
                  : record.status === 'approved'
                    ? 'Đã duyệt'
                    : record.status === 'rejected'
                      ? 'Đã từ chối'
                      : record.status}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-red-600">
          ⚠️ Hành động này không thể hoàn tác
        </p>
      </div>
    </Modal>
  );
};
