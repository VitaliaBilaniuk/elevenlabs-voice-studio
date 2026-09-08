// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from './app.mjs';

let server;
let base;

beforeAll(async () => {
  delete process.env.ELEVENLABS_API_KEY;
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
});
