import { useState } from 'react';
import { Card, Space, Typography, Button, Alert, Row, Col, Tag } from 'antd';
import {
  BellOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  GiftOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import ComponentCard from '@components/common/ComponentCard';
import BirthdayModal from '@components/BirthdayModal';
import CleaningDutyModal from '@components/CleaningDuty/CleaningDutyModal';
import HolidayGreetingModal from '@components/holiday/HolidayGreetingModal';
import { NotificationRequestModal } from '@components/common/NotificationRequestModal';
import { NotificationStatusIndicator } from '@components/common/NotificationStatusIndicator';
import { useNotificationPermission } from '@hooks/useNotificationPermission';
import { sendNotification } from '@utils/notificationUtil';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

type DemoModal =
  | 'birthday'
  | 'birthday-self'
  | 'cleaning-duty'
  | 'holiday'
  | 'notification';

const demoBirthdayEmployees = ['Nguyễn Văn A'];
const demoCleaningDuties = [
  {
    id: 'demo-eat-room',
    type: 'eat-room' as const,
    date: dayjs()
  },
  {
    id: 'demo-trash',
    type: 'trash' as const,
    date: dayjs().add(1, 'day')
  },
  {
    id: 'demo-female-wc',
    type: 'female-wc' as const,
    date: dayjs().add(2, 'day')
  }
];

export default function NotificationDemo() {
  const [activeModal, setActiveModal] = useState<DemoModal | null>(null);
  const { permission, requestPermission, isLoading } =
    useNotificationPermission();

  const handleTestNotification = () => {
    if (permission === 'granted') {
      sendNotification('Thông báo thử nghiệm', {
        body: 'Đây là thông báo thử nghiệm từ admin!',
        data: { type: 'test' }
      });
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    console.log('Permission result:', result);
  };

  const closeModal = () => setActiveModal(null);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} className="uppercase">
            <BellOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Test Modal Hệ Thống
          </Title>
          <Paragraph>
            Trang này giúp Super Admin mở thử các modal tự động mà không cần chờ
            đúng dữ liệu sinh nhật, trực vệ sinh hoặc ngày lễ.
          </Paragraph>
        </div>

        {/* Current Status */}
        <ComponentCard title="Trạng Thái Hiện Tại" uppercaseTitle={false}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Space direction="vertical">
                  <Text strong>Quyền thông báo:</Text>
                  <Text code style={{ fontSize: '16px' }}>
                    {permission}
                  </Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Space direction="vertical">
                  <Text strong>Indicator trong Header:</Text>
                  <NotificationStatusIndicator showText />
                </Space>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Space direction="vertical">
                  <Text strong>Hành động:</Text>
                  <Space>
                    <Button
                      size="small"
                      disabled={permission !== 'granted'}
                      icon={<ExperimentOutlined />}
                      onClick={handleTestNotification}
                    >
                      Test thông báo
                    </Button>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>
        </ComponentCard>

        {/* Manual Test */}
        <ComponentCard title="Test Modal Thủ Công" uppercaseTitle={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="Lưu ý"
              description="Các nút bên dưới chỉ mở modal với dữ liệu demo trên trình duyệt, không ghi dữ liệu lên BE."
              type="info"
              showIcon
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}>
                <Card size="small" className="h-full">
                  <Space direction="vertical" size="small">
                    <Tag color="magenta">Sinh nhật</Tag>
                    <Text strong>BirthdayModal</Text>
                    <Text type="secondary">
                      Test giao diện chúc mừng sinh nhật với 1 nhân sự.
                    </Text>
                    <Button
                      type="primary"
                      icon={<GiftOutlined />}
                      onClick={() => setActiveModal('birthday')}
                    >
                      Mở modal
                    </Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12} xl={6}>
                <Card size="small" className="h-full">
                  <Space direction="vertical" size="small">
                    <Tag color="purple">Sinh nhật của tôi</Tag>
                    <Text strong>BirthdayModal cá nhân</Text>
                    <Text type="secondary">
                      Test nội dung khi user hiện tại là người sinh nhật.
                    </Text>
                    <Button
                      type="primary"
                      icon={<GiftOutlined />}
                      onClick={() => setActiveModal('birthday-self')}
                    >
                      Mở modal
                    </Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12} xl={6}>
                <Card size="small" className="h-full">
                  <Space direction="vertical" size="small">
                    <Tag color="blue">Trực vệ sinh</Tag>
                    <Text strong>CleaningDutyModal</Text>
                    <Text type="secondary">
                      Test danh sách nhiệm vụ trực hôm nay và sắp tới.
                    </Text>
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      onClick={() => setActiveModal('cleaning-duty')}
                    >
                      Mở modal
                    </Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12} xl={6}>
                <Card size="small" className="h-full">
                  <Space direction="vertical" size="small">
                    <Tag color="red">Ngày lễ</Tag>
                    <Text strong>HolidayGreetingModal</Text>
                    <Text type="secondary">
                      Test popup lời chào ngày lễ đang dùng trong layout.
                    </Text>
                    <Button
                      type="primary"
                      icon={<NotificationOutlined />}
                      onClick={() => setActiveModal('holiday')}
                    >
                      Mở modal
                    </Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12} xl={6}>
                <Card size="small" className="h-full">
                  <Space direction="vertical" size="small">
                    <Tag color="cyan">Thông báo</Tag>
                    <Text strong>NotificationRequestModal</Text>
                    <Text type="secondary">
                      Test popup xin quyền thông báo trình duyệt.
                    </Text>
                    <Button
                      type="primary"
                      icon={<BellOutlined />}
                      onClick={() => setActiveModal('notification')}
                    >
                      Mở modal
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
        </ComponentCard>

        <ComponentCard title="Test Quyền Thông Báo" uppercaseTitle={false}>
          <Space wrap>
            <Button
              icon={<ExperimentOutlined />}
              disabled={permission !== 'granted'}
              onClick={handleTestNotification}
            >
              Gửi thông báo thử
            </Button>

            <Button
              icon={<BellOutlined />}
              loading={isLoading}
              onClick={handleRequestPermission}
              disabled={permission === 'granted'}
            >
              Yêu cầu quyền trực tiếp
            </Button>
          </Space>
        </ComponentCard>

        {/* How it Works */}
        <ComponentCard title="Cách Hoạt Động" uppercaseTitle={false}>
          <Space direction="vertical" size="middle">
            <div>
              <Title level={4}>1. Khi Admin Đăng Nhập</Title>
              <ul>
                <li>
                  Hệ thống kiểm tra vai trò của user (chỉ admin mới được yêu
                  cầu)
                </li>
                <li>Kiểm tra trạng thái quyền thông báo hiện tại</li>
                <li>
                  Nếu chưa có quyền và chưa từng hỏi, hiển thị modal sau 2 giây
                </li>
                <li>
                  Lưu trạng thái để không hỏi lại trong 24h nếu bị từ chối
                </li>
              </ul>
            </div>

            <div>
              <Title level={4}>2. UI Components</Title>
              <ul>
                <li>
                  <strong>Modal:</strong> Hiển thị khi admin đăng nhập lần đầu
                </li>
                <li>
                  <strong>Indicator:</strong> Hiển thị trong header để admin
                  theo dõi trạng thái
                </li>
                <li>
                  <strong>Dropdown:</strong> Thông báo hiển thị như trước
                </li>
              </ul>
            </div>

            <div>
              <Title level={4}>3. Local Storage</Title>
              <ul>
                <li>
                  <code>admin_notification_requested</code>: Đánh dấu đã yêu cầu
                </li>
                <li>
                  <code>admin_notification_request_time</code>: Thời gian yêu
                  cầu cuối
                </li>
              </ul>
            </div>
          </Space>
        </ComponentCard>

        {/* Test Modal */}
        <BirthdayModal
          open={activeModal === 'birthday' || activeModal === 'birthday-self'}
          employees={demoBirthdayEmployees}
          isCurrentUserBirthday={activeModal === 'birthday-self'}
          currentUserName={demoBirthdayEmployees[0]}
          companyName="Công Ty Vinh Vinh Phát"
          onClose={closeModal}
          autoCloseMs={0}
        />

        <CleaningDutyModal
          open={activeModal === 'cleaning-duty'}
          duties={demoCleaningDuties}
          onClose={closeModal}
          onDontShowAgain={closeModal}
        />

        <HolidayGreetingModal
          open={activeModal === 'holiday'}
          onClose={closeModal}
          autoCloseMs={0}
        />

        <NotificationRequestModal
          open={activeModal === 'notification'}
          onAllow={async () => {
            const result = await requestPermission();
            console.log('Modal permission result:', result);
            closeModal();
          }}
          onDeny={closeModal}
          loading={isLoading}
        />
      </Space>
    </div>
  );
}
