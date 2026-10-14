import { useEffect, useState } from 'react';
import {
  getMidAutumnRefreshDelay,
  isMidAutumnActive
} from '@/configs/midAutumn.config';

export function useMidAutumnMode(): boolean {
  const [active, setActive] = useState(() => isMidAutumnActive());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now();
      setActive(isMidAutumnActive(now));
      timer = setTimeout(refresh, getMidAutumnRefreshDelay(now));
    };

    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return active;
}
