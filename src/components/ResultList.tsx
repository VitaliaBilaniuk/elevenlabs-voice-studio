import type { SpeechClip } from '../types';
import { formatBytes, formatTime, truncate } from '../lib/format';

interface Props {
  clips: SpeechClip[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function downloadName(clip: SpeechClip): string {
  const stem = truncate(clip.text, 32)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${stem || 'voice'}.mp3`;
}

export function ResultList({ clips, onRemove, onClear }: Props) {
  if (clips.length === 0) {
    return (
      <section className="panel panel--muted">
        <p className="hint">Generated clips show up here. Nothing yet.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Clips</h2>
        <button type="button" className="button button--link" onClick={onClear}>
          Clear all
        </button>
      </div>
      <ul className="clips">
        {clips.map((clip, index) => (
          <li key={clip.id} className="clip">
            <div className="clip__meta">
              <span className="clip__voice">{clip.voiceName}</span>
              <span className="clip__sub">
                {formatTime(clip.createdAt)} · {formatBytes(clip.bytes)}
                {index === 0 ? ' · newest' : ''}
              </span>
            </div>
            <p className="clip__text">{truncate(clip.text, 120)}</p>
            <audio
              className="clip__audio"
              src={clip.url}
              controls
              preload="none"
              aria-label={`${clip.voiceName} clip, generated ${formatTime(clip.createdAt)}`}
            />
            <div className="clip__actions">
              <a
                className="button button--ghost"
                href={clip.url}
                download={downloadName(clip)}
                aria-label={`Download ${clip.voiceName} clip, generated ${formatTime(clip.createdAt)}`}
              >
                Download
              </a>
              <button
                type="button"
                className="button button--link"
                onClick={() => onRemove(clip.id)}
                aria-label={`Remove ${clip.voiceName} clip, generated ${formatTime(clip.createdAt)}`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
