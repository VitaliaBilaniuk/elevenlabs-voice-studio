import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { fetchVoices, synthesize } from '../lib/api';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...actual, fetchVoices: vi.fn(), synthesize: vi.fn() };
});

const mockFetchVoices = vi.mocked(fetchVoices);
const mockSynthesize = vi.mocked(synthesize);

beforeEach(() => {
  mockFetchVoices.mockReset();
  mockSynthesize.mockReset();
  mockFetchVoices.mockResolvedValue([
    {
      voiceId: 'v1',
      name: 'Rachel',
      category: 'premade',
      description: '',
      previewUrl: '',
      labels: {},
    },
  ]);
});

describe('<App>', () => {
  it('mounts and keeps the generate button disabled until there is text', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Voice Studio' })).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Generate speech' });
    expect(button).toBeDisabled();

    await waitFor(() => expect(screen.getByLabelText('Voice')).toHaveValue('v1'));

    await userEvent.type(screen.getByLabelText('Script'), 'Hello world');
    expect(button).toBeEnabled();
  });

  it('sends the typed script and selected voice through to synthesize', async () => {
    mockSynthesize.mockResolvedValue(new Blob(['mp3'], { type: 'audio/mpeg' }));
    render(<App />);

    await waitFor(() => expect(screen.getByLabelText('Voice')).toHaveValue('v1'));
    await userEvent.type(screen.getByLabelText('Script'), '  Read this  ');
    await userEvent.click(screen.getByRole('button', { name: 'Generate speech' }));

    await waitFor(() => expect(mockSynthesize).toHaveBeenCalledTimes(1));
    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Read this', voiceId: 'v1' }),
    );
    expect(await screen.findByText('Clips')).toBeInTheDocument();
  });

  it('shows the voice-loading error and a retry control', async () => {
    mockFetchVoices.mockRejectedValueOnce(new Error('network down'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('network down');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
