import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { islandHref, routeHref } from '../../app/useHashRoute';
import type { WorldScene } from '../../engine/WorldScene';
import { WorldView } from '../../engine/WorldView';
import { AeroWindow } from '../../ui/AeroWindow';
import { WorldCommunityPanel } from '../community/WorldCommunityPanel';
import { GadgetsPanel } from '../community/GadgetsPanel';
import { worldPresence, type Gadget } from '../../persistence/community';
import { phoneBus } from '../phone/phoneBus';
import { Taskbar } from '../../ui/Taskbar';
import { syncCountry } from '../../persistence/country';
import { isSupabaseConfigured, myIsland } from '../../persistence/supabase';
import { listWorldIslands, type RealIsland } from '../../persistence/world';
import { buildArchipelago, loadMine } from '../../world/archipelago';
import { findCountry, searchCountries } from '../../world/countries';
import { everyWhileVisible } from '../../persistence/fastcache';
import { useExclusiveWindows } from '../../ui/useExclusiveWindows';
import { worldVisit } from '../../story/missions';
import { LeaderboardPanel } from './LeaderboardPanel';
import { useSession } from '../../persistence/session';
import { PlayersPanel } from './PlayersPanel';
import { loadCountryCounts, type CountryCount } from '../../persistence/presence';
import { listCountryIslands } from '../../persistence/world';
import { TerritoryPanel, useTerritory } from './TerritoryPanel';
import type { CellRef } from '../../world/territory';
import { COUNTRY_FACTS } from '../../world/countryFacts';
import { countryStore, useCountry } from '../../world/country';
import { CountryGate } from '../../world/CountryPicker';
import { FlagBadge } from '../../world/FlagBadge';
import { loadWorldView, saveWorldView, type WorldView as ViewState } from '../../world/worldState';
import { aeroForecast } from '../../world/aeroForecast';
import { tr } from '../../i18n';

