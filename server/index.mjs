import { createServer } from './app.mjs';

const PORT = Number(process.env.API_PORT ?? 8787);

createServer().listen(PORT, () => {
  const keySet = Boolean(process.env.ELEVENLABS_API_KEY);
  console.log(`voice-studio proxy listening on http://localhost:${PORT}`);
  if (!keySet) {
    console.warn(
      'ELEVENLABS_API_KEY is not set. Copy .env.example to .env and add your key, ' +
        'then restart. Requests will return 503 until it is set.',
    );
  }
});
