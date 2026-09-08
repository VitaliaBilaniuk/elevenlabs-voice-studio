import type { SpeechRequest, Voice } from '../types';

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function readError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  let detail: string | undefined;
  try {
    const data = await response.json();
    if (typeof data?.error === 'string') message = data.error;
    if (typeof data?.detail === 'string') detail = data.detail;
  } catch {
    // non-JSON body, keep the generic message
  }
  return new ApiError(message, response.status, detail);
}

/** Fetch the voices available on the server's ElevenLabs account. */
export async function fetchVoices(signal?: AbortSignal): Promise<Voice[]> {
  const response = await fetch('/api/voices', { signal });
  if (!response.ok) throw await readError(response);
  const data = (await response.json()) as { voices: Voice[] };
  return data.voices ?? [];
}

/** Synthesise speech and return the audio as an MP3 blob. */
export async function synthesize(request: SpeechRequest, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) throw await readError(response);
  return response.blob();
}
