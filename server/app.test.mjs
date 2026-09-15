// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, describeUpstreamError } from './app.mjs';

describe('describeUpstreamError', () => {
  it('pulls the message out of ElevenLabs\' nested detail object', () => {
    const raw = JSON.stringify({
      detail: {
        status: 'missing_permissions',
        message: 'The API key you used is missing the permission voices_read to execute this operation.',
      },
    });
    const { message, hint } = describeUpstreamError(raw);
    expect(message).toMatch(/missing the permission voices_read/);
    expect(hint).toMatch(/API Keys/);
  });

  it('handles a plain string detail and a validation array', () => {
    expect(describeUpstreamError('{"detail":"nope"}').message).toBe('nope');
    expect(
      describeUpstreamError('{"detail":[{"msg":"field required"},{"msg":"bad value"}]}').message,
    ).toBe('field required; bad value');
  });

  it('falls back to a trimmed raw slice for non-JSON bodies', () => {
    const { message, hint } = describeUpstreamError('upstream 502 gateway error');
    expect(message).toBe('upstream 502 gateway error');
    expect(hint).toBeUndefined();
  });
});

let server;
let base;

beforeAll(async () => {
  delete process.env.ELEVENLABS_API_KEY;
  // Deliberately unreachable (nothing listens on port 1) — this file checks
  // that /api/graphql degrades gracefully with no Mongo available, not the
  // happy path. See clips.test.mjs and graphql.test.mjs for real-data
  // coverage against an ephemeral in-memory MongoDB.
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/voice-studio';
  server = createServer().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

describe('proxy routes', () => {
  it('health check works without a key and reports the missing key', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, hasApiKey: false });
  });

  it('returns 503 for /api/voices when the server has no key', async () => {
    const res = await fetch(`${base}/api/voices`);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/ELEVENLABS_API_KEY/);
  });

  it('guards /api/tts with the key check before touching the body', async () => {
    const res = await fetch(`${base}/api/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '', voiceId: '' }),
    });
    expect(res.status).toBe(503);
  });

  it('validates the body once a key is present', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key';
    const res = await fetch(`${base}/api/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '   ', voiceId: 'abc' }),
    });
    delete process.env.ELEVENLABS_API_KEY;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/text is required/);
  });

  it('degrades /api/graphql to a GraphQL error, not a crash, when Mongo is unreachable', async () => {
    const res = await fetch(`${base}/api/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ clipStats { totalClips } }' }),
    });
    // The server is still up and answers with a well-formed GraphQL error
    // response — synthesis (the feature that matters) never depends on this.
    const body = await res.json();
    expect(body.errors?.length).toBeGreaterThan(0);

    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
  }, 10_000);
});
