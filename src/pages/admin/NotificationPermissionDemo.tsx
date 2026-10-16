import { useState } from 'react';
import {
  Card,
  Space,
  Typography,
  Button,
  Divider,
  Row,
  Col,
  message
} from 'antd';
import { BellOutlined, SettingOutlined } from '@ant-design/icons';
import ComponentCard from '@components/common/ComponentCard';
import { NotificationPermissionCard } from '@components/common/NotificationPermissionCard';
import { NotificationPermissionModal } from '@components/common/NotificationPermissionModal';
import { NotificationPermissionButton } from '@components/common/NotificationPermissionButton';
import { useNotificationPermission } from '@hooks/useNotificationPermission';
import { sendNotification } from '@utils/notificationUtil';

const { Title, Paragraph, Text } = Typography;

export default function NotificationPermissionDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const { permission } = useNotificationPermission();

  const handlePermissionGranted = () => {
    message.success('Quyền thông báo đã được cấp!');
  };

  const handlePermissionDenied = () => {
    message.warning('Quyền thông báo đã bị từ chối');
  };

  const handleSendTestNotification = () => {
    if (permission === 'granted') {
      sendNotification('Thông báo thử nghiệm', {
        body: 'Đây là thông báo thử nghiệm từ trang demo!',
        data: { type: 'demo' }
      });
      message.info('Đã gửi thông báo thử nghiệm');
    } else {
      message.error('Bạn cần cấp quyền thông báo trước');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} className="uppercase">
            <BellOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Demo Yêu Cầu Quyền Thông Báo
          </Title>
          <Paragraph>
            Trang này demo các component và hook để yêu cầu quyền thông báo từ
            người dùng.
          </Paragraph>
        </div>

        {/* Notification Permission Card */}
        <ComponentCard
          title="1. Notification Permission Card"
          uppercaseTitle={false}
        >
          <Paragraph>
            Component card hiển thị trạng thái quyền thông báo và cho phép người
            dùng cấp quyền:
          </Paragraph>
          <NotificationPermissionCard
            onPermissionGranted={handlePermissionGranted}
            onPermissionDenied={handlePermissionDenied}
          />
        </ComponentCard>

        {/* Notification Permission Button */}
        <ComponentCard
          title="2. Notification Permission Button"
          uppercaseTitle={false}
        >
          <Paragraph>
            Component button đơn giản để yêu cầu quyền thông báo:
          </Paragraph>
          <Space wrap>
            <NotificationPermissionButton
              onPermissionGranted={handlePermissionGranted}
              onPermissionDenied={handlePermissionDenied}
            />
            <NotificationPermissionButton
              variant="default"
              showTestButton
              onPermissionGranted={handlePermissionGranted}
              onPermissionDenied={handlePermissionDenied}
            >
              Cấp quyền thông báo
            </NotificationPermissionButton>
          </Space>
        </ComponentCard>

        {/* Notification Permission Modal */}
        <ComponentCard
          title="3. Notification Permission Modal"
          uppercaseTitle={false}
        >
          <Paragraph>Modal để yêu cầu quyền thông báo:</Paragraph>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Mở Modal Yêu Cầu Quyền
          </Button>

          <NotificationPermissionModal
            open={modalOpen}
            onCancel={() => setModalOpen(false)}
            onPermissionGranted={handlePermissionGranted}
            onPermissionDenied={handlePermissionDenied}
          />
        </ComponentCard>

        {/* Current Status */}
        <ComponentCard title="4. Trạng Thái Hiện Tại" uppercaseTitle={false}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card size="small">
                <Space direction="vertical">
                  <Text strong>Trạng thái quyền:</Text>
                  <Text code>{permission}</Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card size="small">
                <Space direction="vertical">
                  <Text strong>Hành động:</Text>
                  <Button
                    size="small"
                    disabled={permission !== 'granted'}
                    onClick={handleSendTestNotification}
                  >
                    Gửi thông báo thử nghiệm
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </ComponentCard>

        {/* Usage Guide */}
        <ComponentCard title="5. Hướng Dẫn Sử Dụng" uppercaseTitle={false}>
          <Space direction="vertical" size="middle">
            <div>
              <Title level={4}>Hook: useNotificationPermission</Title>
              <Paragraph>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px'
                  }}
                >
                  {`import { useNotificationPermission } from '@hooks/useNotificationPermission';

const { permission, isSupported, requestPermission, isLoading } = useNotificationPermission();`}
                </pre>
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>Component: NotificationPermissionCard</Title>
              <Paragraph>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px'
                  }}
                >
                  {`import { NotificationPermissionCard } from '@components/common/NotificationPermissionCard';

<NotificationPermissionCard 
  onPermissionGranted={() => console.log('Granted')}
  onPermissionDenied={() => console.log('Denied')}
/>`}
                </pre>
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>Component: NotificationPermissionButton</Title>
              <Paragraph>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px'
                  }}
                >
                  {`import { NotificationPermissionButton } from '@components/common/NotificationPermissionButton';

<NotificationPermissionButton 
  variant="primary"
  showTestButton
  onPermissionGranted={() => console.log('Granted')}
/>`}
                </pre>
              </Paragraph>
            </div>

            <Divider />

            <div>
              <Title level={4}>Utilities</Title>
              <Paragraph>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px'
                  }}
                >
                  {`import { sendNotification, isNotificationSupported } from '@utils/notificationUtil';

// Gửi thông báo
sendNotification('Tiêu đề', { body: 'Nội dung thông báo' });

// Kiểm tra hỗ trợ
const supported = isNotificationSupported();`}
                </pre>
              </Paragraph>
            </div>
          </Space>
        </ComponentCard>
      </Space>
    </div>
  );
}
