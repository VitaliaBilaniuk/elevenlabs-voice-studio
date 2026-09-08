# Voice Studio

A small text-to-speech studio built on the [ElevenLabs](https://elevenlabs.io) API.
Type a script, pick a voice, tune the delivery, and get an MP3 back. The browser
never sees the API key: every request goes through a thin Node proxy that adds the
`xi-api-key` header server-side.

Built as a focused sample: React 18 + TypeScript on the front, Express on the back,
Vitest for the tests, and a CI workflow that runs lint, types, tests, and the build
on every push.

![Voice Studio, light theme](docs/screenshot.png)

<details>
<summary>Dark theme</summary>

![Voice Studio, dark theme](docs/screenshot-dark.png)

</details>

## Why it is shaped this way

- **The key stays on the server.** A common mistake with the ElevenLabs API is to
  call it straight from the browser and ship the key in the bundle. `server/app.mjs`
  is the whole fix: the React app only ever talks to `/api/*`, and the proxy is the
  only thing that holds `ELEVENLABS_API_KEY`. It also clamps the voice settings and
  caps the text length before anything reaches ElevenLabs.
- **Object URLs are managed, not leaked.** `useSpeech` keeps the last eight clips,
  and revokes the `blob:` URL of every clip it drops or that is still open when the
  component unmounts.
- **State that belongs to the view lives in the view.** The theme is the only thing
  persisted (to `localStorage`), and it is read back before first paint by a tiny
  inline script so there is no flash.
- **Tests sit next to the seams that break.** The proxy's guard-and-validate order,
  the synthesis hook's success / error / history-cap paths, and the settings panel's
  controlled-input contract. Not a coverage number.

## Getting started

```bash
npm install
cp .env.example .env      # then paste your ElevenLabs API key into .env
npm run dev
```

`npm run dev` starts two processes: Vite on `http://localhost:5173` and the proxy on
`http://localhost:8787`. Vite forwards `/api/*` to the proxy, so you only open the
5173 URL.

You need an ElevenLabs API key with text-to-speech access. Create one under
**Settings → API Keys** in the ElevenLabs dashboard. Without a key the app loads and
the UI works, but every synthesis request comes back as a `503` with a message
saying so.

## Scripts

| Script              | What it does                                             |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Vite dev server + proxy, together                       |
| `npm run build`     | Type-check, then build the static front end to `dist/`  |
| `npm run start`     | Run the proxy alone (serve `dist/` behind it in prod)   |
| `npm run lint`      | ESLint (flat config, `typescript-eslint`)               |
| `npm run typecheck` | `tsc --noEmit` over the app and the build config        |
| `npm test`          | Vitest, single run                                      |
| `npm run test:watch`| Vitest, watch mode                                      |

## Project layout

```
server/
  app.mjs         Express app: /api/health, /api/voices, /api/tts. Exported
                  separately from index.mjs so tests can hit it without a port.
  index.mjs       Binds the port.
  app.test.mjs    Route tests (node environment).

src/
  lib/
    api.ts        fetch wrappers + a typed ApiError
    format.ts     byte / time / text formatting helpers
  hooks/
    useVoices.ts  loads the account's voices, abortable, with reload
    useSpeech.ts  synthesis + a bounded, self-cleaning clip history
    useTheme.ts   light / dark, persisted
  components/     Header, TextInput, VoicePicker, VoiceSettings, ResultList, StatusBar
  App.tsx         wiring
  test/           format, useSpeech, and VoiceSettings specs + setup
```

## How a request flows

```
 browser                     proxy (server/app.mjs)            ElevenLabs
 ───────                     ─────────────────────             ──────────
 POST /api/tts  ──────────▶  validate + clamp settings
 { text, voiceId, ... }      add xi-api-key header   ────────▶ POST /v1/text-to-speech/:id
                             stream the mp3 back     ◀──────── audio/mpeg
 Blob  ◀───────────────────  pipe upstream → response
 URL.createObjectURL(blob)
 <audio src=blob:…>
```

## Notes and limits

- The proxy streams the MP3 straight through; it never writes audio to disk.
- Text is capped at 2,500 characters per request (ElevenLabs' single-request limit
  on smaller plans). The counter turns red past that and the button disables.
- No auth, no database, no rate limiting. It is a sample, not a service. For a real
  deployment you would put the proxy behind auth and a per-user quota.

## License

MIT — see [LICENSE](LICENSE).
