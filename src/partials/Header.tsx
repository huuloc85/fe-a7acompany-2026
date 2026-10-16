import { Button } from 'antd';
import { OnboardingHelpButton } from '@/components/onboarding/Onboarding';
import { IconContext } from 'react-icons';

import { ThemeToggleButton } from '@components/common/ThemeToggleButton';
import { AppearanceToggleButton } from '@components/common/AppearanceToggleButton';
import NotificationDropdown from '@components/header/NotificationDropdown';
import UserDropdown from '@components/header/UserDropdown';
import { toggleSidebar, uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';
import { AiOutlineMenuFold, AiOutlineMenuUnfold } from 'react-icons/ai';
import './Header.css';

const Header = () => {
  const { isSidebarClose } = useStore(uiStore);

  // Get authenticated user context

  return (
    <IconContext.Provider value={{ size: '1.25rem' }}>
      <header className="app-header liquid-glass-panel sticky top-0 z-40 flex w-full items-center justify-between gap-1 border-x-0 border-t-0 px-2 py-2 sm:justify-end sm:gap-3 sm:px-4 lg:border-b lg:px-6">
        <div className="shrink-0 sm:mr-auto">
          <Button
            data-tour="navigation-menu"
            aria-label={isSidebarClose ? 'Mở menu' : 'Đóng menu'}
            type="text"
            icon={
              isSidebarClose ? <AiOutlineMenuUnfold /> : <AiOutlineMenuFold />
            }
            onClick={toggleSidebar}
            style={{
              fontSize: '16px',
              width: 40,
              height: 40
            }}
          />
        </div>
        <AppearanceToggleButton />
        <OnboardingHelpButton />
        <ThemeToggleButton />
        <NotificationDropdown />
        <UserDropdown />
      </header>
    </IconContext.Provider>
  );
};

export default Header;
