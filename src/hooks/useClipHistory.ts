import { useCallback, useEffect, useState } from 'react';
import { queryGraphQL } from '../lib/graphql';
import type { ClipStats, HistoryClip } from '../types';

const HISTORY_QUERY = `
  query ClipHistory {
    clips(limit: 10) {
      id
      voiceId
      voiceName
      textPreview
      characterCount
      bytes
      createdAt
    }
    clipStats {
      totalClips
      totalCharacters
      topVoice
    }
  }
`;

interface HistoryData {
  clips: HistoryClip[];
  clipStats: ClipStats;
}

interface UseClipHistory {
  clips: HistoryClip[];
  stats: ClipStats | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Server-persisted synthesis history, via GraphQL — distinct from the
 * in-browser `clips` in useSpeech, which hold this tab's actual playable
 * audio. This is "what has this account generated, ever," read-only. */
export function useClipHistory(): UseClipHistory {
  const [clips, setClips] = useState<HistoryClip[]>([]);
  const [stats, setStats] = useState<ClipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    queryGraphQL<HistoryData>(HISTORY_QUERY, undefined, controller.signal)
      .then((data) => {
        setClips(data.clips);
        setStats(data.clipStats);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Could not load history.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [nonce]);

  return { clips, stats, loading, error, reload };
}
