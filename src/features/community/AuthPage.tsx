import { useState } from 'react';
import { completeProfile, isSupabaseConfigured, readableSupabaseError, supabase } from '../../persistence/supabase';
import { routeHref } from '../../app/useHashRoute';
import { sfx } from '../../audio/sfx';
import './auth.css';
import './login.css';
import { tr, lang } from '../../i18n';
import { Brand } from '../../ui/Brand';

type AuthMode = 'entrar' | 'registro' | 'recuperar';

/** evita que un paso que no responde deje el botón en "conectando..." para siempre. */
function withTimeout<T>(task: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(task).then(
      (v) => { window.clearTimeout(timer); resolve(v); },
      (e) => { window.clearTimeout(timer); reject(e); },
    );
  });
}

const usernameOk = (value: string) => /^[a-z][a-z0-9_]{2,23}$/.test(value);
const registrationPasswordOk = (value: string) => value.length >= 12;
const copy: Record<AuthMode, { title: string; description: string; action: string }> = {
  entrar: { title: tr('bienvenido de vuelta', 'welcome back'), description: tr('tu isla, tus recuerdos y tus visitas te esperan.', 'your island, your memories and your visitors are waiting.'), action: tr('conectar', 'sign in') },
  registro: { title: tr('empieza tu isla', 'start your island'), description: tr('elige un nombre público para que otros exploradores te encuentren.', 'pick a public name so other explorers can find you.'), action: tr('crear mi cuenta', 'create my account') },
  recuperar: { title: tr('recupera tu acceso', 'recover your access'), description: tr('te enviaremos una llave segura a tu correo.', 'we will email you a secure link.'), action: tr('enviar llave', 'send link') },
};

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('entrar'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [username, setUsername] = useState(''); const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null); const [busy, setBusy] = useState(false);
  const text = copy[mode];
  const chooseMode = (next: AuthMode) => { if (next !== mode) sfx.click(); setMode(next); setStatus(null); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return; setBusy(true); setStatus(null);
    try {
      if (mode === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}#/auth` });
        if (error) throw error; sfx.coin(); setStatus({ text: tr('la llave de acceso ya va camino a tu correo.', 'the access link is on its way to your email.') });
      } else if (mode === 'registro') {
        const normalizedUsername = username.toLowerCase();
        if (!usernameOk(normalizedUsername)) throw new Error(tr('tu usuario debe tener de 3 a 24 caracteres: letras, números o guion bajo.', 'your username must be 3 to 24 characters: letters, numbers or underscore.'));
        if (!registrationPasswordOk(password)) throw new Error(tr('tu clave debe tener al menos 12 caracteres.', 'your password must be at least 12 characters.'));
        setStatus({ text: tr('creando tu cuenta...', 'creating your account...') });
        const { data, error } = await withTimeout(supabase.auth.signUp({ email, password, options: { data: { pending_username: normalizedUsername }, emailRedirectTo: `${window.location.origin}${window.location.pathname}#/auth` } }), 25_000, tr('el servidor tardó demasiado en crear la cuenta. revisa tu conexión y vuelve a intentarlo (si ya se creó, usa "conectar").', 'the server took too long to create the account. check your connection and try again (if it was already created, use "sign in").'));
        if (error) throw error;
        if (data.session) { setStatus({ text: tr('preparando tu isla...', 'preparing your island...') }); await withTimeout(completeProfile(normalizedUsername), 25_000, tr('tu cuenta se creó pero tu isla tardó en prepararse. usa "conectar" para entrar.', 'your account was created but your island took too long to set up. use "sign in" to enter.')); sfx.coin(); window.location.hash = routeHref('isla'); return; }
        sfx.coin(); setStatus({ text: tr('cuenta creada. confirma el correo y vuelve a conectar tu isla.', 'account created. confirm your email and sign in again to reach your island.') });
      } else {
        setStatus({ text: tr('conectando...', 'signing in...') }); const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 25_000, tr('el servidor tardó demasiado en responder. vuelve a intentarlo.', 'the server took too long to respond. try again.')); if (error) throw error; sfx.coin(); window.location.hash = routeHref('isla');
      }
    } catch (error) { sfx.error(); setStatus({ text: readableSupabaseError(error), error: true }); } finally { setBusy(false); }
  };

  const icon = (d: string) => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
  const modes: Array<{ id: AuthMode; label: string }> = [
    { id: 'entrar', label: tr('conectar', 'sign in') },
    { id: 'registro', label: tr('crear cuenta', 'sign up') },
    { id: 'recuperar', label: tr('ayuda', 'help') },
  ];

  return (
    <div className="logon">
      <section className="logon__card" aria-labelledby="titulo-vista">
        <div className="logon__avatar" aria-hidden="true">
          <span className="logon__ring" />
          <svg viewBox="0 0 64 64">
            <circle cx="32" cy="23" r="11" />
            <path d="M10 56 Q10 38 32 38 Q54 38 54 56Z" />
          </svg>
        </div>
        <p className="logon__brand">frutiger aero islands</p>
        <Brand compact />
        <h1 id="titulo-vista" tabIndex={-1}>
          {text.title}
        </h1>
        <p className="logon__lead">{text.description}</p>
        {mode === 'registro' && <p className="logon__lead">{lang === 'es' ? <>al crear tu cuenta aceptas las <a href={routeHref('reglas')}>reglas y la privacidad</a> de la beta.</> : <>by creating an account you accept the beta <a href={routeHref('reglas')}>rules and privacy</a> notice.</>}</p>}

        <div className="logon__tabs" role="tablist" aria-label={tr('opciones de cuenta', 'account options')}>
          {modes.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'is-active' : ''} onClick={() => chooseMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        <form className="logon__form" onSubmit={submit}>
          {!isSupabaseConfigured && (
            <p className="logon__status logon__status--error" role="alert">
              {tr('la red de cuentas no está configurada.', 'the accounts service is not configured.')}
            </p>
          )}
          {mode === 'registro' && (
            <label className="logon__field">
              <span>{tr('nombre público de tu isla', 'public name of your island')}</span>
              <div>
                {icon('M12 12a4 4 0 100-8 4 4 0 000 8zM4 21q0-7 8-7t8 7')}
                <input required minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="ejemplo_isla" autoCapitalize="none" autoComplete="username" />
              </div>
              <small>{tr('otros jugadores te verán como', 'other players will see you as')} @{username || tr('tu_isla', 'your_island')}</small>
            </label>
          )}
          <label className="logon__field">
            <span>{tr('correo', 'email')}</span>
            <div>
              {icon('M3 6h18v12H3zM3 7l9 7 9-7')}
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={tr('tu@correo.com', 'you@email.com')} autoComplete="email" />
            </div>
          </label>
          {mode !== 'recuperar' && (
            <label className="logon__field">
              <span>{mode === 'registro' ? tr('crea una clave', 'create a password') : tr('clave', 'password')}</span>
              <div>
                {icon('M6 11h12v9H6zM8.5 11V8a3.500 3.500 0 017 0v3')}
                <input required minLength={mode === 'registro' ? 12 : 8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'registro' ? tr('mínimo 12 caracteres', 'at least 12 characters') : tr('tu clave', 'your password')} autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} />
              </div>
            </label>
          )}
          {status && (
            <p className={`logon__status${status.error ? ' logon__status--error' : ''}`} role={status.error ? 'alert' : 'status'}>
              {status.text}
            </p>
          )}
          <button className="logon__submit" disabled={!isSupabaseConfigured || busy}>
            <span>{busy ? tr('conectando...', 'connecting...') : text.action}</span>
            <i aria-hidden="true">›</i>
          </button>
        </form>

        <p className="logon__foot">
          {mode === 'entrar' && (
            <button type="button" onClick={() => chooseMode('recuperar')}>
              {tr('olvidé mi clave', 'forgot my password')}
            </button>
          )}
          <a href={routeHref('reglas')}>{tr('reglas y privacidad', 'rules and privacy')}</a>
          <a href={routeHref('inicio')}>{tr('volver a la bienvenida', 'back to the welcome screen')}</a>
        </p>
      </section>
    </div>
  );
}
