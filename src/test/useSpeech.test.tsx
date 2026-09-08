import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeech } from '../hooks/useSpeech';
import { ApiError, synthesize } from '../lib/api';
import { DEFAULT_SETTINGS } from '../types';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...actual, synthesize: vi.fn() };
});

const mockSynthesize = vi.mocked(synthesize);

const request = {
  text: 'Hello there.',
  voiceId: 'voice-1',
  ...DEFAULT_SETTINGS,
};

beforeEach(() => {
  mockSynthesize.mockReset();
});

describe('useSpeech', () => {
  it('starts idle with no clips', () => {
    const { result } = renderHook(() => useSpeech());
    expect(result.current.status).toBe('idle');
    expect(result.current.clips).toEqual([]);
  });

  it('adds a clip when synthesis succeeds', async () => {
    mockSynthesize.mockResolvedValue(new Blob(['fake-mp3'], { type: 'audio/mpeg' }));
    const { result } = renderHook(() => useSpeech());

    await act(async () => {
      await result.current.speak(request, 'Rachel');
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.clips).toHaveLength(1);
    expect(result.current.clips[0]).toMatchObject({ voiceName: 'Rachel', text: 'Hello there.' });
    expect(result.current.error).toBeNull();
  });

  it('caps history at eight clips, newest first', async () => {
    mockSynthesize.mockResolvedValue(new Blob(['x'], { type: 'audio/mpeg' }));
    const { result } = renderHook(() => useSpeech());

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await result.current.speak({ ...request, text: `line ${i}` }, 'Rachel');
      });
    }

    expect(result.current.clips).toHaveLength(8);
    expect(result.current.clips[0].text).toBe('line 9');
  });

  it('surfaces the error message when synthesis fails', async () => {
    mockSynthesize.mockRejectedValue(new ApiError('Quota exceeded', 429));
    const { result } = renderHook(() => useSpeech());

    await act(async () => {
      await result.current.speak(request, 'Rachel');
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Quota exceeded');
    expect(result.current.clips).toHaveLength(0);
  });

  it('clear() drops every clip and resets status', async () => {
    mockSynthesize.mockResolvedValue(new Blob(['x'], { type: 'audio/mpeg' }));
    const { result } = renderHook(() => useSpeech());

    await act(async () => {
      await result.current.speak(request, 'Rachel');
    });
    act(() => result.current.clear());

    expect(result.current.clips).toHaveLength(0);
    expect(result.current.status).toBe('idle');
  });
});
