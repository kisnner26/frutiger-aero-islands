import { useEffect, useState } from 'react';
import { BOTTLE_STAYS_MS, nextBottleAt, pickNote, scheduleNext } from './bottles';
import { tr } from '../../i18n';

/** una botella con mensaje flota por el agua de vez en cuando; si la abres te deja una nota y unos brillos. */
export function MessageBottle({ onOpen }: { onOpen: (note: string, reward: number) => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let hide = 0;
    const timer = window.setInterval(() => {
      if (shown || document.hidden || Date.now() < nextBottleAt()) return;
      scheduleNext();
      setShown(true);
      hide = window.setTimeout(() => setShown(false), BOTTLE_STAYS_MS);
    }, 5000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(hide);
    };
  }, [shown]);
  if (!shown) return null;
  return (
    <button
      type="button"
      className="bottle"
      aria-label={tr('abrir la botella con mensaje', 'open the message in a bottle')}
      onClick={() => {
        setShown(false);
        const { note, reward } = pickNote();
        onOpen(note, reward);
      }}
    >
      <svg viewBox="0 0 40 64" aria-hidden="true">
        <defs>
          <linearGradient id="bt-g" x1="0" x2="1">
            <stop offset="0" stopColor="#d9f6ff" stopOpacity=".95" />
            <stop offset="1" stopColor="#6cc4e8" stopOpacity=".75" />
          </linearGradient>
        </defs>
        <rect x="15" y="2" width="10" height="9" rx="2" fill="#b98a4e" />
        <path d="M16 11h8v8c6 4 9 9 9 18v17a8 8 0 01-8 8H15a8 8 0 01-8-8V37c0-9 3-14 9-18z" fill="url(#bt-g)" stroke="#2a7fa8" strokeWidth="1.5" />
        <rect x="16" y="30" width="8" height="22" rx="2" fill="#fff6d8" stroke="#c9a85a" />
        <path d="M11 34c2-3 4-4 6-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".9" />
      </svg>
    </button>
  );
}
