import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from 'react';
import type { WorldScene } from '../../engine/WorldScene';
import { useSession } from '../../persistence/session';
import { isSupabaseConfigured, readableSupabaseError } from '../../persistence/supabase';
import { claimCell, forgetSnapshot, loadLeaderboard, loadSnapshot, restoreCell, type Challenge, type Ranked, type Restoration, type TerritoryMe } from '../../persistence/territory';
import { COUNTRIES, findCountry } from '../../world/countries';
import { countryAnchor } from '../../world/geoProjection';
import { FlagBadge } from '../../world/FlagBadge';
import { everyWhileVisible } from '../../persistence/fastcache';
import { nextMilestone } from '../../story/lore';
import { restorationStore } from '../../world/restorationStore';
import { CELL, RESTORE_CAP_PER_PERSON, cellCenter, cellKey, claimHint, ownerColor, type CellInfo, type CellRef } from '../../world/territory';
import { tr } from '../../i18n';

type Tab = 'retos' | 'jugadores' | 'paises' | 'restauradores';

/** país cuyo punto de referencia queda más cerca del centro de la parcela. */
function nearestCountry(cx: number, cy: number): string | null {
  const c = cellCenter(cx, cy);
  let best: { code: string; d: number } | null = null;
  for (const k of COUNTRIES) {
    const p = countryAnchor(k.code);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (!best || d < best.d) best = { code: k.code, d };
  }
  return best && best.d < CELL * 6 ? best.code : null;
}

export function useTerritory(sceneRef: MutableRefObject<WorldScene | null>, active: boolean) {
  const session = useSession();
  const myName = session.username;
  const [cells, setCells] = useState<Map<string, CellInfo>>(new Map());
  const [me, setMe] = useState<TerritoryMe | null>(null);
  const [restoration, setRestoration] = useState<Restoration | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async (force = false) => {
    if (!isSupabaseConfigured) return;
    const snap = await loadSnapshot(force).catch(() => null);
    if (!snap) return;
    setCells(snap.cells);
    setLoaded(true);
    sceneRef.current?.setTerritory(snap.cells, myName);
    setMe(snap.me);
    setRestoration(snap.restoration);
    if (snap.restoration) restorationStore.set(snap.restoration.percent);
    setChallenges(snap.challenges);
  }, [sceneRef, myName]);
  // la escena se crea de forma asíncrona: cuando aparece (o cambia), se le entrega el mapa ya cargado
  useEffect(() => {
    if (!loaded) return;
    let last: WorldScene | null = null;
    const t = window.setInterval(() => {
      const sc = sceneRef.current;
      if (sc && sc !== last) {
        last = sc;
        sc.setTerritory(cells, myName);
      }
    }, 300);
    return () => window.clearInterval(t);
  }, [loaded, cells, myName, sceneRef]);
  useEffect(() => {
    void refresh();
    if (!active) return;
    return everyWhileVisible(() => void refresh(), 40_000);
  }, [refresh, active]);
  /** actualiza al instante lo que ya sabemos (sin esperar al servidor); la lectura completa llega después. */
  const patchLocal = useCallback(
    (cx: number, cy: number, patch: Partial<CellInfo>, energyCost: number) => {
      setCells((prev) => {
        const next = new Map(prev);
        const k = cellKey(cx, cy);
        const base = next.get(k) ?? { cx, cy, owner: null, country: null, shieldUntil: 0, progress: 0 };
        next.set(k, { ...base, ...patch });
        sceneRef.current?.setTerritory(next, myName);
        return next;
      });
      setMe((m) => (m ? { ...m, energy: Math.max(0, m.energy - energyCost) } : m));
    },
    [sceneRef, myName],
  );
  return { myName, cells, me, restoration, challenges, refresh, loaded, patchLocal };
}

interface Props {
  sceneRef: MutableRefObject<WorldScene | null>;
  data: ReturnType<typeof useTerritory>;
  picked: CellRef | null;
}

