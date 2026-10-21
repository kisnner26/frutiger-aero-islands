import { useEffect, useState } from 'react';
import { islandHref } from '../../app/useHashRoute';
import { loadDirectory, loadOnlinePlayers, type DirectoryPlayer, type OnlinePlayer } from '../../persistence/presence';
import { isSupabaseConfigured } from '../../persistence/supabase';
import { findCountry } from '../../world/countries';
import { FlagBadge } from '../../world/FlagBadge';
import { tr, lang } from '../../i18n';

type Tab = 'en linea' | 'todos';

/** quién está jugando ahora y el directorio de todos los jugadores, con búsqueda. */
export function PlayersPanel({ me }: { me: string | null }) {
  const [tab, setTab] = useState<Tab>('en linea');
  const [online, setOnline] = useState<OnlinePlayer[] | null>(null);
  const [all, setAll] = useState<DirectoryPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || tab !== 'en linea') return;
    let alive = true;
    const load = () => void loadOnlinePlayers().then((r) => alive && setOnline(r)).catch(() => alive && (setOnline([]), setFailed(true)));
    load();
    const t = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [tab]);

  useEffect(() => {
    if (!isSupabaseConfigured || tab !== 'todos') return;
    let alive = true;
    setBusy(true);
    const t = window.setTimeout(() => {
      void loadDirectory(query, 0)
        .then((r) => alive && (setAll(r.players), setTotal(r.total), setFailed(false)))
        .catch(() => alive && setFailed(true))
        .finally(() => alive && setBusy(false));
    }, query ? 250 : 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [tab, query]);

  const more = async () => {
    setBusy(true);
    try {
      const r = await loadDirectory(query, all.length);
      setAll((prev) => [...prev, ...r.players.filter((p) => !prev.some((q) => q.username === p.username))]);
      setTotal(r.total);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const row = (username: string, country: string | null, isOnline: boolean, note?: string) => (
    <li key={username} className={username === me ? 'is-me' : ''}>
      <FlagBadge code={country} width={22} />
      <a href={username === me ? '#/isla' : islandHref(username)} title={findCountry(country)?.name ?? tr('sin país', 'no country')}>
        @{username}
      </a>
      <small>{note ?? (findCountry(country)?.name ?? '')}</small>
      <i className={isOnline ? 'is-on' : ''} aria-label={isOnline ? tr('en línea', 'online') : tr('desconectado', 'offline')} />
    </li>
  );

  if (!isSupabaseConfigured) return <p className="players__empty">{tr('los jugadores aparecen cuando hay comunidad conectada.', 'players appear when the community is connected.')}</p>;
  return (
    <div className="players">
      <nav className="leader__tabs" role="tablist" aria-label={tr('jugadores', 'players')}>
        <button type="button" role="tab" aria-selected={tab === 'en linea'} className={tab === 'en linea' ? 'is-active' : ''} onClick={() => setTab('en linea')}>{tr('en línea', 'online')}{online ? ` (${online.length})` : ''}</button>
        <button type="button" role="tab" aria-selected={tab === 'todos'} className={tab === 'todos' ? 'is-active' : ''} onClick={() => setTab('todos')}>{tr('todos', 'all')}{tab === 'todos' && total ? ` (${total})` : ''}</button>
      </nav>
      {tab === 'todos' && (
        <label className="vista-search players__search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.2" /><path d="M12 12 L17 17" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('buscar jugador', 'search player')} aria-label={tr('buscar jugador', 'search player')} />
        </label>
      )}
      {failed && <p className="players__empty" role="alert">{tr('no se pudo cargar la lista. vuelve a intentarlo en un momento.', 'the list could not be loaded. try again in a moment.')}</p>}
      {tab === 'en linea' && online === null && !failed && <p className="players__empty" role="status">{tr('buscando jugadores...', 'looking for players...')}</p>}
      {tab === 'en linea' && online && online.length === 0 && !failed && <p className="players__empty">{tr('no hay nadie conectado en este momento. comparte el enlace y sé el primero en saludar.', 'nobody is connected right now. share the link and be the first to say hi.')}</p>}
      {tab === 'en linea' && online && online.length > 0 && <ul className="players__list">{online.map((p) => row(p.username, p.country, true, p.secondsAgo < 90 ? tr('ahora', 'now') : `${tr('hace', '')} ${Math.round(p.secondsAgo / 60)} min${lang === 'en' ? ' ago' : ''}`.trim()))}</ul>}
      {tab === 'todos' && !failed && all.length === 0 && !busy && <p className="players__empty">{query ? `${tr('no hay jugadores que coincidan con', 'no players match')} "${query}".` : tr('todavía no hay jugadores.', 'there are no players yet.')}</p>}
      {tab === 'todos' && all.length > 0 && <ul className="players__list">{all.map((p) => row(p.username, p.country, p.online))}</ul>}
      {tab === 'todos' && all.length < total && (
        <button type="button" className="vista-button" disabled={busy} onClick={() => void more()}>{busy ? tr('cargando...', 'loading...') : `${tr('ver más', 'see more')} (${total - all.length})`}</button>
      )}
    </div>
  );
}
