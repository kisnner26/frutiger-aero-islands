import { useState } from 'react';
import { completeProfile, isSupabaseConfigured, supabase } from '../../persistence/supabase';
import { AeroWindow } from '../../ui/AeroWindow';
import { routeHref } from '../../app/useHashRoute';

type AuthMode = 'entrar' | 'registro' | 'recuperar';

const usernameOk = (value: string) => /^[a-z][a-z0-9_]{2,23}$/.test(value);

const copy: Record<AuthMode, { eyebrow: string; title: string; detail: string; action: string }> = {
  entrar: { eyebrow: 'tu espacio en el archipiélago', title: 'vuelve a tu isla', detail: 'continúa decorando donde lo dejaste.', action: 'entrar a mi isla' },
  registro: { eyebrow: 'un lugar solo tuyo', title: 'empieza tu isla', detail: 'elige un nombre y abre tu rincón del mundo.', action: 'crear mi cuenta' },
  recuperar: { eyebrow: 'no pierdes tu isla', title: 'recupera el acceso', detail: 'te enviaremos un enlace seguro a tu correo.', action: 'enviar enlace' },
};

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const text = copy[mode];

  const chooseMode = (next: AuthMode) => {
    setMode(next);
    setStatus(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setStatus(null);

    try {
      if (mode === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}#/auth` });
        if (error) throw error;
        setStatus({ text: 'revisa tu correo: ahí está el enlace para recuperar el acceso.' });
      } else if (mode === 'registro') {
        const normalizedUsername = username.toLowerCase();
        if (!usernameOk(normalizedUsername)) throw new Error('tu usuario debe tener de 3 a 24 caracteres: letras, números o guion bajo.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { pending_username: normalizedUsername }, emailRedirectTo: `${window.location.origin}${window.location.pathname}#/auth` },
        });
        if (error) throw error;
        if (data.session) {
          await completeProfile(normalizedUsername);
          window.location.hash = routeHref('isla');
          return;
        }
        setStatus({ text: 'cuenta creada. confirma el enlace que enviamos a tu correo y luego entra aquí.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.hash = routeHref('isla');
      }
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : 'no se pudo completar la operación.', error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AeroWindow className="win-auth" title="puerto de islas" icon={<span className="mini-orb" />}>
      <section className="auth-shell" aria-labelledby="titulo-vista">
        <aside className="auth-shell__intro">
          <span className="auth-shell__globe" aria-hidden="true"><i /><b /></span>
          <p className="auth-shell__kicker">frutiger aero islands</p>
          <h1 id="titulo-vista" tabIndex={-1}>tu isla<br />te espera.</h1>
          <p className="auth-shell__blurb">un pequeño mundo que puedes construir, guardar y compartir con otros exploradores.</p>
          <ul className="auth-shell__perks" aria-label="lo que incluye tu cuenta">
            <li><span aria-hidden="true">01</span> guarda tu isla en la nube</li>
            <li><span aria-hidden="true">02</span> visita islas de la comunidad</li>
            <li><span aria-hidden="true">03</span> vuelve desde cualquier dispositivo</li>
          </ul>
        </aside>

        <form className="auth-form auth-form--renewed" onSubmit={submit}>
          <div className="auth-form__heading">
            <p>{text.eyebrow}</p>
            <h2>{text.title}</h2>
            <span>{text.detail}</span>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="opciones de cuenta">
            <button className={mode === 'entrar' ? 'is-active' : ''} type="button" role="tab" aria-selected={mode === 'entrar'} onClick={() => chooseMode('entrar')}>entrar</button>
            <button className={mode === 'registro' ? 'is-active' : ''} type="button" role="tab" aria-selected={mode === 'registro'} onClick={() => chooseMode('registro')}>crear cuenta</button>
          </div>

          {!isSupabaseConfigured && <p className="auth-status auth-status--error" role="alert">la cuenta aún no está conectada. falta configurar supabase.</p>}

          {mode === 'registro' && (
            <label>
              <span>nombre de isla</span>
              <input required minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="ejemplo_isla" autoCapitalize="none" autoComplete="username" />
              <small>será tu dirección pública: @ejemplo_isla</small>
            </label>
          )}

          <label>
            <span>correo</span>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" />
          </label>

          {mode !== 'recuperar' && (
            <label>
              <span>contraseña</span>
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="mínimo 8 caracteres" autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} />
            </label>
          )}

          {status && <p className={`auth-status${status.error ? ' auth-status--error' : ''}`} role={status.error ? 'alert' : 'status'}>{status.text}</p>}

          <button className="auth-form__submit" disabled={!isSupabaseConfigured || busy}>
            <span>{busy ? 'conectando...' : text.action}</span><i aria-hidden="true">→</i>
          </button>

          <div className="auth-form__footer">
            {mode === 'entrar' && <button type="button" onClick={() => chooseMode('recuperar')}>olvidé mi contraseña</button>}
            {mode === 'recuperar' && <button type="button" onClick={() => chooseMode('entrar')}>volver a entrar</button>}
            <a href={routeHref('inicio')}>volver a la bienvenida</a>
          </div>
        </form>
      </section>
    </AeroWindow>
  );
}
