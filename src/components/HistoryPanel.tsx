import type { ClipStats, HistoryClip } from '../types';
import { formatBytes, formatTime } from '../lib/format';

interface Props {
  clips: HistoryClip[];
  stats: ClipStats | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

export function HistoryPanel({ clips, stats, loading, error, onReload }: Props) {
  return (
    <section className="panel panel--muted">
      <div className="panel__head">
        <h2 className="panel__title">History</h2>
        {!loading && (
          <button type="button" className="button button--link" onClick={onReload}>
            Refresh
          </button>
        )}
      </div>

      {loading && <p className="hint">Loading history…</p>}

      {error && !loading && (
        <p className="notice notice--error" role="alert">
          {error}. History needs MongoDB (see <code>.env.example</code>) — synthesis works without it.{' '}
          <button type="button" className="button button--link" onClick={onReload}>
            Try again
          </button>
        </p>
      )}

      {!loading && !error && stats && (
        <p className="hint">
          {stats.totalClips} clip{stats.totalClips === 1 ? '' : 's'} generated
          {stats.totalClips > 0 && `, ${stats.totalCharacters.toLocaleString()} characters total`}
          {stats.topVoice && ` · most used: ${stats.topVoice}`}
        </p>
      )}

      {!loading && !error && clips.length > 0 && (
        <ul className="history">
          {clips.map((clip) => (
            <li key={clip.id} className="history__row">
              <span className="history__voice">{clip.voiceName}</span>
              <span className="history__text">{clip.textPreview}</span>
              <span className="history__meta">
                {formatTime(new Date(clip.createdAt).getTime())} · {formatBytes(clip.bytes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
