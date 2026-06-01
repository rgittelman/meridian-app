import { useEffect, useRef, useState } from 'react';

const CAPTURE_PLACEHOLDERS = [
  'Need to call school tomorrow',
  'Pay summer camp by Friday',
  'Grace dentist next month',
  'Need easier dinners this week',
  'Check on Mom this weekend',
  'Reschedule dentist appointment',
  'Order birthday gift for Sarah',
  'Review health insurance renewal',
] as const;

/**
 * Rotates through capture placeholder examples on a soft interval.
 * Returns current placeholder text and whether a transition is happening
 * (for the consuming component to apply a fade).
 */
export function useRotatingPlaceholder(intervalMs = 4500): {
  text: string;
  isTransitioning: boolean;
} {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      timeoutRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % CAPTURE_PLACEHOLDERS.length);
        setIsTransitioning(false);
      }, 280);
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [intervalMs]);

  return { text: CAPTURE_PLACEHOLDERS[index], isTransitioning };
}
