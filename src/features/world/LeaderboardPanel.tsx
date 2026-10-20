import { useEffect, useMemo, useState } from 'react';
import { islandHref } from '../../app/useHashRoute';
import { loadMyRank, loadTop100, type LeaderRow, type MyRank, type Period } from '../../persistence/leaderboard';
import { useSession } from '../../persistence/session';
import { isSupabaseConfigured } from '../../persistence/supabase';
import { findCountry } from '../../world/countries';
import { FlagBadge } from '../../world/FlagBadge';

const MEDAL = ['#f5c542', '#c9d3dc', '#d9955a'];

/** top 100: puntos por parcelas, restauraciones, capturas y me gusta. */
export function LeaderboardPanel() {
  const session = useSession();
  const [period, setPeriod] = useState<Period>('semana');
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [mine, setMine] = useState<MyRank | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'puesto' | 'jugador' | 'puntos'>('puesto');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    setFailed(false);
    void loadTop100(period).then((r) => alive && setRows(r)).catch(() => alive && (setFailed(true), setRows([])));
    if (session.status === 'con-sesion') void loadMyRank(period).then((m) => alive && setMine(m));
    return () => {
      alive = false;
    };
  }, [period, session.status]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (rows ?? []).filter((r) => !q || r.username.includes(q) || (findCountry(r.country)?.name ?? '').includes(q));
    if (sort === 'jugador') return [...list].sort((a, b) => a.username.localeCompare(b.username));
    if (sort === 'puntos') return [...list].sort((a, b) => b.score - a.score || a.rank - b.rank);
    return list;
  }, [rows, query, sort]);

  const myRow = useMemo(() => rows?.find((r) => r.username === session.username) ?? null, [rows, session.username]);

  if (!isSupabaseConfigured) return <p className="leader__empty">el ranking aparece cuando hay comunidad conectada.</p>;
  return (
    <div className="leader">
      <div className="vista-addr" aria-label="ubicación">
        <span className="vista-addr__back" aria-hidden="true">‹</span>
        <span className="vista-addr__path"><span>mundo</span><i aria-hidden="true">›</i><span>ranking</span><i aria-hidden="true">›</i><strong>{period === 'semana' ? 'esta semana' : 'de siempre'}</strong></span>
        <label className="vista-search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.2" /><path d="M12 12 L17 17" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="buscar" aria-label="buscar jugador o país" />
        </label>
      </div>
      <nav className="leader__tabs" role="tablist" aria-label="periodo del ranking">
        {(['semana', 'siempre'] as Period[]).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={period === p} className={period === p ? 'is-active' : ''} onClick={() => setPeriod(p)}>
            {p === 'semana' ? 'esta semana' : 'de siempre'}
          </button>
        ))}
      </nav>
      <p className="leader__rules">10 por parcela · 15 por captura · 5 por restaurar · 3 por reclamar · 2 por me gusta</p>
      {rows === null && <p className="leader__empty" role="status">cargando ranking...</p>}
      {failed && <p className="leader__empty" role="alert">no se pudo cargar el ranking. vuelve a intentarlo en un momento.</p>}
      {rows && rows.length === 0 && !failed && <p className="leader__empty">todavía nadie suma puntos. restaura una zona o reclama una parcela y serás el primero.</p>}
      {rows && rows.length > 0 && (
        <div className="leader__cols" role="row">
          <button type="button" className={sort === 'puesto' ? 'is-sorted' : ''} onClick={() => setSort('puesto')}>puesto</button>
          <button type="button" className={sort === 'jugador' ? 'is-sorted' : ''} onClick={() => setSort('jugador')}>jugador</button>
          <button type="button" className={sort === 'puntos' ? 'is-sorted' : ''} onClick={() => setSort('puntos')}>puntos</button>
        </div>
      )}
      {rows && rows.length > 0 && shown.length === 0 && <p className="leader__empty">no hay resultados para "{query}".</p>}
      {rows && rows.length > 0 && (
        <ol className="leader__list">
          {shown.map((r) => {
            const me = r.username === session.username;
            const country = findCountry(r.country);
            return (
              <li key={r.username} className={me ? 'is-me' : ''}>
                <span className="leader__rank" style={r.rank <= 3 ? { background: MEDAL[r.rank - 1], color: '#4a3a10' } : undefined}>{r.rank}</span>
                <FlagBadge code={r.country} width={22} />
                <a href={islandHref(r.username)} title={country ? `${country.name} · ver su isla` : 'ver su isla'}>
                  @{r.username}
                </a>
                <small>{r.parcels} parc. · {r.restores} rest.</small>
                <b>{r.score}</b>
              </li>
            );
          })}
        </ol>
      )}
      {session.status === 'con-sesion' && !myRow && mine && (
        <p className="leader__me">
          {mine.rank ? `estás en el puesto ${mine.rank} de ${mine.total}` : mine.total ? 'todavía no tienes puntos: restaura una zona o reclama una parcela.' : ''}
          {mine.rank ? ` · ${mine.score} puntos` : ''}
        </p>
      )}
    </div>
  );
}
