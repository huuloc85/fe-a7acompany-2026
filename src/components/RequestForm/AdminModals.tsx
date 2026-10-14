import React, { useState } from 'react';
import {
  Modal,
  Form,
  Upload,
  Button,
  Typography,
  Card,
  Tag,
  Divider,
  message,
  Tabs,
  Input,
  Alert,
  Space
} from 'antd';
import {
  CheckOutlined,
  UserOutlined,
  FileImageOutlined,
  InboxOutlined,
  CloseOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import SignaturePad from '@/components/common/SignaturePad';
import { RequestForm, REQUEST_FORM_TYPES } from '@/types/requestFormType';
import {
  getUserApprovalType,
  getUserSignatureType,
  canUserApproveReject,
  getSignatureLabel
} from '@/utils/requestFormUtil';
import {
  dataURLToStandardFile,
  resizeSignatureImage
} from '@/utils/signatureUtil';

const { Text } = Typography;
const { TextArea } = Input;

export interface AdminActionModalProps {
  visible: boolean;
  onCancel: () => void;
  onApprove: (data: {
    action: 'approve';
    digital_signature_supervisor?: File;
    digital_signature_manager?: File;
  }) => void;
  onReject: (data: { action: 'reject'; rejection_reason: string }) => void;
  record: RequestForm | null;
  loading?: boolean;
  mode?: 'approve' | 'reject';
  currentUser: { id: number | string; role?: string | { name: string } } | null;
}

/**
 * Admin/Supervisor Modal cho phê duyệt đơn
 *
 * Logic theo API docs:
 * 1. Đơn ủy quyền: Admin chỉ approve, không cần ký
 * 2. Đơn thường:
 *    - Supervisor ký trước (đơn vẫn pending)
 *    - Manager ký sau (đơn chuyển approved)
 */
export const AdminActionModal: React.FC<AdminActionModalProps> = ({
  visible,
  onCancel,
  onApprove,
  onReject,
  record,
  loading = false,
  mode = 'approve',
  currentUser
}) => {
  const [form] = Form.useForm();
  const [signature, setSignature] = useState<UploadFile[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'upload' | 'draw'>(
    'upload'
  );

  if (!record || !currentUser) return null;

  const userType = getUserApprovalType(currentUser);
  const signType = getUserSignatureType(record, currentUser);
  const approveRejectPermission = canUserApproveReject(record, currentUser);
  const isDelegationForm = record.type === 'giay_uy_quyen';

  const handleOk = async () => {
    try {
      await form.validateFields();

      if (mode === 'reject') {
        // Handle reject
        const rejectionReason = form.getFieldValue('rejection_reason');
        onReject({
          action: 'reject',
          rejection_reason: rejectionReason
        });
        return;
      }

      // Handle approve
      const approvalData: {
        action: 'approve';
        digital_signature_supervisor?: File;
        digital_signature_manager?: File;
      } = { action: 'approve' };

      // Đơn ủy quyền: Admin chỉ approve, không cần ký
      if (isDelegationForm && userType === 'manager') {
        onApprove(approvalData);
        return;
      }

      // Đơn thường: Cần chữ ký
      if (!isDelegationForm) {
        // Supervisor ký
        if (userType === 'supervisor' && signType === 'supervisor') {
          if (
            signatureType === 'upload' &&
            signature.length > 0 &&
            signature[0].originFileObj
          ) {
            try {
              const resizedFile = await resizeSignatureImage(
                signature[0].originFileObj
              );
              approvalData.digital_signature_supervisor = resizedFile;
            } catch (error) {
              console.error('Error resizing signature:', error);
              message.error('Có lỗi khi xử lý chữ ký. Vui lòng thử lại.');
              return;
            }
          } else if (signatureType === 'draw' && signatureData) {
            try {
              const file = await dataURLToStandardFile(
                signatureData,
                `supervisor_signature_${Date.now()}.png`
              );
              approvalData.digital_signature_supervisor = file;
            } catch (error) {
              console.error('Error converting canvas signature:', error);
              message.error('Có lỗi khi xử lý chữ ký. Vui lòng vẽ lại.');
              return;
            }
          } else {
            message.error('Vui lòng upload hoặc vẽ chữ ký!');
            return;
          }
        }

        // Manager ký
        if (userType === 'manager' && signType === 'manager') {
          if (
            signatureType === 'upload' &&
            signature.length > 0 &&
            signature[0].originFileObj
          ) {
            try {
              const resizedFile = await resizeSignatureImage(
                signature[0].originFileObj
              );
              approvalData.digital_signature_manager = resizedFile;
            } catch (error) {
              console.error('Error resizing signature:', error);
              message.error('Có lỗi khi xử lý chữ ký. Vui lòng thử lại.');
              return;
            }
          } else if (signatureType === 'draw' && signatureData) {
            try {
              const file = await dataURLToStandardFile(
                signatureData,
                `manager_signature_${Date.now()}.png`
              );
              approvalData.digital_signature_manager = file;
            } catch (error) {
              console.error('Error converting canvas signature:', error);
              message.error('Có lỗi khi xử lý chữ ký. Vui lòng vẽ lại.');
              return;
            }
          } else {
            message.error('Vui lòng upload hoặc vẽ chữ ký!');
            return;
          }
        }
      }

      onApprove(approvalData);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSignature([]);
    setSignatureType('upload');
    setSignatureData(null);
    onCancel();
  };

  const uploadProps: UploadProps = {
    fileList: signature,
    beforeUpload: (file) => {
      const isImage = file.type?.startsWith('image/');
      if (!isImage) {
        message.error('Chỉ được tải lên file hình ảnh (PNG, JPG, JPEG)!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Dung lượng file phải nhỏ hơn 2MB!');
        return false;
      }
      return false; // Prevent automatic upload
    },
    onChange: ({ fileList }) => {
      setSignature(fileList.slice(-1)); // Only keep the latest file
    },
    onRemove: () => {
      setSignature([]);
    },
    accept: 'image/*',
    maxCount: 1
  };

  const renderApproveContent = () => {
    // Đơn ủy quyền: Admin chỉ approve không cần ký
    if (isDelegationForm && userType === 'manager') {
      return (
        <>
          <Alert
            message="Đơn ủy quyền"
            description="Bạn chỉ cần phê duyệt đơn này, không cần upload chữ ký."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16 }}
          />

          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Thông tin đơn:</Text>
              <Text>Loại: {REQUEST_FORM_TYPES[record.type]}</Text>
              <Text>Người tạo: {record.employee?.name}</Text>
              <Text>
                Ngày nộp:{' '}
                {dayjs(record.submitted_at).format('DD/MM/YYYY HH:mm')}
              </Text>
            </Space>
          </Card>
        </>
      );
    }

    // Đơn thường: Cần chữ ký
    if (!isDelegationForm) {
      const needsSignature =
        signType === 'supervisor' || signType === 'manager';
      const signatureLabel = getSignatureLabel(signType);

      if (!needsSignature) {
        if (
          approveRejectPermission.canApprove &&
          (userType === 'manager' || record.type === 'don_xin_tang_ca')
        ) {
          return (
            <Alert
              type="info"
              showIcon
              message="Hoàn tất duyệt đơn"
              description="Đơn đã đủ chữ ký. Xác nhận để cập nhật trạng thái Đã duyệt, không cần ký lại."
            />
          );
        }
        return (
          <Alert
            message="Không thể ký"
            description={
              userType === 'supervisor' && record.has_supervisor_signature
                ? 'Bạn đã ký đơn này rồi. Đang chờ Manager ký và phê duyệt.'
                : 'Bạn không có quyền ký đơn này.'
            }
            type="warning"
            showIcon
          />
        );
      }

      return (
        <>
          <Alert
            message={
              userType === 'supervisor'
                ? 'Ký chữ ký Tổ Trưởng'
                : 'Ký chữ ký Quản Lý Nhà Máy và Phê duyệt'
            }
            description={
              userType === 'supervisor'
                ? record.type === 'don_xin_tang_ca'
                  ? 'Đơn tăng ca được duyệt sau khi tổ trưởng ký, không cần chữ ký quản lý.'
                  : 'Sau khi bạn ký, đơn được duyệt nếu quản lý đã ký; nếu chưa, đơn tiếp tục chờ quản lý.'
                : 'Sau khi bạn ký, đơn sẽ được phê duyệt và chuyển sang trạng thái "Đã duyệt".'
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Thông tin đơn:</Text>
              <Text>Loại: {REQUEST_FORM_TYPES[record.type]}</Text>
              <Text>Người tạo: {record.employee?.name}</Text>
              <Text>
                Ngày nộp:{' '}
                {dayjs(record.submitted_at).format('DD/MM/YYYY HH:mm')}
              </Text>

              {record.has_supervisor_signature && (
                <Tag icon={<CheckOutlined />} color="success">
                  Đã có chữ ký Supervisor
                </Tag>
              )}
            </Space>
          </Card>

          <Divider orientation="center">
            <span className="text-lg font-bold text-blue-600">
              Chữ Ký Điện Tử
            </span>
          </Divider>

          <Card size="small" className="border-blue-200" title={signatureLabel}>
            <Tabs
              activeKey={signatureType}
              onChange={(key) => setSignatureType(key as 'upload' | 'draw')}
              centered
              items={[
                {
                  key: 'upload',
                  label: (
                    <span>
                      <FileImageOutlined /> Tải file
                    </span>
                  ),
                  children: (
                    <div className="text-center">
                      <Upload.Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                          Click hoặc kéo thả file chữ ký vào đây
                        </p>
                        <p className="ant-upload-hint">
                          Chỉ chấp nhận file ảnh (JPG, PNG, GIF, SVG). Tối đa
                          2MB
                        </p>
                      </Upload.Dragger>
                    </div>
                  )
                },
                {
                  key: 'draw',
                  label: (
                    <span>
                      <UserOutlined /> Vẽ chữ ký
                    </span>
                  ),
                  children: (
                    <div className="text-center">
                      <SignaturePad
                        onSignatureChange={(data) => setSignatureData(data)}
                      />
                      <div className="mt-2">
                        <Text type="secondary" className="text-sm">
                          Vẽ chữ ký của bạn trong khung bên trên. Click "Xóa chữ
                          ký" để vẽ lại.
                        </Text>
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </>
      );
    }

    return null;
  };

  const renderRejectContent = () => {
    return (
      <>
        <Alert
          message="Từ chối đơn"
          description="Vui lòng nhập lý do từ chối đơn này."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Thông tin đơn:</Text>
            <Text>Loại: {REQUEST_FORM_TYPES[record.type]}</Text>
            <Text>Người tạo: {record.employee?.name}</Text>
            <Text>
              Ngày nộp: {dayjs(record.submitted_at).format('DD/MM/YYYY HH:mm')}
            </Text>
          </Space>
        </Card>

        <Form.Item
          name="rejection_reason"
          label="Lý do từ chối"
          rules={[
            { required: true, message: 'Vui lòng nhập lý do từ chối!' },
            { min: 10, message: 'Lý do từ chối phải có ít nhất 10 ký tự!' },
            { max: 500, message: 'Lý do từ chối không được quá 500 ký tự!' }
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Nhập lý do từ chối đơn này..."
            maxLength={500}
            showCount
          />
        </Form.Item>
      </>
    );
  };

  // Check permission
  if (mode === 'approve' && !approveRejectPermission.canApprove) {
    return (
      <Modal
        title="Không thể phê duyệt"
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="close" onClick={handleCancel}>
            Đóng
          </Button>
        ]}
      >
        <Alert
          message="Không có quyền"
          description={
            approveRejectPermission.reason ||
            'Bạn không có quyền phê duyệt đơn này.'
          }
          type="error"
          showIcon
        />
      </Modal>
    );
  }

  if (mode === 'reject' && !approveRejectPermission.canReject) {
    return (
      <Modal
        title="Không thể từ chối"
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="close" onClick={handleCancel}>
            Đóng
          </Button>
        ]}
      >
        <Alert
          message="Không có quyền"
          description={
            approveRejectPermission.reason ||
            'Bạn không có quyền từ chối đơn này.'
          }
          type="error"
          showIcon
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <Space>
          {mode === 'approve' ? (
            <>
              <CheckOutlined style={{ color: '#52c41a' }} />
              <span>
                {isDelegationForm && userType === 'manager'
                  ? 'Phê duyệt đơn ủy quyền'
                  : userType === 'supervisor'
                    ? 'Ký chữ ký Tổ Trưởng'
                    : 'Ký chữ ký Quản Lý Nhà Máy và Phê duyệt'}
              </span>
            </>
          ) : (
            <>
              <CloseOutlined style={{ color: '#ff4d4f' }} />
              <span>Từ chối đơn</span>
            </>
          )}
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={mode === 'approve' ? 'Phê duyệt' : 'Từ chối'}
      cancelText="Hủy"
      okButtonProps={{
        danger: mode === 'reject',
        type: mode === 'approve' ? 'primary' : 'default'
      }}
      width="min(600px, 95vw)"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {mode === 'approve' ? renderApproveContent() : renderRejectContent()}
      </Form>
    </Modal>
  );
};

export default AdminActionModal;
