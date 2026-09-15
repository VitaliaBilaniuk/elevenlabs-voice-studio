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
  test/           format, useSpeech, VoiceSettings, App and accessibility specs + setup
                  a11y.ts wraps axe-core into a single assertion helper
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

## Accessibility

Audited by hand against WCAG 2.2 AA, then backed with an automated check so it
doesn't regress silently:

- **Landmarks + skip link.** `header`/`main`/`aside`/`footer` are real landmarks,
  and a skip link (`Skip to script and generate`) jumps keyboard users past the
  header straight to the form — try tabbing from the top of the page.
- **Every control has a name, and repeated ones are distinguishable.** The clip
  list can hold up to eight items; before the audit, all eight "Download" links
  had the identical accessible name "Download". They're now labeled
  `Download {voice} clip, generated {time}`, and the same for "Remove" and each
  `<audio>` element — the fix a screen reader user actually needs when there's
  more than one of something on the page.
- **Form-control boundaries meet the 3:1 non-text contrast minimum (SC 1.4.11).**
  The textarea and select used to sit on the exact same background as the page,
  with only a ~1.3:1 border between them — effectively invisible for low-vision
  users. They now sit on `--surface` with a `--border-strong` token computed to
  clear 3:1 against it in both themes.
- **`prefers-reduced-motion` is honored.** The pulsing "generating" status dot
  turns into a static one for anyone who's asked their OS to reduce motion.
- **Automated regression coverage.** `src/test/a11y.ts` runs `axe-core` against
  the rendered DOM in every accessibility test (`color-contrast` disabled there
  only because jsdom does no layout, so it can't compute rendered color —
  contrast is verified by hand instead, see the `--border-strong` comment in
  `index.css`). These run in the normal `npm test` / CI pass, not a separate job.

What this doesn't cover: a real screen-reader pass (VoiceOver/NVDA) and a
manual keyboard walkthrough beyond the skip link. axe-core catches structural
issues — missing names, bad ARIA, landmark problems — not everything a human
using assistive tech would notice.

## Notes and limits

- The proxy streams the MP3 straight through; it never writes audio to disk.
- Text is capped at 2,500 characters per request (ElevenLabs' single-request limit
  on smaller plans). The counter turns red past that and the button disables.
- No auth, no database, no rate limiting. It is a sample, not a service. For a real
  deployment you would put the proxy behind auth and a per-user quota.

## License

MIT — see [LICENSE](LICENSE).
