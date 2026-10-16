import { Tooltip } from 'antd';
import React from 'react';
import { useActionTooltip } from '@/hooks/useActionTooltip';

import { toggleTheme, uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';

import { FaRegMoon, FaSun } from 'react-icons/fa';

export const ThemeToggleButton: React.FC = () => {
  const { tooltipProps, triggerProps } = useActionTooltip();
  const isDark = useStore(uiStore, (state) => state.theme === 'dark');
  const label = isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
  return (
    <Tooltip title={label} {...tooltipProps}>
      <button
        {...triggerProps}
        type="button"
        aria-label={label}
        aria-pressed={isDark}
        onClick={toggleTheme}
        className="theme-toggle-btn header-action-btn liquid-glass-control relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-gray-300 dark:hover:text-white"
      >
        {isDark ? (
          <FaRegMoon aria-hidden className="text-xl" />
        ) : (
          <FaSun aria-hidden className="theme-sun-icon text-xl" />
        )}
      </button>
    </Tooltip>
  );
};
