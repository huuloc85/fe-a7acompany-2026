import { Button } from 'antd';
import { IconContext } from 'react-icons';

import { ThemeToggleButton } from '@components/common/ThemeToggleButton';
import { AppearanceToggleButton } from '@components/common/AppearanceToggleButton';
import NotificationDropdown from '@components/header/NotificationDropdown';
import UserDropdown from '@components/header/UserDropdown';
import { toggleSidebar, uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';
import { AiOutlineMenuFold, AiOutlineMenuUnfold } from 'react-icons/ai';

const Header = () => {
  const { isSidebarClose } = useStore(uiStore);

  // Get authenticated user context

  return (
    <IconContext.Provider value={{ size: '1.25rem' }}>
      <header className="liquid-glass-panel sticky top-0 z-40 flex w-full border-x-0 border-t-0 px-4 py-2 lg:border-b lg:px-6">
        <div>
          <Button
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
        <div className="flex w-full items-center justify-end gap-4">
          <div className="flex items-center gap-3">
            <AppearanceToggleButton />
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          <UserDropdown />
        </div>
      </header>
    </IconContext.Provider>
  );
};

export default Header;
