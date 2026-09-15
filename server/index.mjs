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
  if (!process.env.MONGODB_URI) {
    console.warn(
      `No MONGODB_URI set; defaulting to mongodb://127.0.0.1:27017/voice-studio. ` +
        'Synthesis still works without Mongo — only clip history (GraphQL) needs it.',
    );
  }
});
