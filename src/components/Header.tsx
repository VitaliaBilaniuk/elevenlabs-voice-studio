import { useTheme } from '../hooks/useTheme';

export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true">
          ◑
        </span>
        <div>
          <h1>Voice Studio</h1>
          <p className="header__tag">Text to speech on the ElevenLabs API</p>
        </div>
      </div>
      <button
        type="button"
        className="button button--ghost"
        onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? 'Light' : 'Dark'} theme
      </button>
    </header>
  );
}
