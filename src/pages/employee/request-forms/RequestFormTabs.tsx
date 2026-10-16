import { Tabs, TabsProps } from 'antd';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { FaFileAlt, FaUserCheck } from 'react-icons/fa';
import BackButton from '@components/common/BackButton';
import ComponentCard from '@components/common/ComponentCard';
import RequestFormList from './index';
import AuthorizedRequestFormsPage from './authorized';

export default function RequestFormTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL
  const activeTab = location.pathname.includes('/authorized')
    ? 'authorized'
    : 'my-requests';

  const handleTabChange = (key: string) => {
    if (key === 'my-requests') {
      navigate({ to: '/employee/request-forms' });
    } else {
      navigate({ to: '/employee/request-forms/authorized' });
    }
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'my-requests',
      label: (
        <span className="flex items-center gap-2">
          <FaFileAlt />
          <span>Đơn Yêu Cầu</span>
        </span>
      ),
      children: <RequestFormList />
    },
    {
      key: 'authorized',
      label: (
        <span className="flex items-center gap-2">
          <FaUserCheck />
          <span>Duyệt Đơn Ủy Quyền</span>
        </span>
      ),
      children: <AuthorizedRequestFormsPage />
    }
  ];

  return (
    <>
      <BackButton to="/" />
      <ComponentCard title="Quản lý đơn yêu cầu">
        <Tabs
          data-tour="authorized-requests-tabs"
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          type="card"
          animated
        />
      </ComponentCard>
    </>
  );
}
