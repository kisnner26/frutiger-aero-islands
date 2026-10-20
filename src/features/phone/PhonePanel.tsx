import { useEffect, useRef, useState } from 'react';
import { AlbumApp } from './AlbumApp';
import { CameraApp } from './CameraApp';
import { RadioApp } from './RadioApp';

type App = 'inicio' | 'radio' | 'camara' | 'album';

const APPS: Array<{ id: Exclude<App, 'inicio'>; label: string; glyph: string }> = [
  { id: 'radio', label: 'radio', glyph: 'M3 9h18v11H3zM7 9L17 3M8 14.500h5M16 14.500h2' },
  { id: 'camara', label: 'cámara', glyph: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 100-8 4 4 0 000 8z' },
  { id: 'album', label: 'álbum', glyph: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4' },
];

const TITLE: Record<App, string> = { inicio: 'teléfono', radio: 'radio', camara: 'cámara', album: 'álbum' };

/** teléfono aero: cuerpo retro con teclado decorativo y pantalla táctil grande. aplicaciones: radio, cámara y álbum. */
export default function PhonePanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [app, setApp] = useState<App>('inicio');
  useEffect(() => {
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return (
    <aside className="phone" role="dialog" aria-label="teléfono aero" tabIndex={-1} ref={ref}>
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
              ‹ inicio
            </button>
          )}
          <button type="button" className="phone__close" onClick={onClose} aria-label="cerrar teléfono">
            cerrar
          </button>
        </header>
        <div className="phone__app">
          {app === 'inicio' && (
            <ul className="phone__home" aria-label="aplicaciones">
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
