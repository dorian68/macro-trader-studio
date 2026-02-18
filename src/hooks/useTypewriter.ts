import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  speed?: number;       // base ms per char (default 20)
  enabled?: boolean;    // if false, show full text instantly
}

interface UseTypewriterReturn {
  displayedText: string;
  isAnimating: boolean;
  skip: () => void;
  reset: () => void;
}

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { speed = 20, enabled = true } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const charIndexRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const currentSpeedRef = useRef(speed);
  const textRef = useRef(text);

  const cancelAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const skip = useCallback(() => {
    cancelAnimation();
    setDisplayedText(textRef.current);
    setIsAnimating(false);
  }, [cancelAnimation]);

  const reset = useCallback(() => {
    cancelAnimation();
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsAnimating(false);
  }, [cancelAnimation]);

  useEffect(() => {
    textRef.current = text;

    // If disabled or empty, show full text immediately
    if (!enabled || !text) {
      cancelAnimation();
      charIndexRef.current = text.length;
      setDisplayedText(text);
      setIsAnimating(false);
      return;
    }

    // Start new animation
    cancelAnimation();
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsAnimating(true);
    lastTimeRef.current = 0;
    // Randomize batch speed: base +/- 30%
    currentSpeedRef.current = speed * (0.7 + Math.random() * 0.6);

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= currentSpeedRef.current) {
        // Advance by a batch of chars proportional to elapsed time
        const charsToAdd = Math.max(1, Math.floor(elapsed / speed));
        charIndexRef.current = Math.min(
          charIndexRef.current + charsToAdd,
          textRef.current.length
        );
        setDisplayedText(textRef.current.slice(0, charIndexRef.current));
        lastTimeRef.current = timestamp;
        // New random speed for next batch
        currentSpeedRef.current = speed * (0.7 + Math.random() * 0.6);
      }

      if (charIndexRef.current < textRef.current.length) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimation();
    };
  }, [text, enabled, speed, cancelAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

  return { displayedText, isAnimating, skip, reset };
}
