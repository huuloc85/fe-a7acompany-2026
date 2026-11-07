import { AddNotification } from './AddNotification';
import { Tabs } from 'antd';
import NotificationDemo from '../NotificationDemo';

export const EditLayout = () => {
  return (
    <Tabs
      defaultActiveKey="notifications"
      items={[
        {
          key: 'notifications',
          label: 'Thông báo',
          children: <AddNotification />
        },
        {
          key: 'test-modal',
          label: 'Test modal',
          children: <NotificationDemo />
        }
      ]}
    />
  );
};
