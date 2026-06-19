import { useEffect, useRef } from 'react';

export function useBreakTimer(isRunning, onTick, onOverage, allowedMinutes, timerSeconds) {
  const intervalRef = useRef(null);
  const onTickRef = useRef(onTick);
  const onOverageRef = useRef(onOverage);
  const hasOverageFiredRef = useRef(false);

  // Keep references to latest callbacks to avoid re-triggering effect
  useEffect(() => {
    onTickRef.current = onTick;
    onOverageRef.current = onOverage;
  });

  // Reset the overage flag when the break stops or reset
  useEffect(() => {
    if (!isRunning || timerSeconds === 0) {
      hasOverageFiredRef.current = false;
    }
  }, [isRunning, timerSeconds]);

  // Check for overage condition
  useEffect(() => {
    if (isRunning && allowedMinutes && timerSeconds > allowedMinutes * 60) {
      if (!hasOverageFiredRef.current) {
        hasOverageFiredRef.current = true;
        if (onOverageRef.current) {
          onOverageRef.current();
        }
      }
    }
  }, [isRunning, timerSeconds, allowedMinutes]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (onTickRef.current) {
          onTickRef.current();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);
}