/** mundo: planeta lejano, transición a su océano interior y selección de islas. */
export function WorldPage() {
  const mine = useRef(loadMine());
  const [remoteMine, setRemoteMine] = useState(false);
  const [remoteMineId, setRemoteMineId] = useState<string | null>(null);
  const [mineTick, setMineTick] = useState(0);
  const [others, setOthers] = useState<RealIsland[]>([]);
  const [presence, setPresence] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);
  const country = useCountry();
  const sessionUser = useSession().username;
  const sceneRef = useRef<WorldScene | null>(null);
  const initial = useRef<ViewState | null>(null);
  const prevCountry = useRef(country);
  const islands = useMemo(() => {
    const list = buildArchipelago(mine.current, others, country);
    if (prevCountry.current !== country) {
      // al cambiar de país la vista se recentra en la nueva zona de mi isla
      const me = list.find((i) => i.id === 'mia');
      if (me) initial.current = { mode: sceneRef.current?.mode ?? 'lejos', cx: me.x, cy: me.y, zoom: 1.1, selectedId: 'mia' };
      prevCountry.current = country;
    }
    return list;
  }, [country, mineTick, others]);
  const mineNode = islands.find((i) => i.id === 'mia');
  const rebuildKey = `${mineNode?.x},${mineNode?.y},${mineNode?.level},${mineNode?.objects.length},${country}`;
  if (initial.current === null) {
    const saved = loadWorldView();
    const me = buildArchipelago(mine.current, [], countryStore.get()).find((i) => i.id === 'mia');
    initial.current = saved?.mode === 'dentro' ? saved : { mode: 'dentro', cx: me?.x ?? 0, cy: me?.y ?? 0, zoom: 1, selectedId: null };
  }
  const [changeCountry, setChangeCountry] = useState(false);
  useEffect(() => {
    void syncCountry();
    if (!isSupabaseConfigured) return;
    let alive = true;
    // se resuelven juntas para montar pixi una sola vez cuando llega el estado remoto.
    Promise.all([myIsland().catch(() => null), listWorldIslands().catch(() => [])])
      .then(([mineFromCloud, list]) => {
        if (!alive) return;
        if (mineFromCloud) {
          mine.current = { objects: mineFromCloud.layout.objects, level: mineFromCloud.layout.maxLevel };
          setRemoteMine(true);
          setRemoteMineId(mineFromCloud.id);
          setMineTick((n) => n + 1);
        }
        setOthers(list.filter((island) => island.username !== mineFromCloud?.username));
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    const refresh = () => {
      void worldPresence().then((rows) => {
        if (!alive) return;
        setPresence(Object.fromEntries(rows.map((row) => [row.islandId, row.onlineCount])));
      }).catch(() => undefined);
    };
    refresh();
    const stop = everyWhileVisible(refresh, 60_000);
    return () => { alive = false; stop(); };
  }, []);

  const [mode, setMode] = useState<'lejos' | 'dentro'>(initial.current?.mode ?? 'lejos');
  const [selectedId, setSelectedId] = useState<string | null>(initial.current?.selectedId ?? null);
  const [listOpen, setListOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [gadgetsOpen, setGadgetsOpen] = useState(false);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, CountryCount>>({});
  const [conquestOpen, setConquestOpen] = useState(false);
  const [pickedCell, setPickedCell] = useState<CellRef | null>(null);
  const territory = useTerritory(sceneRef, conquestOpen);
  useEffect(() => worldVisit.mark(), []);
  if (import.meta.env.DEV) (window as unknown as { __world?: unknown }).__world = sceneRef; // solo para pruebas en desarrollo
  const [atlasQuery, setAtlasQuery] = useState('');
  const [countryFocus, setCountryFocus] = useState<string | null>(null);
  useExclusiveWindows(
    { jugadores: playersOpen, lista: listOpen, expediciones: expOpen, gadgets: gadgetsOpen, atlas: atlasOpen, conquista: conquestOpen, ranking: leaderOpen, pais: Boolean(countryFocus) },
    { jugadores: () => setPlayersOpen(false), lista: () => setListOpen(false), expediciones: () => setExpOpen(false), gadgets: () => setGadgetsOpen(false), atlas: () => setAtlasOpen(false), conquista: () => { setConquestOpen(false); setPickedCell(null); }, ranking: () => setLeaderOpen(false), pais: () => setCountryFocus(null) },
  );
  const selected = islands.find((i) => i.id === selectedId) ?? null;
  const forecast = useMemo(() => aeroForecast(country), [country]);
  const onlineTotal = Object.values(presence).reduce((total, count) => total + count, 0);
  const selectedOnline = selected ? (presence[selected.kind === 'mia' ? remoteMineId ?? selected.id : selected.id] ?? 0) : 0;
  const focusedCountry = findCountry(countryFocus);
  const countOf = (code: string) => Math.max(counts[code]?.islands ?? 0, islands.filter((island) => island.country === code).length);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    const load = () => void loadCountryCounts().then((c) => alive && setCounts(c));
    load();
    const stop = everyWhileVisible(load, 60_000);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  // al explorar un país se piden todas sus islas (el mundo solo trae una muestra al abrir)
  useEffect(() => {
    if (!countryFocus || !isSupabaseConfigured) return;
    let alive = true;
    void listCountryIslands(countryFocus).then((list) => {
      if (!alive || !list.length) return;
      setOthers((prev) => {
        const known = new Set(prev.map((i) => i.id));
        const add = list.filter((i) => !known.has(i.id) && i.username !== sessionUser);
        return add.length ? [...prev, ...add] : prev;
      });
    });
    return () => {
      alive = false;
    };
  }, [countryFocus, sessionUser]);
  const focusedCountryPlayers = countryFocus ? islands.filter((island) => island.country === countryFocus) : [];
  const facts = countryFocus ? COUNTRY_FACTS.get(countryFocus) : undefined;
  const exploreCountry = (code: string) => {
    sceneRef.current?.select(null);
    setSelectedId(null);
    sceneRef.current?.enter();
    sceneRef.current?.focusCountry(code);
  };
  useEffect(() => {
    sceneRef.current?.markCountry(countryFocus);
    if (!countryFocus) sceneRef.current?.focusCountry(null);
  }, [countryFocus]);
  const openCountry = (code: string) => {
    sceneRef.current?.select(null);
    setSelectedId(null);
    if (mode === 'lejos') {
      sceneRef.current?.faceCountry(code);
      sceneRef.current?.markCountry(code);
      setCountryFocus(code);
      setAtlasOpen(false);
      return;
    }
    sceneRef.current?.enter();
    sceneRef.current?.focusCountry(code);
    setCountryFocus(code);
    setAtlasOpen(false);
  };
  const firstCountry = useRef(true);
  useEffect(() => {
    if (firstCountry.current) {
      firstCountry.current = false;
      return;
    }
    setSelectedId('mia');
  }, [country]);

  const callbacks = useMemo(
    () => ({
      onSelect: (id: string | null) => setSelectedId(id),
      onView: (v: ViewState) => {
        saveWorldView(v);
        setZoomed(v.zoom >= 1.8);
      },
      onMode: (m: 'lejos' | 'dentro') => setMode(m),
      onCountry: (code: string) => { setSelectedId(null); setCountryFocus(code); },
      onCell: (cx: number, cy: number) => setPickedCell({ cx, cy }),
    }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      const sc = sceneRef.current;
      if (!sc) return;
      if (e.key === 'Escape') {
        if (selectedId) {
          sc.select(null);
          setSelectedId(null);
        } else if (mode === 'dentro') sc.leave();
        return;
      }
      if (mode === 'lejos') {
        if (e.key === 'ArrowLeft') sc.spinPlanet(-12);
        else if (e.key === 'ArrowRight') sc.spinPlanet(12);
        else if (e.key === 'ArrowUp') sc.spinPlanet(0, 0.12);
        else if (e.key === 'ArrowDown') sc.spinPlanet(0, -0.12);
        return;
      }
      if (mode !== 'dentro') return;
      const step = 60;
      if (e.key === 'ArrowLeft') sc.pan(-step, 0);
      else if (e.key === 'ArrowRight') sc.pan(step, 0);
      else if (e.key === 'ArrowUp') sc.pan(0, -step);
      else if (e.key === 'ArrowDown') sc.pan(0, step);
      else if (e.key === '+' || e.key === '=') sc.zoomBy(1.2);
      else if (e.key === '-') sc.zoomBy(1 / 1.2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selectedId]);

  const choose = (id: string) => {
    sfx.click();
    const sc = sceneRef.current;
    if (!sc) return;
    if (sc.mode === 'lejos') sc.enter();
    sc.select(id);
    setSelectedId(id);
    sc.focus(id);
  };

  const useGadget = (gadget: Gadget) => {
    sfx.click();
    setGadgetsOpen(false);
    if (gadget.kind === 'phone') return phoneBus.open();
    if (gadget.kind === 'music') return phoneBus.open('radio');
    if (gadget.kind === 'camera') {
      window.location.hash = routeHref('isla');
      window.setTimeout(() => phoneBus.open('camara'), 0);
      return;
    }
    if (gadget.kind === 'laptop') {
      window.location.hash = routeHref('explorar');
      return;
    }
    window.location.hash = routeHref('arcade');
  };

  const status = mode === 'lejos' ? tr('vista lejana del planeta', 'distant view of the planet') : tr('dentro del planeta, archipiélago interior', 'inside the planet, inner archipelago');

  return (
    <div className="game world">
      <WorldView islands={islands} initial={initial.current} callbacks={callbacks} controlRef={sceneRef} rebuildKey={rebuildKey} />

      <header className="world-hud">
        <div className="glass-panel world-hud__bar">
          {mode === 'dentro' ? (
            <button type="button" className="world-hud__back" onClick={() => sceneRef.current?.leave()}>
              ‹ {tr('alejar', 'zoom out')}
            </button>
          ) : (
            <a className="world-hud__back" href={routeHref('inicio')}>
              ‹ {tr('inicio', 'home')}
            </a>
          )}
          <strong>{tr('mundo', 'world')}</strong>
          <span className="world-hud__hint">{mode === 'lejos' ? tr('vista exterior del planeta', 'outside view of the planet') : tr('arrastra, usa rueda o pinza para zoom y toca un punto de país', 'drag, use the wheel or pinch to zoom and tap a country point')}</span>
        </div>
        {loaded && (
          <p className="world-hud__note">
            {others.length === 0 ? tr('aún no hay otros exploradores. comparte el enlace y sé de los primeros.', 'there are no other explorers yet. share the link and be one of the first.') : `${others.length + 1} ${tr('islas de jugadores reales', 'islands of real players')}`}
            {territory.restoration ? ` · ${tr('planeta restaurado', 'planet restored')} ${territory.restoration.percent.toFixed(territory.restoration.percent < 10 ? 1 : 0)}%` : ''}
          </p>
        )}
      </header>

      {!focusedCountry && !selected && <aside className={`world-radar world-radar--${mode}`} aria-label={tr('radar del archipiélago', 'archipelago radar')}>
        <header><span className={`world-radar__weather world-radar__weather--${forecast.tone}`} aria-hidden="true" /><div><p>{tr('radar aero', 'aero radar')}</p><strong>{forecast.label}</strong><small>{forecast.detail}</small></div></header>
        <div className="world-radar__metrics"><span><b>{others.length + 1}</b> {tr('islas', 'islands')}</span><span><b>{onlineTotal}</b> {tr('en línea', 'online')}</span><span><b>{Math.max(0, others.length)}</b> {tr('rutas', 'routes')}</span></div>
        <div className="world-radar__actions">
          <button type="button" onClick={() => { sceneRef.current?.enter(); window.setTimeout(() => choose('mia'), 30); }}>{tr('mi zona', 'my zone')}</button>
          <button type="button" onClick={() => setAtlasOpen(true)}>{tr('atlas de países', 'country atlas')}</button>
          <button type="button" onClick={() => phoneBus.open('radio')}>radio</button>
        </div>
      </aside>}

      {mode === 'lejos' && (
        <div className="world-enter">
          <button type="button" className="vista-button vista-button--primary" onClick={() => sceneRef.current?.enter()}>
            {tr('entrar al planeta', 'enter the planet')}
          </button>
        </div>
      )}

      {listOpen && (
        <AeroWindow className="win-world-list" title={tr('islas del mundo', 'islands of the world')} icon={<span className="mini-orb mini-orb--green" />} onClose={() => setListOpen(false)}>
          <ul className="island-list" aria-label={tr('islas', 'islands')}>
            {islands.map((i) => (
              <li key={i.id}>
                <button type="button" aria-pressed={i.id === selectedId} onClick={() => choose(i.id)}>
                  <strong>{i.name}</strong>
                  <small>{i.kind === 'mia' ? (remoteMine ? tr('tuya, guardada en tu cuenta', 'yours, saved to your account') : tr('tuya, guardada en este dispositivo', 'yours, saved on this device')) : `@${i.username}`} · {presence[i.id] ?? 0} {tr('en línea', 'online')}</small>
                </button>
              </li>
            ))}
          </ul>
        </AeroWindow>
      )}

      {expOpen && (
        <AeroWindow className="win-world-list" title={tr('expediciones', 'expeditions')} icon={<span className="mini-orb" />} onClose={() => setExpOpen(false)}>
          <WorldCommunityPanel />
        </AeroWindow>
      )}
      {gadgetsOpen && (
        <AeroWindow className="win-world-list" title="gadgets" icon={<span className="mini-orb mini-orb--green" />} onClose={() => setGadgetsOpen(false)}>
          <GadgetsPanel level={mine.current.level} onUse={useGadget} />
        </AeroWindow>
      )}
      {playersOpen && (
        <AeroWindow className="win-players" title={tr('jugadores', 'players')} icon={<span className="mini-orb mini-orb--green" />} onClose={() => setPlayersOpen(false)}>
          <PlayersPanel me={territory.myName} />
        </AeroWindow>
      )}
      {leaderOpen && (
        <AeroWindow className="win-leader" title="ranking · top 100" icon={<span className="mini-orb" />} onClose={() => setLeaderOpen(false)}>
          <LeaderboardPanel />
        </AeroWindow>
      )}
      {conquestOpen && (
        <AeroWindow className="win-territory" title={tr('conquista y restauración', 'conquest and restoration')} icon={<span className="mini-orb mini-orb--green" />} onClose={() => { setConquestOpen(false); setPickedCell(null); sceneRef.current?.selectCell(null); }}>
          <TerritoryPanel sceneRef={sceneRef} data={territory} picked={pickedCell} />
        </AeroWindow>
      )}
      {atlasOpen && (
        <AeroWindow className="win-world-atlas" title={tr('atlas de países', 'country atlas')} icon={<span className="mini-orb mini-orb--globe" />} onClose={() => setAtlasOpen(false)}>
          <section className="world-atlas"><label>{tr('busca un país', 'search for a country')}<input autoFocus value={atlasQuery} onChange={(event) => setAtlasQuery(event.target.value)} placeholder={tr('nicaragua, japón, brasil...', 'nicaragua, japan, brazil...')} /></label><div>{searchCountries(atlasQuery).slice(0, 18).map((entry) => <button key={entry.code} type="button" onClick={() => openCountry(entry.code)}><FlagBadge code={entry.code} width={28} /><span><strong>{entry.name}</strong><small>{countOf(entry.code)} {countOf(entry.code) === 1 ? tr('isla', 'island') : tr('islas', 'islands')} {tr('en esta zona', 'in this zone')}{counts[entry.code]?.online ? ` · ${counts[entry.code].online} ${tr('en línea', 'online')}` : ''}</small></span></button>)}</div></section>
        </AeroWindow>
      )}
      {focusedCountry && (
        <AeroWindow className="win-world-country" title={focusedCountry.name} icon={<FlagBadge code={focusedCountry.code} width={28} />} onClose={() => setCountryFocus(null)}>
          <div className="world-country">
            <p>{facts?.continente ?? tr('país', 'country')}</p>
            {facts && (
              <dl className="world-country__facts">
                <div><dt>{tr('capital', 'capital')}</dt><dd>{facts.capital}</dd></div>
                <div><dt>{tr('idioma', 'language')}</dt><dd>{facts.idioma}</dd></div>
              </dl>
            )}
            <strong>{countOf(focusedCountry.code)} {countOf(focusedCountry.code) === 1 ? tr('isla de jugador', 'player island') : tr('islas de jugadores', 'player islands')} {tr('en esta zona', 'in this zone')}{counts[focusedCountry.code]?.online ? ` · ${counts[focusedCountry.code].online} ${tr('en línea', 'online')}` : ''}</strong>
            {focusedCountryPlayers.length > 0 ? (
              <ul className="world-country__players">
                {focusedCountryPlayers.slice(0, 6).map((i) => (
                  <li key={i.id}>
                    <span>{i.name}</span>
                    {i.kind === 'mia' ? <a href={routeHref('isla')}>{tr('entrar', 'enter')}</a> : <a href={islandHref(i.username!)}>{tr('visitar', 'visit')}</a>}
                  </li>
                ))}
              </ul>
            ) : (
              <small>{tr('nadie ha construido aquí todavía. elige este país en tu perfil y sé el primero de la zona.', 'nobody has built here yet. choose this country in your profile and be the first in the zone.')}</small>
            )}
            <div className="world-country__actions">
              {mode === 'lejos' ? (
                <button type="button" className="vista-button vista-button--primary" onClick={() => exploreCountry(focusedCountry.code)}>{tr('explorar la zona', 'explore the zone')}</button>
              ) : focusedCountryPlayers.length > 0 ? (
                <button type="button" className="vista-button vista-button--primary" onClick={() => { const first = focusedCountryPlayers[0]; setCountryFocus(null); sceneRef.current?.select(first.id); setSelectedId(first.id); sceneRef.current?.focus(first.id); }}>
                  {tr('ver', 'see')} {focusedCountryPlayers.length === 1 ? tr('la isla', 'the island') : tr('las islas', 'the islands')}
                </button>
              ) : (
                <button type="button" className="vista-button vista-button--primary" onClick={() => sceneRef.current?.zoomBy(1.7)}>{tr('acercar más', 'zoom in more')}</button>
              )}
              {focusedCountry.code !== country && <button type="button" className="vista-button" onClick={() => { countryStore.set(focusedCountry.code); void syncCountry(); }}>{tr('vivo aquí', 'i live here')}</button>}
            </div>
          </div>
        </AeroWindow>
      )}

      {selected && mode === 'dentro' && (
        <AeroWindow className="win-world-card" title={selected.name} icon={<span className="mini-orb" />} onClose={() => sceneRef.current?.select(null)}>
          <div className="world-card">
            {selected.kind === 'mia' ? (
              <>
                <p>
                  {selected.objects.length} {tr('objetos', 'objects')} · {tr('nivel', 'level')} {selected.level} · {remoteMine ? tr('guardada en tu cuenta', 'saved to your account') : tr('guardada en este dispositivo', 'saved on this device')} · {selectedOnline} {tr('en línea', 'online')}
                </p>
                <p className="world-card__zone">
                  <FlagBadge code={selected.country} width={34} />
                  {findCountry(selected.country) ? `${tr('zona', 'zone')}: ${findCountry(selected.country)!.name}` : tr('zona: mar abierto, aún sin país', 'zone: open sea, no country yet')}{' '}
                  <button type="button" className="text-link" onClick={() => setChangeCountry(true)}>
                    {selected.country ? tr('cambiar país', 'change country') : tr('elegir país', 'choose country')}
                  </button>
                </p>
                <a className="vista-button vista-button--primary" href={routeHref('isla')}>
                  {tr('entrar a mi isla', 'enter my island')}
                </a>
              </>
            ) : (
              <>
                <p>
                  {selected.objects.length} {tr('objetos', 'objects')} · {tr('nivel', 'level')} {selected.level} · {selectedOnline} {tr('en línea', 'online')}
                </p>
                <p className="world-card__zone">
                  <FlagBadge code={selected.country} width={34} />
                  {findCountry(selected.country) ? `${tr('zona', 'zone')}: ${findCountry(selected.country)!.name}` : tr('zona: mar abierto', 'zone: open sea')}
                </p>
                <a className="vista-button vista-button--primary" href={islandHref(selected.username!)}>
                  {tr('visitar', 'visit')}
                </a>
              </>
            )}
          </div>
        </AeroWindow>
      )}

      <CountryGate forceOpen={changeCountry} onClose={() => setChangeCountry(false)} />
      <span className="sr-only" role="status" aria-live="polite">
        {status}
        {selected ? `, ${tr('seleccionada', 'selected')}: ${selected.name}` : ''}
      </span>

      <nav className="world-controls" aria-label={tr('controles del mundo', 'world controls')} data-card={selected && mode === 'dentro' ? '1' : '0'}>
        {mode === 'lejos' ? (
          <>
            <button type="button" className="world-controls__wide" disabled={!country} onClick={() => country && sceneRef.current?.faceCountry(country)}>{tr('ir a mi país', 'go to my country')}</button>
          </>
        ) : (
          <>
            <button type="button" className="world-controls__wide" onClick={() => { sceneRef.current?.select('mia'); setSelectedId('mia'); sceneRef.current?.focus('mia'); }}>{tr('ir a mi isla', 'go to my island')}</button>
            {zoomed && (
              <button type="button" className="world-controls__wide" onClick={() => { sceneRef.current?.focusCountry(null); setCountryFocus(null); sceneRef.current?.resetCamera(); }}>
                {tr('ver todo el mundo', 'see the whole world')}
              </button>
            )}
          </>
        )}
      </nav>

      <Taskbar tasks={[{ id: 'islas', label: tr('islas', 'islands'), icon: <span className="mini-orb mini-orb--green" />, active: listOpen, onClick: () => setListOpen((v) => !v) }, { id: 'jugadores', label: tr('jugadores', 'players'), icon: <span className="mini-orb mini-orb--green" />, active: playersOpen, onClick: () => setPlayersOpen((v) => !v) }, { id: 'ranking', label: 'ranking', icon: <span className="mini-orb" />, active: leaderOpen, onClick: () => setLeaderOpen((v) => !v) }, { id: 'conquista', label: tr('conquista', 'conquest'), icon: <span className="mini-orb mini-orb--green" />, active: conquestOpen, onClick: () => { if (!conquestOpen && sceneRef.current?.mode === 'lejos') sceneRef.current.enter(); setConquestOpen((v) => !v); } }, { id: 'atlas', label: 'atlas', icon: <span className="mini-orb mini-orb--globe" />, active: atlasOpen, onClick: () => setAtlasOpen((v) => !v) },
        ...(isSupabaseConfigured ? [{ id: 'exp', label: tr('expediciones', 'expeditions'), icon: <span className="mini-orb" />, active: expOpen, onClick: () => setExpOpen((v) => !v) }, { id: 'gadgets', label: 'gadgets', icon: <span className="mini-orb mini-orb--green" />, active: gadgetsOpen, onClick: () => setGadgetsOpen((v) => !v) }] : [])]} />
    </div>
  );
}
