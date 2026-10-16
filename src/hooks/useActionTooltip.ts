import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, PointerEvent } from 'react';
import type { TooltipProps } from 'antd';

/** Touch should activate an icon, not leave an emulated hover over its popup. */
export function useActionTooltip() {
  const [open, setOpen] = useState(false);
  const suppressed = useRef(false);
  const dismiss = () => {
    suppressed.current = true;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => {
      suppressed.current = true;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', close, true);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', close, true);
    };
  }, [open]);

  const tooltipProps: TooltipProps = {
    open,
    trigger: ['hover', 'focus'],
    onOpenChange: (next) => setOpen(next && !suppressed.current),
    mouseLeaveDelay: 0
  };

  const triggerProps = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      suppressed.current = event.pointerType !== 'mouse';
      if (suppressed.current) setOpen(false);
    },
    onPointerDownCapture: dismiss,
    onClickCapture: dismiss,
    onPointerLeave: () => {
      // Re-enable hover after the pointer has left; clicking must not leave a
      // desktop tooltip stuck open while the pointer remains over the button.
      suppressed.current = false;
      setOpen(false);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(':focus-visible')) {
        suppressed.current = false;
      }
    },
    onBlur: () => {
      setOpen(false);
    }
  };

  return { tooltipProps, triggerProps };
}
