import { useId } from 'react';
import { TEXT_MAX } from '../types';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const SAMPLE =
  'The studio was quiet except for the hum of the monitors. She pressed play, and the room filled with a voice that was almost, but not quite, her own.';

export function TextInput({ value, onChange }: Props) {
  const id = useId();
  const remaining = TEXT_MAX - value.length;
  const over = remaining < 0;

  return (
    <section className="panel">
      <div className="panel__head">
        <label htmlFor={id} className="panel__title">
          Script
        </label>
        <button
          type="button"
          className="button button--link"
          onClick={() => onChange(SAMPLE)}
          disabled={value === SAMPLE}
        >
          Use sample
        </button>
      </div>
      <textarea
        id={id}
        className="textarea"
        rows={7}
        value={value}
        placeholder="Type or paste the text you want spoken…"
        maxLength={TEXT_MAX + 200}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-count`}
      />
      <p
        id={`${id}-count`}
        className={`textarea__count ${over ? 'textarea__count--over' : ''}`}
        aria-live="polite"
      >
        {value.length.toLocaleString()} / {TEXT_MAX.toLocaleString()} characters
        {over ? ' — too long' : ''}
      </p>
    </section>
  );
}
