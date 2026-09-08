import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

const TEXT_MAX = 2500;
const DEFAULT_MODEL = 'eleven_multilingual_v2';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Build a number from an unknown value, falling back when it is not finite.
 */
function num(value, fallback) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function requireApiKey(_req, res, next) {
  if (!process.env.ELEVENLABS_API_KEY) {
    res.status(503).json({
      error:
        'The server has no ELEVENLABS_API_KEY. Copy .env.example to .env, add a key, and restart.',
    });
    return;
  }
  next();
}

/**
 * Create the Express app. Kept separate from the listen() call so tests can
 * exercise the routes without binding a port.
 */
export function createServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasApiKey: Boolean(process.env.ELEVENLABS_API_KEY) });
  });

  // List the voices available on the caller's ElevenLabs account.
  app.get('/api/voices', requireApiKey, async (_req, res) => {
    try {
      const upstream = await fetch(`${ELEVENLABS_BASE}/voices`, {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      });

      if (!upstream.ok) {
        const detail = await upstream.text();
        res.status(upstream.status).json({
          error: 'ElevenLabs rejected the voices request.',
          detail: detail.slice(0, 500),
        });
        return;
      }

      const data = await upstream.json();
      const voices = (data.voices ?? []).map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        category: v.category ?? 'generated',
        description: v.description ?? '',
        previewUrl: v.preview_url ?? '',
        labels: v.labels ?? {},
      }));
      res.json({ voices });
    } catch (err) {
      res.status(502).json({ error: 'Could not reach ElevenLabs.', detail: String(err) });
    }
  });

  // Synthesise speech and stream the MP3 straight back to the browser.
  app.post('/api/tts', requireApiKey, async (req, res) => {
    const body = req.body ?? {};
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : '';

    if (!text) {
      res.status(400).json({ error: 'text is required.' });
      return;
    }
    if (text.length > TEXT_MAX) {
      res.status(400).json({ error: `text must be ${TEXT_MAX} characters or fewer.` });
      return;
    }
    if (!voiceId) {
      res.status(400).json({ error: 'voiceId is required.' });
      return;
    }

    const voiceSettings = {
      stability: clamp(num(body.stability, 0.5), 0, 1),
      similarity_boost: clamp(num(body.similarityBoost, 0.75), 0, 1),
      style: clamp(num(body.style, 0), 0, 1),
      use_speaker_boost: body.speakerBoost !== false,
      speed: clamp(num(body.speed, 1), 0.7, 1.2),
    };

    try {
      const upstream = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: typeof body.modelId === 'string' ? body.modelId : DEFAULT_MODEL,
          voice_settings: voiceSettings,
        }),
      });

      if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => '');
        res.status(upstream.status || 502).json({
          error: 'ElevenLabs rejected the synthesis request.',
          detail: detail.slice(0, 500),
        });
        return;
      }

      res.setHeader('content-type', 'audio/mpeg');
      res.setHeader('cache-control', 'no-store');

      // Pipe the upstream Web ReadableStream to the Node response.
      const reader = upstream.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (err) {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Could not reach ElevenLabs.', detail: String(err) });
      } else {
        res.end();
      }
    }
  });

  // In production (`npm run build` then `npm start`) serve the static front end
  // from the same process. In dev this directory does not exist and Vite serves
  // the app instead.
  const distDir = path.resolve(fileURLToPath(new URL('../dist', import.meta.url)));
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  return app;
}

export { TEXT_MAX, DEFAULT_MODEL };
