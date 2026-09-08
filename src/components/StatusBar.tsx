interface Props {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

const MESSAGES: Record<Props['status'], string> = {
  idle: 'Ready.',
  loading: 'Synthesising…',
  ready: 'Clip ready.',
  error: 'Something went wrong.',
};

export function StatusBar({ status, error }: Props) {
  return (
    <div className="statusbar" role="status" aria-live="polite">
      <span className={`statusbar__dot statusbar__dot--${status}`} aria-hidden="true" />
      <span>{status === 'error' && error ? error : MESSAGES[status]}</span>
    </div>
  );
}
