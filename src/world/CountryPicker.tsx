import { useEffect, useMemo, useRef, useState } from 'react';
import { AeroWindow } from '../ui/AeroWindow';
import { pushCountry } from '../persistence/country';
import { findCountry, searchCountries } from './countries';
import { countryStore } from './country';
import { FlagBadge } from './FlagBadge';
import { tr } from '../i18n';

/** pregunta de qué país es la persona; la isla aparecerá en esa zona del mundo. */
export function CountryPicker({ onDone, current }: { onDone: () => void; current?: string | null }) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => searchCountries(query), [query]);

  useEffect(() => {
    input.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') later();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const later = () => {
    countryStore.skip();
    onDone();
  };

  const confirm = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    setError(null);
    const previous = countryStore.get();
    countryStore.set(chosen);
    const remote = await pushCountry(chosen);
    if (remote) {
      // el servidor rechazó el cambio: se vuelve a la elección anterior y se explica el motivo
      countryStore.set(previous);
      setError(remote);
      setBusy(false);
      return;
    }
    onDone();
  };

  const picked = findCountry(chosen);
  return (
    <div className="country-layer">
      <AeroWindow className="win-country" title={tr('¿de qué país eres?', 'which country are you from?')} icon={<span className="mini-orb mini-orb--globe" />} onClose={later}>
        <div className="country">
          <p>{tr('tu isla aparecerá en la zona de tu país dentro del mundo, para que cada región tenga su propio archipiélago.', 'your island will appear in the zone of your country inside the world, so every region has its own archipelago.')}</p>
          <label className="country__search">
            <span>{tr('buscar país', 'search country')}</span>
            <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('por ejemplo: nicaragua', 'for example: nicaragua')} autoComplete="off" />
          </label>
          <ul className="country__list" aria-label={tr('países', 'countries')}>
            {list.map((c) => (
              <li key={c.code}>
                <button type="button" aria-pressed={c.code === chosen} onClick={() => setChosen(c.code)}>
                  <FlagBadge code={c.code} width={34} title={false} />
                  <span>{c.name}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="country__empty">{tr('no hay coincidencias.', 'no matches.')}</li>}
          </ul>
          {error && (
            <p className="country__error" role="alert">
              {error}
            </p>
          )}
          <div className="country__actions">
            <button type="button" className="vista-button vista-button--primary" disabled={!picked || busy} onClick={() => void confirm()}>
              {picked ? `${tr('elegir', 'choose')} ${picked.name}` : tr('elige un país', 'pick a country')}
            </button>
            <button type="button" className="vista-button" onClick={later}>
              {tr('ahora no', 'not now')}
            </button>
          </div>
          <p className="country__note">{tr('puedes cambiarlo después desde el mundo. si hay cuenta, el servidor permite un cambio cada 30 días.', 'you can change it later from the world. with an account, the server allows one change every 30 days.')}</p>
        </div>
      </AeroWindow>
    </div>
  );
}

/** muestra la pregunta la primera vez, hasta que se elija país o se pulse "ahora no" en esta sesión. */
export function CountryGate({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(() => forceOpen || (!countryStore.get() && !countryStore.skippedThisSession()));
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);
  if (!open) return null;
  return (
    <CountryPicker
      current={countryStore.get()}
      onDone={() => {
        setOpen(false);
        onClose?.();
      }}
    />
  );
}
