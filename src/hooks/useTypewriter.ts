import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  speed?: number;       // base seed for tick range (default 20, used as multiplier)
  enabled?: boolean;    // if false, show full text instantly
}

interface UseTypewriterReturn {
  displayedText: string;
  isAnimating: boolean;
  skip: () => void;
  reset: () => void;
}

interface Chunk {
  text: string;
  delay: number;
}

function precomputeChunks(text: string): Chunk[] {
  if (!text) return [];

  const isFastMode = text.length > 2500;
  const minWords = isFastMode ? 6 : 3;
  const maxWords = isFastMode ? 20 : 12;
  const baseTickMin = isFastMode ? 20 : 35;
  const baseTickMax = isFastMode ? 45 : 70;

  const chunks: Chunk[] = [];

  // Split by newlines, preserving them
  const lines = text.split(/(\n)/);

  for (const segment of lines) {
    if (segment === '\n') {
      chunks.push({ text: '\n', delay: baseTickMin });
      continue;
    }
    if (!segment) continue;

    const words = segment.split(/( +)/); // keep spaces as separate tokens
    let buffer = '';
    let wordCount = 0;
    const chunkSize = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));

    for (const token of words) {
      buffer += token;
      // Only count actual words (not pure whitespace)
      if (token.trim()) wordCount++;

      if (wordCount >= chunkSize) {
        const delay = computeDelay(buffer, baseTickMin, baseTickMax);
        chunks.push({ text: buffer, delay });
        buffer = '';
        wordCount = 0;
      }
    }

    // Flush remaining
    if (buffer) {
      const delay = computeDelay(buffer, baseTickMin, baseTickMax);
      chunks.push({ text: buffer, delay });
    }
  }

  return chunks;
}

function computeDelay(text: string, baseMin: number, baseMax: number): number {
  let delay = baseMin + Math.random() * (baseMax - baseMin);
  const trimmed = text.trimEnd();
  const lastChar = trimmed[trimmed.length - 1];

  if (lastChar === '.' || lastChar === '?' || lastChar === '!') {
    delay += 150 + Math.random() * 100; // +150-250ms
  } else if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
    delay += 60 + Math.random() * 60; // +60-120ms
  }

  return delay;
}

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { speed: _speed = 20, enabled = true } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const chunkIndexRef = useRef(0);
  const chunksRef = useRef<Chunk[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const currentDelayRef = useRef(0);
  const textRef = useRef(text);
  const accumulatedRef = useRef('');

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
    chunkIndexRef.current = 0;
    accumulatedRef.current = '';
    setDisplayedText('');
    setIsAnimating(false);
  }, [cancelAnimation]);

  useEffect(() => {
    textRef.current = text;

    // If disabled or empty, show full text immediately
    if (!enabled || !text) {
      cancelAnimation();
      chunkIndexRef.current = 0;
      accumulatedRef.current = text;
      setDisplayedText(text);
      setIsAnimating(false);
      return;
    }

    // Pre-compute chunks
    cancelAnimation();
    const chunks = precomputeChunks(text);
    chunksRef.current = chunks;
    chunkIndexRef.current = 0;
    accumulatedRef.current = '';
    setDisplayedText('');
    setIsAnimating(true);
    lastTimeRef.current = 0;
    currentDelayRef.current = chunks.length > 0 ? chunks[0].delay : 50;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= currentDelayRef.current) {
        const idx = chunkIndexRef.current;
        const allChunks = chunksRef.current;

        if (idx < allChunks.length) {
          accumulatedRef.current += allChunks[idx].text;
          chunkIndexRef.current = idx + 1;
          setDisplayedText(accumulatedRef.current);
          lastTimeRef.current = timestamp;

          // Set delay for next chunk
          if (idx + 1 < allChunks.length) {
            currentDelayRef.current = allChunks[idx + 1].delay;
          }
        }
      }

      if (chunkIndexRef.current < chunksRef.current.length) {
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
  }, [text, enabled, cancelAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

  return { displayedText, isAnimating, skip, reset };
}
