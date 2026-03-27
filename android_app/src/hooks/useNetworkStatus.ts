import { useEffect, useRef, useState } from 'react';

/**
 * Simple network status hook using periodic fetch checks.
 * React Native doesn't expose NetInfo without an extra package,
 * so we use a lightweight polling approach.
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnectivity = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkConnectivity();
    intervalRef.current = setInterval(checkConnectivity, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isOnline };
};
