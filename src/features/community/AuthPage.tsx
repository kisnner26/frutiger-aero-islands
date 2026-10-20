import { useState } from 'react';
import { completeProfile, isSupabaseConfigured, readableSupabaseError, supabase } from '../../persistence/supabase';
import { routeHref } from '../../app/useHashRoute';
import { sfx } from '../../audio/sfx';
import './auth.css';
import './login.css';

type AuthMode = 'entrar' | 'registro' | 'recuperar';

const usernameOk = (value: string) => /^[a-z][a-z0-9_]{2,23}$/.test(value);
const registrationPasswordOk = (value: string) => value.length >= 12;
const copy: Record<AuthMode, { title: string; description: string; action: string }> = {
  entrar: { title: 'bienvenido de vuelta', description: 'tu isla, tus recuerdos y tus visitas te esperan.', action: 'conectar' },
  registro: { title: 'empieza tu isla', description: 'elige un nombre público para que otros exploradores te encuentren.', action: 'crear mi cuenta' },
  recuperar: { title: 'recupera tu acceso', description: 'te enviaremos una llave segura a tu correo.', action: 'enviar llave' },
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
        if (error) throw error; sfx.coin(); setStatus({ text: 'la llave de acceso ya va camino a tu correo.' });
      } else if (mode === 'registro') {
        const normalizedUsername = username.toLowerCase();
        if (!usernameOk(normalizedUsername)) throw new Error('tu usuario debe tener de 3 a 24 caracteres: letras, números o guion bajo.');
        if (!registrationPasswordOk(password)) throw new Error('tu clave debe tener al menos 12 caracteres.');
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { pending_username: normalizedUsername }, emailRedirectTo: `${window.location.origin}${window.location.pathname}#/auth` } });
        if (error) throw error;
        if (data.session) { await completeProfile(normalizedUsername); sfx.coin(); window.location.hash = routeHref('isla'); return; }
        sfx.coin(); setStatus({ text: 'cuenta creada. confirma el correo y vuelve a conectar tu isla.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; sfx.coin(); window.location.hash = routeHref('isla');
      }
    } catch (error) { sfx.error(); setStatus({ text: readableSupabaseError(error), error: true }); } finally { setBusy(false); }
  };

  const icon = (d: string) => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
  const modes: Array<{ id: AuthMode; label: string }> = [
    { id: 'entrar', label: 'conectar' },
    { id: 'registro', label: 'crear cuenta' },
    { id: 'recuperar', label: 'ayuda' },
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
        <h1 id="titulo-vista" tabIndex={-1}>
          {text.title}
        </h1>
        <p className="logon__lead">{text.description}</p>
        {mode === 'registro' && <p className="logon__lead">al crear tu cuenta aceptas las <a href={routeHref('reglas')}>reglas y la privacidad</a> de la beta.</p>}

        <div className="logon__tabs" role="tablist" aria-label="opciones de cuenta">
          {modes.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'is-active' : ''} onClick={() => chooseMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        <form className="logon__form" onSubmit={submit}>
          {!isSupabaseConfigured && (
            <p className="logon__status logon__status--error" role="alert">
              la red de cuentas no está configurada.
            </p>
          )}
          {mode === 'registro' && (
            <label className="logon__field">
              <span>nombre público de tu isla</span>
              <div>
                {icon('M12 12a4 4 0 100-8 4 4 0 000 8zM4 21q0-7 8-7t8 7')}
                <input required minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="ejemplo_isla" autoCapitalize="none" autoComplete="username" />
              </div>
              <small>otros jugadores te verán como @{username || 'tu_isla'}</small>
            </label>
          )}
          <label className="logon__field">
            <span>correo</span>
            <div>
              {icon('M3 6h18v12H3zM3 7l9 7 9-7')}
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" />
            </div>
          </label>
          {mode !== 'recuperar' && (
            <label className="logon__field">
              <span>{mode === 'registro' ? 'crea una clave' : 'clave'}</span>
              <div>
                {icon('M6 11h12v9H6zM8.5 11V8a3.500 3.500 0 017 0v3')}
                <input required minLength={mode === 'registro' ? 12 : 8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'registro' ? 'mínimo 12 caracteres' : 'tu clave'} autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} />
              </div>
            </label>
          )}
          {status && (
            <p className={`logon__status${status.error ? ' logon__status--error' : ''}`} role={status.error ? 'alert' : 'status'}>
              {status.text}
            </p>
          )}
          <button className="logon__submit" disabled={!isSupabaseConfigured || busy}>
            <span>{busy ? 'conectando...' : text.action}</span>
            <i aria-hidden="true">›</i>
          </button>
        </form>

        <p className="logon__foot">
          {mode === 'entrar' && (
            <button type="button" onClick={() => chooseMode('recuperar')}>
              olvidé mi clave
            </button>
          )}
          <a href={routeHref('reglas')}>reglas y privacidad</a>
          <a href={routeHref('inicio')}>volver a la bienvenida</a>
        </p>
      </section>
    </div>
  );
}
