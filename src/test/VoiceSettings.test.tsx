import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceSettings } from '../components/VoiceSettings';
import { DEFAULT_SETTINGS } from '../types';

describe('<VoiceSettings>', () => {
  it('renders every slider at its current value', () => {
    render(<VoiceSettings value={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Stability')).toHaveValue('0.5');
    expect(screen.getByLabelText('Similarity')).toHaveValue('0.75');
    expect(screen.getByLabelText('Speed')).toHaveValue('1');
  });

  it('disables Reset while settings are at their defaults', () => {
    render(<VoiceSettings value={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('reports a changed slider through onChange without touching the other fields', () => {
    const onChange = vi.fn();
    render(<VoiceSettings value={DEFAULT_SETTINGS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Stability'), { target: { value: '0.85' } });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      stability: 0.85,
    });
  });

  it('restores defaults when Reset is clicked', async () => {
    const onChange = vi.fn();
    render(<VoiceSettings value={{ ...DEFAULT_SETTINGS, stability: 0.9 }} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });
});
