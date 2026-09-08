import { useCallback, useEffect, useState } from 'react';
import { fetchVoices } from '../lib/api';
import type { Voice } from '../types';

interface UseVoices {
  voices: Voice[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useVoices(): UseVoices {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchVoices(controller.signal)
      .then((list) => setVoices(list))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Could not load voices.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [nonce]);

  return { voices, loading, error, reload };
}
