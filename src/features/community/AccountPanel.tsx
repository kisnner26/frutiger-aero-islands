import { useState } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { signOut, type SessionInfo } from '../../persistence/session';
import { AeroWindow } from '../../ui/AeroWindow';
import { findCountry } from '../../world/countries';
import { useCountry } from '../../world/country';
import { CountryGate } from '../../world/CountryPicker';
import { FlagBadge } from '../../world/FlagBadge';

/** cuenta con sesión iniciada: qué cuenta es, a dónde ir y cómo salir. */
export function AccountPanel({ session }: { session: SessionInfo }) {
  const country = useCountry();
  const [changeCountry, setChangeCountry] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = session.username ? `@${session.username}` : session.email ?? 'tu cuenta';

  const leave = async () => {
    setBusy(true);
    await signOut();
    window.location.hash = routeHref('inicio');
  };

  return (
    <AeroWindow className="win-account" title="mi cuenta" icon={<span className="mini-orb mini-orb--green" />}>
      <section className="account" aria-labelledby="titulo-vista">
        <span className="account__avatar" aria-hidden="true" />
        <h1 id="titulo-vista" tabIndex={-1} className="account__name">
          {name}
        </h1>
        <p className="account__state">sesión iniciada{session.username && session.email ? ` con ${session.email}` : ''}</p>
        <p className="account__zone">
          <FlagBadge code={country} width={34} />
          <span>{findCountry(country) ? `tu isla está en ${findCountry(country)!.name}` : 'tu isla aún no tiene país'}</span>
          <button type="button" className="account__link" onClick={() => setChangeCountry(true)}>
            {country ? 'cambiar' : 'elegir país'}
          </button>
        </p>
        <div className="account__actions">
          <a className="vista-button vista-button--primary" href={routeHref('isla')}>
            ir a mi isla
          </a>
          <a className="vista-button" href={routeHref('mundo')}>
            ver el mundo
          </a>
        </div>
        <button type="button" className="account__out" disabled={busy} onClick={() => void leave()}>
          {busy ? 'cerrando sesión...' : 'cerrar sesión'}
        </button>
      </section>
      <CountryGate forceOpen={changeCountry} onClose={() => setChangeCountry(false)} />
    </AeroWindow>
  );
}
