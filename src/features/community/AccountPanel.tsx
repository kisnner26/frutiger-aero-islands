import { useState } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { deleteMyAccount } from '../../persistence/safety';
import { signOut, type SessionInfo } from '../../persistence/session';
import { AeroWindow } from '../../ui/AeroWindow';
import '../legal/legal.css';
import { findCountry } from '../../world/countries';
import { useCountry } from '../../world/country';
import { CountryGate } from '../../world/CountryPicker';
import { FlagBadge } from '../../world/FlagBadge';
import { AvatarImg } from '../../avatar/AvatarFace';

/** cuenta con sesión iniciada: qué cuenta es, a dónde ir y cómo salir. */
export function AccountPanel({ session }: { session: SessionInfo }) {
  const country = useCountry();
  const [changeCountry, setChangeCountry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const name = session.username ? `@${session.username}` : session.email ?? 'tu cuenta';

  const leave = async () => {
    setBusy(true);
    await signOut();
    window.location.hash = routeHref('inicio');
  };

  return (
    <AeroWindow className="win-account" title="mi cuenta" icon={<span className="mini-orb mini-orb--green" />}>
      <section className="account" aria-labelledby="titulo-vista">
        <a className="account__avatar account__avatar--face" href={routeHref('personaje')} aria-label="editar mi personaje">
          <AvatarImg crop="cabeza" />
        </a>
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
        <p className="account__legal">
          <a href={routeHref('reglas')}>reglas y privacidad</a>
          {session.username && (
            <>
              {' · '}
              <button type="button" className="account__link" onClick={() => setDeleting((v) => !v)}>borrar mi cuenta</button>
            </>
          )}
        </p>
        {deleting && session.username && (
          <form
            className="account__delete"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setDeleteError('');
              try {
                await deleteMyAccount();
                window.location.hash = routeHref('inicio');
                window.location.reload();
              } catch {
                setDeleteError('no se pudo borrar la cuenta. inténtalo de nuevo.');
                setBusy(false);
              }
            }}
          >
            <p>esto borra tu isla, tu personaje y tus puntos para siempre. para confirmar escribe <strong>{session.username}</strong>.</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" aria-label="escribe tu usuario para confirmar" />
            {deleteError && <p role="alert">{deleteError}</p>}
            <button className="vista-button" disabled={busy || confirmText !== session.username}>borrar para siempre</button>
          </form>
        )}
      </section>
      <CountryGate forceOpen={changeCountry} onClose={() => setChangeCountry(false)} />
    </AeroWindow>
  );
}
