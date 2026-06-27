import { useTranslation } from 'react-i18next';

interface TimerProps { timeLeft: number; total?: number; }

export function Timer({ timeLeft, total = 30 }: TimerProps) {
  const { t } = useTranslation();
  const pct = (timeLeft / total) * 100;
  const urgent = timeLeft <= 10;
  return (
    <div className={`timer${urgent ? ' urgent' : ''}`}>
      <div className="timer-display">
        <span className="timer-value">{timeLeft}</span>
        <span className="timer-label">{t('timer.sec')}</span>
      </div>
      <div className="timer-bar-track">
        <div className="timer-bar-fill" style={{ width: `${pct}%`, background: urgent ? 'var(--danger)' : 'var(--saffron)' }} />
      </div>
    </div>
  );
}