export function TerritoryPanel({ sceneRef, data, picked }: Props) {
  const { myName, cells, me, restoration, challenges, refresh, patchLocal } = data;
  const [tab, setTab] = useState<Tab>('retos');
  const [board, setBoard] = useState<Ranked[]>([]);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sceneRef.current?.setMapMode(true);
    return () => sceneRef.current?.setMapMode(false);
  }, [sceneRef]);
  useEffect(() => {
    if (tab === 'retos' || !isSupabaseConfigured) return;
    let alive = true;
    void loadLeaderboard(tab).then((b) => alive && setBoard(b)).catch(() => alive && setBoard([]));
    return () => {
      alive = false;
    };
  }, [tab, cells]);

  const cell: CellInfo | null = picked ? (cells.get(cellKey(picked.cx, picked.cy)) ?? { cx: picked.cx, cy: picked.cy, owner: null, country: null, shieldUntil: 0, progress: 0 }) : null;
  const adjacentOwned = useMemo(() => {
    if (!picked || !myName) return false;
    for (const c of cells.values()) if (c.owner === myName && Math.abs(c.cx - picked.cx) <= 1 && Math.abs(c.cy - picked.cy) <= 1) return true;
    return false;
  }, [cells, picked, myName]);
  const energy = me ? Math.floor(me.energy) : 0;
  const hint = cell ? claimHint(cell, { name: myName, owned: me?.owned ?? 0, adjacentOwned, energy }) : null;
  const zone = picked ? findCountry(nearestCountry(picked.cx, picked.cy)) : undefined;
  const canRestore = Boolean(cell && cell.blight && myName && cell.progress < 100 && energy >= 1);

  const act = async (kind: 'restaurar' | 'reclamar' | 'capturar') => {
    if (!picked) return;
    setBusy(true);
    setMsg(null);
    try {
      if (kind === 'restaurar') {
        const p = await restoreCell(picked.cx, picked.cy);
        patchLocal(picked.cx, picked.cy, { progress: p }, 1);
        setMsg({ text: p >= 100 ? tr('zona restaurada. el color vuelve al planeta.', 'zone restored. color returns to the planet.') : `${tr('restauración al', 'restored to')} ${p}%.` });
      } else {
        const a = await claimCell(picked.cx, picked.cy);
        patchLocal(picked.cx, picked.cy, { owner: myName, shieldUntil: Date.now() + 30 * 60_000 }, a === 'capture' ? 2 : 1);
        setMsg({ text: a === 'capture' ? tr('parcela capturada. tiene escudo 30 minutos.', 'plot captured. it has a 30 minute shield.') : tr('parcela reclamada. tiene escudo 30 minutos.', 'plot claimed. it has a 30 minute shield.') });
      }
      forgetSnapshot();
      void refresh(true); // sin bloquear: el resultado ya se ve
    } catch (error) {
      setMsg({ text: readableSupabaseError(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) return <p className="territory__empty">{tr('la conquista necesita conexión con la comunidad.', 'conquest needs a connection to the community.')}</p>;
  const pct = restoration?.percent ?? 0;
  return (
    <div className="territory">
      <section className="territory__sum" aria-label={tr('estado del planeta', 'planet status')}>
        <div>
          <strong>{tr('planeta restaurado', 'planet restored')} · {pct.toFixed(pct < 10 ? 1 : 0)}%</strong>
          <small>
            {restoration ? `${restoration.restoredCells} ${tr('de', 'of')} ${restoration.totalCells} ${tr('zonas', 'zones')} · ${restoration.helpers} ${restoration.helpers === 1 ? tr('persona ayuda', 'person helping') : tr('personas ayudan', 'people helping')}` : tr('cargando...', 'loading...')}
          </small>
        </div>
        <i aria-hidden="true"><b style={{ width: `${Math.min(100, pct)}%` }} /></i>
        <small>{nextMilestone(pct) ? `${tr('próximo regalo para todos a', 'next gift for everyone at')} ${nextMilestone(pct)!.percent}%: ${nextMilestone(pct)!.reward}` : tr('el planeta brilla otra vez', 'the planet shines again')}</small>
      </section>

      <section className="territory__me" aria-label={tr('tu energía', 'your energy')}>
        <span className="territory__dots" aria-label={`${tr('energía', 'energy')} ${energy} ${tr('de', 'of')} 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={i < energy ? 'is-on' : ''} />
          ))}
        </span>
        <small>{me ? `${me.owned} ${me.owned === 1 ? tr('parcela', 'plot') : tr('parcelas', 'plots')} ${tr('tuyas', 'yours')}${energy < 5 ? ` · +1 ${tr('energía en', 'energy in')} ${Math.ceil(me.secondsToNext / 60)} min` : ''}` : myName ? tr('cargando...', 'loading...') : tr('conecta tu cuenta para conquistar', 'sign in to conquer')}</small>
      </section>

      {cell && picked ? (
        <section className="territory__cell" aria-label={tr('parcela elegida', 'selected plot')}>
          <div className="territory__cellhead">
            <FlagBadge code={zone?.code ?? null} width={30} />
            <div>
              <strong>{zone ? `${tr('zona de', 'zone of')} ${zone.name}` : tr('mar abierto', 'open sea')} · {picked.cx},{picked.cy}</strong>
              <small>
                {cell.owner ? (
                  <>
                    {tr('dueño', 'owner')} <span style={{ color: `#${ownerColor(cell.owner).toString(16).padStart(6, '0')}` }}>@{cell.owner}</span>
                    {cell.shieldUntil > Date.now() ? ` · ${tr('con escudo', 'shielded')}` : ''}
                  </>
                ) : (
                  tr('sin dueño', 'no owner')
                )}
              </small>
            </div>
          </div>
          <p className="territory__state">
            {!cell.blight ? tr('zona sana: aquí el mundo ya brilla', 'healthy zone: the world already shines here') : cell.progress >= 100 ? `${cell.zone}: ${tr('restaurada y brillante', 'restored and shining')}` : cell.progress > 0 ? `${cell.zone} · ${tr('restaurada al', 'restored to')} ${cell.progress}%` : `${cell.zone}: ${tr('gris y abandonada', 'gray and abandoned')}`}
          </p>
          {cell.blight && <i className="territory__bar" aria-hidden="true"><b style={{ width: `${cell.progress}%` }} /></i>}
          <div className="territory__actions">
            <button type="button" className="vista-button" disabled={busy || !canRestore} onClick={() => void act('restaurar')}>
              {tr('restaurar', 'restore')} (1)
            </button>
            {hint?.action && (
              <button type="button" className="vista-button vista-button--primary" disabled={busy} onClick={() => void act(hint.action!)}>
                {hint.action === 'capturar' ? tr('capturar', 'capture') : tr('reclamar', 'claim')} ({hint.action === 'capturar' ? 2 : 1})
              </button>
            )}
          </div>
          <small className="territory__why">
            {cell.blight ? tr(`restaurar es trabajo de equipo: cada persona aporta hasta ${RESTORE_CAP_PER_PERSON}%, así que hacen falta al menos 3.`, `restoring is teamwork: each person adds up to ${RESTORE_CAP_PER_PERSON}%, so at least 3 are needed.`) : hint && !hint.action ? hint.reason : tr('las zonas grises están en rincones apartados del mapa: explora para encontrarlas.', 'gray zones sit in remote corners of the map: explore to find them.')}
          </small>
        </section>
      ) : (
        <p className="territory__empty">{tr('toca una parcela para conquistarla. las zonas grises son escasas y están lejos de los países: encuéntralas y restáuralas en equipo.', 'tap a plot to conquer it. gray zones are rare and far from the countries: find them and restore them as a team.')}</p>
      )}
      {msg && (
        <p className={`territory__msg${msg.error ? ' is-error' : ''}`} role={msg.error ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}

      <nav className="territory__tabs" role="tablist" aria-label={tr('clasificaciones', 'leaderboards')}>
        {(['retos', 'jugadores', 'paises', 'restauradores'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t === 'paises' ? tr('países', 'countries') : t === 'retos' ? tr('retos', 'challenges') : t === 'jugadores' ? tr('jugadores', 'players') : tr('restauradores', 'restorers')}
          </button>
        ))}
      </nav>
      {tab === 'retos' ? (
        <ul className="territory__list">
          {challenges.length === 0 && <li className="territory__empty">{tr('los retos aparecen al conectar tu cuenta.', 'challenges appear when you sign in.')}</li>}
          {challenges.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.title}</strong>
                <small>{c.description} · {tr('premio', 'reward')}: {c.reward}</small>
                <i className="territory__bar" aria-hidden="true"><b style={{ width: `${(c.progress / c.goal) * 100}%` }} /></i>
              </div>
              <em>{c.progress}/{c.goal}</em>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="territory__list territory__list--rank">
          {board.length === 0 && <li className="territory__empty">{tr('todavía no hay nadie en esta lista. sé el primero.', 'nobody is on this list yet. be the first.')}</li>}
          {board.map((r, i) => (
            <li key={r.name}>
              <span>{i + 1}</span>
              <strong>{tab === 'paises' ? (findCountry(r.name)?.name ?? r.name) : `@${r.name}`}</strong>
              <em>{r.score}</em>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
