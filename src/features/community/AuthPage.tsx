import { useState } from 'react';
import { completeProfile, isSupabaseConfigured, readableSupabaseError, supabase } from '../../persistence/supabase';
import { AeroWindow } from '../../ui/AeroWindow';
import { routeHref } from '../../app/useHashRoute';
import './auth.css';

type AuthMode = 'entrar' | 'registro' | 'recuperar';

const usernameOk = (value: string) => /^[a-z][a-z0-9_]{2,23}$/.test(value);
const copy: Record<AuthMode, { title: string; description: string; action: string }> = {
  entrar: { title: 'abre tu isla', description: 'tu mundo, tus recuerdos y tus visitas te estaban esperando.', action: 'conectar' },
  registro: { title: 'registra tu isla', description: 'elige un usuario para que otros exploradores puedan encontrarte.', action: 'crear cuenta' },
  recuperar: { title: 'recupera tu señal', description: 'mandaremos una llave de acceso a tu buzón.', action: 'enviar llave' },
};

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('entrar'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [username, setUsername] = useState(''); const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null); const [busy, setBusy] = useState(false);
  const text = copy[mode];
  const chooseMode = (next: AuthMode) => { setMode(next); setStatus(null); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return; setBusy(true); setStatus(null);
    try {
      if (mode === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}#/auth` });
        if (error) throw error; setStatus({ text: 'la llave de acceso ya va camino a tu correo.' });
      } else if (mode === 'registro') {
        const normalizedUsername = username.toLowerCase();
        if (!usernameOk(normalizedUsername)) throw new Error('tu usuario debe tener de 3 a 24 caracteres: letras, números o guion bajo.');
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { pending_username: normalizedUsername }, emailRedirectTo: `${window.location.origin}${window.location.pathname}#/auth` } });
        if (error) throw error;
        if (data.session) { await completeProfile(normalizedUsername); window.location.hash = routeHref('isla'); return; }
        setStatus({ text: 'cuenta creada. confirma el correo y vuelve a conectar tu isla.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; window.location.hash = routeHref('isla');
      }
    } catch (error) { setStatus({ text: readableSupabaseError(error), error: true }); } finally { setBusy(false); }
  };

  return <AeroWindow className="win-auth auth-window" title="centro de conexión" icon={<span className="mini-orb" />}>
    <section className="auth-vista" aria-labelledby="titulo-vista">
      <aside className="auth-vista__rail">
        <div className="auth-vista__brand"><span className="auth-vista__orb" aria-hidden="true" /><span>frutiger aero<br /><b>islands</b></span></div>
        <p className="auth-vista__caption">centro personal</p>
        <nav className="auth-vista__nav" aria-label="cuenta">
          <button type="button" className={mode === 'entrar' ? 'is-active' : ''} onClick={() => chooseMode('entrar')}><i aria-hidden="true">⌁</i><span>conectar<br /><small>abrir mi isla</small></span></button>
          <button type="button" className={mode === 'registro' ? 'is-active' : ''} onClick={() => chooseMode('registro')}><i aria-hidden="true">+</i><span>nueva isla<br /><small>crear cuenta</small></span></button>
          <button type="button" className={mode === 'recuperar' ? 'is-active' : ''} onClick={() => chooseMode('recuperar')}><i aria-hidden="true">?</i><span>ayuda de acceso<br /><small>recuperar señal</small></span></button>
        </nav>
        <div className="auth-vista__signal"><i /><i /><i /><span>red de islas<br />en línea</span></div>
      </aside>

      <form className="auth-vista__main" onSubmit={submit}>
        <header className="auth-vista__header"><div><p>island id</p><h1 id="titulo-vista" tabIndex={-1}>{text.title}</h1><span>{text.description}</span></div><div className="auth-vista__device" aria-hidden="true"><b>islandberry</b><i /><em>● ● ●</em></div></header>
        <div className="auth-vista__divider" />
        {!isSupabaseConfigured && <p className="auth-vista__status auth-vista__status--error" role="alert">la red de cuentas no está configurada.</p>}
        {mode === 'registro' && <label><span>nombre público de tu isla</span><input required minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="ejemplo_isla" autoCapitalize="none" autoComplete="username" /><small>otros jugadores te verán como @{username || 'tu_isla'}</small></label>}
        <label><span>dirección de correo</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" /></label>
        {mode !== 'recuperar' && <label><span>clave privada</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} /></label>}
        {status && <p className={`auth-vista__status${status.error ? ' auth-vista__status--error' : ''}`} role={status.error ? 'alert' : 'status'}>{status.text}</p>}
        <div className="auth-vista__actions"><button className="auth-vista__submit" disabled={!isSupabaseConfigured || busy}><span>{busy ? 'sincronizando...' : text.action}</span><i aria-hidden="true">›</i></button>{mode === 'entrar' && <button type="button" className="auth-vista__link" onClick={() => chooseMode('recuperar')}>olvidé mi clave</button>}</div>
        <footer className="auth-vista__footer"><span>conexión segura · mundo compartido</span><a href={routeHref('inicio')}>volver a la bienvenida</a></footer>
      </form>
    </section>
  </AeroWindow>;
}
