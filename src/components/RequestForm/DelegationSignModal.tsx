import React, { useState } from 'react';
import {
  Modal,
  Form,
  Upload,
  Typography,
  Card,
  Divider,
  message,
  Tabs
} from 'antd';
import Button from '@components/common/AppButton';
import {
  UserOutlined,
  FileImageOutlined,
  InboxOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import SignaturePad from '@/components/common/SignaturePad';
import { RequestForm, GiayUyQuyenFormData } from '@/types/requestFormType';
import { EmployeeNameDisplay } from './Utilities';
import {
  dataURLToStandardFile,
  resizeSignatureImage
} from '@/utils/signatureUtil';

const { Text } = Typography;

export interface DelegationSignModalProps {
  visible: boolean;
  onCancel: () => void;
  onSign: (data: {
    digital_signature_delegator?: File;
    digital_signature_authorized?: File;
  }) => void;
  record: RequestForm | null;
  loading?: boolean;
  currentUserId?: string;
}

export const DelegationSignModal: React.FC<DelegationSignModalProps> = ({
  visible,
  onCancel,
  onSign,
  record,
  loading = false,
  currentUserId
}) => {
  const [form] = Form.useForm();
  const [signatureType, setSignatureType] = useState<'upload' | 'draw'>(
    'upload'
  );
  const [signature, setSignature] = useState<UploadFile[]>([]);
  const [signatureData, setSignatureData] = useState<string>('');

  // Determine what type of signature user can provide
  const canSignDelegator =
    record && record.employee?.id?.toString() === currentUserId;
  const canSignAuthorized =
    record &&
    (() => {
      const formData = record.form_data as unknown as GiayUyQuyenFormData;
      return formData?.authorized_employee_id === currentUserId;
    })();

  const signatureRole = canSignDelegator
    ? 'delegator'
    : canSignAuthorized
      ? 'authorized'
      : null;
  const roleTitle =
    signatureRole === 'delegator' ? 'Người ủy quyền' : 'Người được ủy quyền';

  const handleCancel = () => {
    form.resetFields();
    setSignature([]);
    setSignatureData('');
    setSignatureType('upload');
    onCancel();
  };

  const handleOk = async () => {
    if (!signatureRole) {
      message.error('Bạn không có quyền ký đơn này');
      return;
    }

    try {
      await form.validateFields();

      const signData: {
        digital_signature_delegator?: File;
        digital_signature_authorized?: File;
      } = {};

      // Handle signature based on role
      if (
        signatureType === 'upload' &&
        signature.length > 0 &&
        signature[0].originFileObj
      ) {
        try {
          const resizedFile = await resizeSignatureImage(
            signature[0].originFileObj
          );
          if (signatureRole === 'delegator') {
            signData.digital_signature_delegator = resizedFile;
          } else if (signatureRole === 'authorized') {
            signData.digital_signature_authorized = resizedFile;
          }
        } catch (error) {
          console.error('Error resizing signature:', error);
          message.error('Có lỗi khi xử lý chữ ký. Vui lòng thử lại.');
          return;
        }
      } else if (signatureType === 'draw' && signatureData) {
        try {
          const fileName = `${signatureRole}_signature_${Date.now()}.png`;
          const signatureFile = await dataURLToStandardFile(
            signatureData,
            fileName
          );

          if (signatureRole === 'delegator') {
            signData.digital_signature_delegator = signatureFile;
          } else if (signatureRole === 'authorized') {
            signData.digital_signature_authorized = signatureFile;
          }
        } catch (error) {
          console.error('Error converting canvas signature:', error);
          message.error('Có lỗi khi xử lý chữ ký. Vui lòng vẽ lại.');
          return;
        }
      } else {
        message.error('Vui lòng cung cấp chữ ký');
        return;
      }

      onSign(signData);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Chỉ được upload file ảnh!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Kích thước file phải nhỏ hơn 2MB!');
        return false;
      }
      return false; // Prevent auto upload
    },
    onChange: (info) => {
      setSignature(info.fileList.slice(-1)); // Keep only the last file
    },
    onRemove: () => {
      setSignature([]);
    },
    accept: 'image/*',
    maxCount: 1
  };

  if (!record || !signatureRole) {
    return (
      <Modal
        title="Không có quyền ký"
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button tone="inherit" key="close" onClick={onCancel}>
            Đóng
          </Button>
        ]}
      >
        <div className="py-8 text-center">
          <Text type="secondary">
            Bạn không có quyền ký đơn này hoặc đã ký rồi
          </Text>
        </div>
      </Modal>
    );
  }

  const formData = record.form_data as unknown as GiayUyQuyenFormData;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <EditOutlined className="text-blue-500" />
          <span>Ký chữ ký - {roleTitle}</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width="min(800px, 95vw)"
      footer={[
        <Button tone="inherit" key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <Button
          tone="inherit"
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleOk}
        >
          Ký và gửi
        </Button>
      ]}
    >
      {/* Request Form Info */}
      <Card className="mb-4" size="small">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
          <div>
            <Text strong>Loại đơn:</Text>
            <div>Đơn ủy quyền</div>
          </div>
          <div>
            <Text strong>Người tạo đơn:</Text>
            <div>{record.employee?.name || 'Chưa xác định'}</div>
          </div>
          <div>
            <Text strong>Người được ủy quyền:</Text>
            <div>
              {formData?.authorized_employee_id ? (
                <EmployeeNameDisplay
                  employeeId={formData.authorized_employee_id}
                  fallback="Chưa xác định"
                />
              ) : (
                'Chưa xác định'
              )}
            </div>
          </div>
          <div>
            <Text strong>Vai trò của bạn:</Text>
            <div className="font-medium text-blue-600">{roleTitle}</div>
          </div>
        </div>
      </Card>

      <Divider orientation="center">
        <span className="text-lg font-bold text-blue-600">Chữ Ký Điện Tử</span>
      </Divider>

      {/* Signature Form */}
      <Form form={form} layout="vertical">
        <Card
          size="small"
          className="mb-4 border-blue-200"
          title={`Chữ ký ${roleTitle.toLowerCase()}`}
        >
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
                    <Form.Item
                      name="signature_upload"
                      rules={[
                        {
                          validator: () => {
                            if (
                              signatureType === 'upload' &&
                              signature.length === 0
                            ) {
                              return Promise.reject(
                                'Vui lòng upload file chữ ký'
                              );
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Upload.Dragger {...uploadProps} fileList={signature}>
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
                    </Form.Item>
                  </div>
                )
              },
              {
                key: 'draw',
                label: (
                  <span>
                    <EditOutlined /> Vẽ chữ ký
                  </span>
                ),
                children: (
                  <div className="text-center">
                    <Form.Item
                      name="signature_draw"
                      rules={[
                        {
                          validator: () => {
                            if (signatureType === 'draw' && !signatureData) {
                              return Promise.reject('Vui lòng vẽ chữ ký');
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <SignaturePad
                        onSignatureChange={(data) =>
                          setSignatureData(data || '')
                        }
                      />
                    </Form.Item>
                    <div className="mt-2">
                      <Text type="secondary" className="text-sm">
                        Vẽ chữ ký của bạn trong khung bên trên. Click "Xóa" để
                        vẽ lại.
                      </Text>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </Card>
      </Form>

      <div className="mt-4 rounded-lg bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <UserOutlined className="mt-0.5 text-blue-500" />
          <div className="text-sm">
            <div className="mb-1 font-medium text-blue-700">
              Lưu ý quan trọng:
            </div>
            <div className="text-blue-600">
              • Chữ ký này sẽ được lưu trữ và có giá trị pháp lý
              <br />
              • Sau khi ký, đơn sẽ được gửi cho admin để duyệt cuối cùng
              <br />• Bạn không thể thay đổi chữ ký sau khi đã xác nhận
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
