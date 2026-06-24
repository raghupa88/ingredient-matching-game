import { useState, useEffect, useRef } from 'react';

export function useTimer(seconds: number, onExpire: () => void, active: boolean) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds, active]);

  useEffect(() => {
    if (!active) return;
    if (timeLeft <= 0) { onExpireRef.current(); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, active]);

  return timeLeft;
}
