import { useState } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { deleteMyAccount } from '../../persistence/safety';
import { signOut, type SessionInfo } from '../../persistence/session';
import { AeroWindow } from '../../ui/AeroWindow';
import { UacDialog } from '../../ui/UacDialog';
import '../legal/legal.css';
import { findCountry } from '../../world/countries';
import { useCountry } from '../../world/country';
import { CountryGate } from '../../world/CountryPicker';
import { FlagBadge } from '../../world/FlagBadge';
import { AvatarImg } from '../../avatar/AvatarFace';
import { tr } from '../../i18n';

/** cuenta con sesión iniciada: qué cuenta es, a dónde ir y cómo salir. */
export function AccountPanel({ session }: { session: SessionInfo }) {
  const country = useCountry();
  const [changeCountry, setChangeCountry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const name = session.username ? `@${session.username}` : session.email ?? tr('tu cuenta', 'your account');

  const leave = async () => {
    setBusy(true);
    await signOut();
    window.location.hash = routeHref('inicio');
  };

  return (
    <AeroWindow className="win-account" title={tr('mi cuenta', 'my account')} icon={<span className="mini-orb mini-orb--green" />}>
      <section className="account" aria-labelledby="titulo-vista">
        <a className="account__avatar account__avatar--face" href={routeHref('personaje')} aria-label={tr('editar mi personaje', 'edit my character')}>
          <AvatarImg crop="cabeza" />
        </a>
        <h1 id="titulo-vista" tabIndex={-1} className="account__name">
          {name}
        </h1>
        <p className="account__state">{tr('sesión iniciada', 'signed in')}{session.username && session.email ? ` ${tr('con', 'with')} ${session.email}` : ''}</p>
        <p className="account__zone">
          <FlagBadge code={country} width={34} />
          <span>{findCountry(country) ? `${tr('tu isla está en', 'your island is in')} ${findCountry(country)!.name}` : tr('tu isla aún no tiene país', 'your island has no country yet')}</span>
          <button type="button" className="account__link" onClick={() => setChangeCountry(true)}>
            {country ? tr('cambiar', 'change') : tr('elegir país', 'choose country')}
          </button>
        </p>
        <div className="account__actions">
          <a className="vista-button vista-button--primary" href={routeHref('isla')}>
            {tr('ir a mi isla', 'go to my island')}
          </a>
          <a className="vista-button" href={routeHref('mundo')}>
            {tr('ver el mundo', 'see the world')}
          </a>
        </div>
        <button type="button" className="account__out" disabled={busy} onClick={() => void leave()}>
          {busy ? tr('cerrando sesión...', 'signing out...') : tr('cerrar sesión', 'sign out')}
        </button>
        <p className="account__legal">
          <a href={routeHref('reglas')}>{tr('reglas y privacidad', 'rules and privacy')}</a>
          {session.username && (
            <>
              {' · '}
              <button type="button" className="account__link" onClick={() => setDeleting((v) => !v)}>{tr('borrar mi cuenta', 'delete my account')}</button>
            </>
          )}
        </p>
        {deleting && session.username && (
          <UacDialog
            title={tr('control de cuentas de usuario', 'user account control')}
            action={tr('¿quieres permitir que este programa borre tu cuenta?', 'do you want to allow this program to delete your account?')}
            allowLabel={tr('borrar para siempre', 'delete forever')}
            allowDisabled={confirmText !== session.username}
            busy={busy}
            onCancel={() => { setDeleting(false); setConfirmText(''); setDeleteError(''); }}
            onAllow={async () => {
              setBusy(true);
              setDeleteError('');
              try {
                await deleteMyAccount();
                window.location.hash = routeHref('inicio');
                window.location.reload();
              } catch {
                setDeleteError(tr('no se pudo borrar la cuenta. inténtalo de nuevo.', 'the account could not be deleted. try again.'));
                setBusy(false);
              }
            }}
          >
            <p>{tr('programa: frutiger aero islands · editor: tú. esto borra tu isla, tu personaje y tus puntos para siempre. para continuar escribe', 'program: frutiger aero islands · publisher: you. this deletes your island, your character and your points forever. to continue type')} <strong>{session.username}</strong>.</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" aria-label={tr('escribe tu usuario para confirmar', 'type your username to confirm')} />
            {deleteError && <p role="alert">{deleteError}</p>}
          </UacDialog>
        )}
      </section>
      <CountryGate forceOpen={changeCountry} onClose={() => setChangeCountry(false)} />
    </AeroWindow>
  );
}
