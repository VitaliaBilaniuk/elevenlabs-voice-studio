import { useId } from 'react';
import { DEFAULT_SETTINGS, type VoiceSettings as Settings } from '../types';

interface Props {
  value: Settings;
  onChange: (next: Settings) => void;
}

interface SliderProps {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ label, hint, min, max, step, value, onChange }: SliderProps) {
  const id = useId();
  return (
    <div className="slider">
      <div className="slider__row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{value.toFixed(2)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="slider__hint">
        {hint}
      </p>
    </div>
  );
}

export function VoiceSettings({ value, onChange }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...value, ...patch });
  const isDefault =
    value.stability === DEFAULT_SETTINGS.stability &&
    value.similarityBoost === DEFAULT_SETTINGS.similarityBoost &&
    value.style === DEFAULT_SETTINGS.style &&
    value.speed === DEFAULT_SETTINGS.speed &&
    value.speakerBoost === DEFAULT_SETTINGS.speakerBoost;

  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Voice settings</h2>
        <button
          type="button"
          className="button button--link"
          onClick={() => onChange(DEFAULT_SETTINGS)}
          disabled={isDefault}
        >
          Reset
        </button>
      </div>

      <Slider
        label="Stability"
        hint="Lower is more expressive and variable. Higher is steadier and more monotone."
        min={0}
        max={1}
        step={0.05}
        value={value.stability}
        onChange={(stability) => set({ stability })}
      />
      <Slider
        label="Similarity"
        hint="How closely the output tracks the original voice timbre."
        min={0}
        max={1}
        step={0.05}
        value={value.similarityBoost}
        onChange={(similarityBoost) => set({ similarityBoost })}
      />
      <Slider
        label="Style"
        hint="Style exaggeration. Adds character at a small latency cost; 0 is neutral."
        min={0}
        max={1}
        step={0.05}
        value={value.style}
        onChange={(style) => set({ style })}
      />
      <Slider
        label="Speed"
        hint="Playback pace. 1.00 is the natural rate."
        min={0.7}
        max={1.2}
        step={0.05}
        value={value.speed}
        onChange={(speed) => set({ speed })}
      />

      <label className="checkbox">
        <input
          type="checkbox"
          checked={value.speakerBoost}
          onChange={(event) => set({ speakerBoost: event.target.checked })}
        />
        Speaker boost (sharper, closer to the reference voice)
      </label>
    </section>
  );
}
