import { Tabs, TabsProps } from 'antd';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { FaCalendarCheck, FaListUl } from 'react-icons/fa';
import { useAuth } from '@hooks/useAuth';
import { isAllowRole } from '@utils/authUtil';

import WorkScheduleList from '@pages/admin/workSchedule/WorkScheduleList';
import WorkScheduleCategoryList from '@pages/admin/workScheduleCategories/WorkScheduleCategoryList';

type WorkScheduleTabKey = 'schedules' | 'categories';

export default function WorkScheduleManagementTabs() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: string };
  const { user } = useAuth();
  const canManageWorkSchedules = isAllowRole(user, [
    'admin',
    'super admin',
    'co admin'
  ]);

  // Read-only viewers must never mount category management, even via its URL.
  if (!canManageWorkSchedules) return <WorkScheduleList />;

  const activeTab: WorkScheduleTabKey =
    search.tab === 'categories' ? 'categories' : 'schedules';

  const handleTabChange = (key: string) => {
    if (key === 'categories') {
      navigate({
        to: '/work-schedules',
        search: {
          tab: 'categories'
        },
        replace: true
      });
    } else {
      navigate({
        to: '/work-schedules',
        search: {},
        replace: true
      });
    }
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'schedules',
      label: (
        <span className="flex items-center gap-2">
          <FaCalendarCheck />
          <span>Lịch làm việc</span>
        </span>
      )
    },
    {
      key: 'categories',
      label: (
        <span className="flex items-center gap-2">
          <FaListUl />
          <span>Danh mục lịch làm việc</span>
        </span>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        type="card"
        animated
      />
      {activeTab === 'categories' ? (
        <WorkScheduleCategoryList />
      ) : (
        <WorkScheduleList />
      )}
    </div>
  );
}
