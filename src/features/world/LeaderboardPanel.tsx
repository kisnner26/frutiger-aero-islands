import { useEffect, useMemo, useState } from 'react';
import { islandHref } from '../../app/useHashRoute';
import { loadMyRank, loadTop100, type LeaderRow, type MyRank, type Period } from '../../persistence/leaderboard';
import { useSession } from '../../persistence/session';
import { isSupabaseConfigured } from '../../persistence/supabase';
import { findCountry } from '../../world/countries';
import { FlagBadge } from '../../world/FlagBadge';
import { tr } from '../../i18n';

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

  if (!isSupabaseConfigured) return <p className="leader__empty">{tr('el ranking aparece cuando hay comunidad conectada.', 'the ranking appears when the community is connected.')}</p>;
  return (
    <div className="leader">
      <div className="vista-addr" aria-label={tr('ubicación', 'location')}>
        <span className="vista-addr__back" aria-hidden="true">‹</span>
        <span className="vista-addr__path"><span>{tr('mundo', 'world')}</span><i aria-hidden="true">›</i><span>ranking</span><i aria-hidden="true">›</i><strong>{period === 'semana' ? tr('esta semana', 'this week') : tr('de siempre', 'all time')}</strong></span>
        <label className="vista-search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.2" /><path d="M12 12 L17 17" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('buscar', 'search')} aria-label={tr('buscar jugador o país', 'search player or country')} />
        </label>
      </div>
      <nav className="leader__tabs" role="tablist" aria-label={tr('periodo del ranking', 'ranking period')}>
        {(['semana', 'siempre'] as Period[]).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={period === p} className={period === p ? 'is-active' : ''} onClick={() => setPeriod(p)}>
            {p === 'semana' ? tr('esta semana', 'this week') : tr('de siempre', 'all time')}
          </button>
        ))}
      </nav>
      <p className="leader__rules">{tr('10 por parcela · 15 por captura · 5 por restaurar · 3 por reclamar · 2 por me gusta', '10 per plot · 15 per capture · 5 per restore · 3 per claim · 2 per like')}</p>
      {rows === null && <p className="leader__empty" role="status">{tr('cargando ranking...', 'loading ranking...')}</p>}
      {failed && <p className="leader__empty" role="alert">{tr('no se pudo cargar el ranking. vuelve a intentarlo en un momento.', 'the ranking could not be loaded. try again in a moment.')}</p>}
      {rows && rows.length === 0 && !failed && <p className="leader__empty">{tr('todavía nadie suma puntos. restaura una zona o reclama una parcela y serás el primero.', 'nobody has scored yet. restore a zone or claim a plot and you will be the first.')}</p>}
      {rows && rows.length > 0 && (
        <div className="leader__cols" role="row">
          <button type="button" className={sort === 'puesto' ? 'is-sorted' : ''} onClick={() => setSort('puesto')}>{tr('puesto', 'rank')}</button>
          <button type="button" className={sort === 'jugador' ? 'is-sorted' : ''} onClick={() => setSort('jugador')}>{tr('jugador', 'player')}</button>
          <button type="button" className={sort === 'puntos' ? 'is-sorted' : ''} onClick={() => setSort('puntos')}>{tr('puntos', 'points')}</button>
        </div>
      )}
      {rows && rows.length > 0 && shown.length === 0 && <p className="leader__empty">{tr('no hay resultados para', 'no results for')} "{query}".</p>}
      {rows && rows.length > 0 && (
        <ol className="leader__list">
          {shown.map((r) => {
            const me = r.username === session.username;
            const country = findCountry(r.country);
            return (
              <li key={r.username} className={me ? 'is-me' : ''}>
                <span className="leader__rank" style={r.rank <= 3 ? { background: MEDAL[r.rank - 1], color: '#4a3a10' } : undefined}>{r.rank}</span>
                <FlagBadge code={r.country} width={22} />
                <a href={islandHref(r.username)} title={country ? `${country.name} · ${tr('ver su isla', 'see their island')}` : tr('ver su isla', 'see their island')}>
                  @{r.username}
                </a>
                <small>{r.parcels} {tr('parc.', 'plots')} · {r.restores} {tr('rest.', 'rest.')}</small>
                <b>{r.score}</b>
              </li>
            );
          })}
        </ol>
      )}
      {session.status === 'con-sesion' && !myRow && mine && (
        <p className="leader__me">
          {mine.rank ? `${tr('estás en el puesto', 'you are in place')} ${mine.rank} ${tr('de', 'of')} ${mine.total}` : mine.total ? tr('todavía no tienes puntos: restaura una zona o reclama una parcela.', 'you have no points yet: restore a zone or claim a plot.') : ''}
          {mine.rank ? ` · ${mine.score} ${tr('puntos', 'points')}` : ''}
        </p>
      )}
    </div>
  );
}
