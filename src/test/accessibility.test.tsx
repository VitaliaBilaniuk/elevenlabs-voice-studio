import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { HistoryPanel } from '../components/HistoryPanel';
import { ResultList } from '../components/ResultList';
import { VoiceSettings } from '../components/VoiceSettings';
import { fetchVoices } from '../lib/api';
import { queryGraphQL } from '../lib/graphql';
import { DEFAULT_SETTINGS } from '../types';
import { expectNoA11yViolations } from './a11y';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...actual, fetchVoices: vi.fn(), synthesize: vi.fn() };
});

vi.mock('../lib/graphql', async () => {
  const actual = await vi.importActual<typeof import('../lib/graphql')>('../lib/graphql');
  return { ...actual, queryGraphQL: vi.fn() };
});

const mockFetchVoices = vi.mocked(fetchVoices);
const mockQueryGraphQL = vi.mocked(queryGraphQL);

beforeEach(() => {
  mockFetchVoices.mockReset();
  mockQueryGraphQL.mockReset();
  mockFetchVoices.mockResolvedValue([
    { voiceId: 'v1', name: 'Rachel', category: 'premade', description: '', previewUrl: '', labels: {} },
  ]);
  mockQueryGraphQL.mockResolvedValue({
    clips: [],
    clipStats: { totalClips: 0, totalCharacters: 0, topVoice: null },
  });
});

describe('accessibility', () => {
  it('the empty app has no axe violations', async () => {
    const { container } = render(<App />);
    await screen.findByLabelText('Voice');
    await expectNoA11yViolations(container);
  });

  it('voice settings panel has no axe violations', async () => {
    const { container } = render(<VoiceSettings value={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    await expectNoA11yViolations(container);
  });

  it('a populated result list has no axe violations', async () => {
    const clips = [
      { id: '1', text: 'Hello', voiceName: 'Rachel', url: 'blob:1', bytes: 100, createdAt: Date.now() },
      { id: '2', text: 'World', voiceName: 'Adam', url: 'blob:2', bytes: 200, createdAt: Date.now() },
    ];
    const { container } = render(
      <ResultList clips={clips} onRemove={vi.fn()} onClear={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });

  it('gives each clip in a multi-clip list a distinguishable accessible name', () => {
    const clips = [
      { id: '1', text: 'Hello', voiceName: 'Rachel', url: 'blob:1', bytes: 100, createdAt: 1_700_000_000_000 },
      { id: '2', text: 'World', voiceName: 'Adam', url: 'blob:2', bytes: 200, createdAt: 1_700_000_060_000 },
    ];
    render(<ResultList clips={clips} onRemove={vi.fn()} onClear={vi.fn()} />);

    const downloads = screen.getAllByRole('link', { name: /Download/ });
    const names = downloads.map((el) => el.getAttribute('aria-label'));
    // Two "Download" links must not be indistinguishable to a screen reader.
    expect(new Set(names).size).toBe(names.length);
    expect(names[0]).toContain('Rachel');
    expect(names[1]).toContain('Adam');
  });

  it('a populated history panel has no axe violations', async () => {
    const clips = [
      {
        id: '1',
        voiceId: 'v1',
        voiceName: 'Rachel',
        textPreview: 'Hello there',
        characterCount: 11,
        bytes: 100,
        createdAt: new Date().toISOString(),
      },
    ];
    const stats = { totalClips: 1, totalCharacters: 11, topVoice: 'Rachel' };
    const { container } = render(
      <HistoryPanel clips={clips} stats={stats} loading={false} error={null} onReload={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });

  it('has a skip link that targets the main content region', async () => {
    render(<App />);
    await screen.findByLabelText('Voice');

    const skipLink = screen.getByText('Skip to script and generate');
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(document.getElementById('main-content')).toBeInTheDocument();
  });
});
