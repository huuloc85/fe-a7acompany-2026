import { Tooltip } from 'antd';
import { useActionTooltip } from '@/hooks/useActionTooltip';
import { toggleAppearance, uiStore } from '@stores/uiStore';
import { useStore } from '@tanstack/react-store';
import { FaRegWindowMaximize, FaTint } from 'react-icons/fa';

export const AppearanceToggleButton = () => {
  const { tooltipProps, triggerProps } = useActionTooltip();
  const { appearance } = useStore(uiStore);
  const isLiquid = appearance === 'liquid';
  const label = isLiquid ? 'Giọt nước' : 'Mặc định';
  const nextLabel = isLiquid
    ? 'Chuyển sang giao diện mặc định'
    : 'Chuyển sang giao diện giọt nước';

  return (
    <Tooltip title={nextLabel} {...tooltipProps}>
      <button
        {...triggerProps}
        type="button"
        aria-label={nextLabel}
        aria-pressed={isLiquid}
        onClick={toggleAppearance}
        className={`appearance-toggle-btn header-action-btn flex h-10 items-center justify-center rounded-full px-3 transition-all duration-200 active:scale-95 ${
          isLiquid
            ? 'appearance-toggle-btn--liquid'
            : 'appearance-toggle-btn--classic'
        }`}
      >
        <span className="appearance-toggle-btn__icon">
          {isLiquid ? (
            <FaTint className="appearance-water-icon" />
          ) : (
            <FaRegWindowMaximize />
          )}
        </span>
        <span className="appearance-toggle-btn__label">{label}</span>
      </button>
    </Tooltip>
  );
};
