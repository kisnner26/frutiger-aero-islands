import { useEffect, useRef, type ReactNode } from 'react';
import './uac.css';

interface Props {
  title: string;
  /** qué acción pide permiso. */
  action: string;
  children?: ReactNode;
  allowLabel?: string;
  allowDisabled?: boolean;
  busy?: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

/** aviso de "control de cuentas de usuario" de windows vista: oscurece el escritorio y pide permiso antes de una acción importante. */
export function UacDialog({ title, action, children, allowLabel = 'permitir', allowDisabled, busy, onAllow, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="uac" role="alertdialog" aria-modal="true" aria-labelledby="uac-title">
      <div className="uac__box">
        <header className="uac__band">
          <svg viewBox="0 0 40 46" className="uac__shield" aria-hidden="true">
            <path d="M20 2 L37 8 V22 C37 33 29 41 20 44 C11 41 3 33 3 22 V8Z" fill="#f2c230" stroke="#a87a00" strokeWidth="2" />
            <path d="M20 2 L37 8 V22 C37 33 29 41 20 44Z" fill="#3a78c8" opacity=".85" />
            <path d="M20 12 V28 M20 33 V35" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <h2 id="uac-title">{title}</h2>
        </header>
        <div className="uac__body">
          <p className="uac__action">{action}</p>
          {children}
        </div>
        <footer className="uac__foot">
          <button type="button" className="uac__btn uac__btn--allow" disabled={allowDisabled || busy} onClick={onAllow}>{busy ? 'trabajando...' : allowLabel}</button>
          <button type="button" className="uac__btn" ref={cancelRef} onClick={onCancel}>cancelar</button>
        </footer>
      </div>
    </div>
  );
}
