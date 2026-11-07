import { useEffect, useState } from 'react';

// Re-evaluate freshness even when a request hangs or the same snapshot repeats.
// Never extrapolate production counters or use this clock to authorize an RPC.
export default function useLiveClock(active: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') update();
    }, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [active]);
  return now;
}
