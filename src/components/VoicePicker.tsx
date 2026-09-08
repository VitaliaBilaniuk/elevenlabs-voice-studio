import { useId } from 'react';
import type { Voice } from '../types';

interface Props {
  voices: Voice[];
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (voiceId: string) => void;
  onReload: () => void;
}

export function VoicePicker({ voices, loading, error, value, onChange, onReload }: Props) {
  const id = useId();

  return (
    <section className="panel">
      <div className="panel__head">
        <label htmlFor={id} className="panel__title">
          Voice
        </label>
        {!loading && (
          <button type="button" className="button button--link" onClick={onReload}>
            Refresh
          </button>
        )}
      </div>

      {loading && <p className="hint">Loading voices…</p>}

      {error && !loading && (
        <p className="notice notice--error" role="alert">
          {error}{' '}
          <button type="button" className="button button--link" onClick={onReload}>
            Try again
          </button>
        </p>
      )}

      {!loading && !error && (
        <select
          id={id}
          className="select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={voices.length === 0}
        >
          {voices.length === 0 && <option value="">No voices on this account</option>}
          {voices.map((voice) => (
            <option key={voice.voiceId} value={voice.voiceId}>
              {voice.name}
              {voice.category ? ` — ${voice.category}` : ''}
            </option>
          ))}
        </select>
      )}
    </section>
  );
}
