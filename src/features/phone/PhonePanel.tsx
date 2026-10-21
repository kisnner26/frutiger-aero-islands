import { useEffect, useRef, useState } from 'react';
import { AlbumApp } from './AlbumApp';
import { CameraApp } from './CameraApp';
import { RadioApp } from './RadioApp';
import type { PhoneApp } from './phoneBus';
import { tr } from '../../i18n';

type App = PhoneApp;

const APPS: Array<{ id: Exclude<App, 'inicio'>; label: string; glyph: string }> = [
  { id: 'radio', label: 'radio', glyph: 'M3 9h18v11H3zM7 9L17 3M8 14.500h5M16 14.500h2' },
  { id: 'camara', label: tr('cámara', 'camera'), glyph: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 100-8 4 4 0 000 8z' },
  { id: 'album', label: tr('álbum', 'album'), glyph: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4' },
];

const TITLE: Record<App, string> = { inicio: tr('teléfono', 'phone'), radio: 'radio', camara: tr('cámara', 'camera'), album: tr('álbum', 'album') };

/** teléfono aero: cuerpo retro con teclado decorativo y pantalla táctil grande. aplicaciones: radio, cámara y álbum. */
export default function PhonePanel({ onClose, initialApp = 'inicio' }: { onClose: () => void; initialApp?: App }) {
  const ref = useRef<HTMLElement>(null);
  const [app, setApp] = useState<App>(initialApp);
  useEffect(() => setApp(initialApp), [initialApp]);
  useEffect(() => {
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return (
    <aside className="phone" role="dialog" aria-label={tr('teléfono aero', 'aero phone')} tabIndex={-1} ref={ref}>
      <div className="phone__top" aria-hidden="true">
        <span className="phone__speaker" />
        <span className="phone__led" />
      </div>
      <div className="phone__screen">
        <header className="phone__bar">
          {app === 'inicio' ? (
            <strong>{TITLE.inicio}</strong>
          ) : (
            <button type="button" className="phone__close" onClick={() => setApp('inicio')}>
              ‹ {tr('inicio', 'home')}
            </button>
          )}
          <button type="button" className="phone__close" onClick={onClose} aria-label={tr('cerrar teléfono', 'close phone')}>
            {tr('cerrar', 'close')}
          </button>
        </header>
        <div className="phone__app">
          {app === 'inicio' && (
            <ul className="phone__home" aria-label={tr('aplicaciones', 'apps')}>
              {APPS.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setApp(a.id)}>
                    <span className="phone__ico" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d={a.glyph} />
                      </svg>
                    </span>
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {app === 'radio' && <RadioApp />}
          {app === 'camara' && <CameraApp onClose={onClose} />}
          {app === 'album' && <AlbumApp />}
        </div>
      </div>
      <div className="phone__keys" aria-hidden="true">
        <span className="phone__pad" />
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
    </aside>
  );
}
