import { useCallback, useEffect, useRef, useState } from 'react';
import { synthesize } from '../lib/api';
import type { SpeechClip, SpeechRequest } from '../types';

const HISTORY_LIMIT = 8;

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface UseSpeech {
  status: Status;
  error: string | null;
  clips: SpeechClip[];
  speak: (request: SpeechRequest, voiceName: string) => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
}

let clipCounter = 0;
const nextId = () => `clip-${Date.now()}-${clipCounter++}`;

export function useSpeech(): UseSpeech {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [clips, setClips] = useState<SpeechClip[]>([]);

  // Keep a ref so the unmount cleanup always sees the current list.
  const clipsRef = useRef<SpeechClip[]>([]);
  clipsRef.current = clips;

  useEffect(() => {
    return () => {
      for (const clip of clipsRef.current) URL.revokeObjectURL(clip.url);
    };
  }, []);

  const speak = useCallback(async (request: SpeechRequest, voiceName: string) => {
    setStatus('loading');
    setError(null);
    try {
      const blob = await synthesize(request);
      const clip: SpeechClip = {
        id: nextId(),
        text: request.text,
        voiceName,
        url: URL.createObjectURL(blob),
        bytes: blob.size,
        createdAt: Date.now(),
      };
      setClips((prev) => {
        const kept = [clip, ...prev];
        const dropped = kept.slice(HISTORY_LIMIT);
        for (const old of dropped) URL.revokeObjectURL(old.url);
        return kept.slice(0, HISTORY_LIMIT);
      });
      setStatus('ready');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Synthesis failed.');
      setStatus('error');
    }
  }, []);

  const remove = useCallback((id: string) => {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setClips((prev) => {
      for (const clip of prev) URL.revokeObjectURL(clip.url);
      return [];
    });
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, clips, speak, remove, clear };
}
