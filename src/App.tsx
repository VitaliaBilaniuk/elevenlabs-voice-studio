import { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { TextInput } from './components/TextInput';
import { VoicePicker } from './components/VoicePicker';
import { VoiceSettings } from './components/VoiceSettings';
import { ResultList } from './components/ResultList';
import { StatusBar } from './components/StatusBar';
import { useVoices } from './hooks/useVoices';
import { useSpeech } from './hooks/useSpeech';
import { DEFAULT_SETTINGS, TEXT_MAX, type VoiceSettings as Settings } from './types';

export default function App() {
  const { voices, loading: voicesLoading, error: voicesError, reload } = useVoices();
  const { status, error, clips, speak, remove, clear } = useSpeech();

  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Pick the first voice once the list arrives, unless one is already chosen.
  useEffect(() => {
    if (!voiceId && voices.length > 0) setVoiceId(voices[0].voiceId);
  }, [voices, voiceId]);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.voiceId === voiceId),
    [voices, voiceId],
  );

  const trimmed = text.trim();
  const canSpeak =
    status !== 'loading' &&
    trimmed.length > 0 &&
    trimmed.length <= TEXT_MAX &&
    Boolean(voiceId);

  const handleSpeak = () => {
    if (!canSpeak) return;
    void speak(
      { text: trimmed, voiceId, ...settings },
      selectedVoice?.name ?? 'Voice',
    );
  };

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to script and generate
      </a>

      <Header />

      <main className="layout" id="main-content" tabIndex={-1}>
        <div className="column">
          <TextInput value={text} onChange={setText} />

          <div className="actions">
            <button
              type="button"
              className="button button--primary"
              onClick={handleSpeak}
              disabled={!canSpeak}
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? 'Generating…' : 'Generate speech'}
            </button>
            <StatusBar status={status} error={error} />
          </div>

          <ResultList clips={clips} onRemove={remove} onClear={clear} />
        </div>

        <aside className="column column--side" aria-label="Voice and delivery settings">
          <VoicePicker
            voices={voices}
            loading={voicesLoading}
            error={voicesError}
            value={voiceId}
            onChange={setVoiceId}
            onReload={reload}
          />
          <VoiceSettings value={settings} onChange={setSettings} />
        </aside>
      </main>

      <footer className="footer">
        <p>
          The browser never sees the API key. Every request goes through a small Node proxy
          (<code>server/app.mjs</code>) that adds the <code>xi-api-key</code> header.
        </p>
      </footer>
    </div>
  );
}
