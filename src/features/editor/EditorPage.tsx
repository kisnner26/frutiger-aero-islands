import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { sfx } from '../../audio/sfx';
import { CATALOG, CATALOG_MAP } from '../../catalog/catalog';
import { computeCharm, progressForLevel, LEVEL_UP_BONUS } from '../../domain/charm';
import { LAND_TIERS, clampToWorld, nextExpansionLevel } from '../../domain/geometry';
import type { IslandScene, SceneCallbacks } from '../../engine/IslandScene';
import { SceneView } from '../../engine/SceneView';
import { localRepository, quarantineCorrupt, type SaveResult } from '../../persistence/localDraft';
import { Backdrop } from '../../scene/Backdrop';
import { sceneBridge } from '../../engine/sceneBridge';
import { addMemory, attachPhoto } from '../../memories/store';
import { CameraOverlay } from '../camera/CameraOverlay';
import { phoneBus } from '../phone/phoneBus';
import { AeroWindow } from '../../ui/AeroWindow';
import { Balloon } from '../../ui/Balloon';
import { Taskbar } from '../../ui/Taskbar';
import { ExploreMode } from '../explore/ExploreMode';
import { Prologue, prologueSeen } from '../../story/Prologue';
import { MissionsPanel } from '../../story/MissionsPanel';
import { nextMission, worldVisit } from '../../story/missions';
import { restorationStore } from '../../world/restorationStore';
import { minePosition } from '../../world/archipelago';
import { CountryGate } from '../../world/CountryPicker';
import { countryStore, useCountry } from '../../world/country';
import { FlagBadge } from '../../world/FlagBadge';
import { routeHref } from '../../app/useHashRoute';
import { AvatarImg } from '../../avatar/AvatarFace';
import { useAvatar } from '../../avatar/store';
import type { AvatarSpec } from '../../avatar/model';
import { prepareFromIsland } from '../../world/worldState';
import { createState, editorReducer, newObjectId, type Doc } from './commands';
import { DecorationCatalog } from './DecorationCatalog';
import { EditorToolbar } from './EditorToolbar';
import { ObjectInspector } from './ObjectInspector';
import { AeroWorkshop } from '../community/AeroWorkshop';
import { DailyTide } from '../community/DailyTide';

interface Float {
  id: number;
  x: number;
  y: number;
  text: string;
  golden: boolean;
}

const COMBO_WINDOW_MS = 2500;

/** evita registrar dos veces la creación de la isla en la misma carga de la página. */
let creationStarted = false;

function init(initialDoc?: Doc) {
  if (initialDoc) return { state: createState(initialDoc), recovered: false, corrupt: false };
  const res = localRepository.load();
  if (res.status === 'ok') return { state: createState(res.doc), recovered: false, corrupt: false };
  if (res.status === 'corrupto') {
    quarantineCorrupt();
    return { state: createState(), recovered: false, corrupt: true };
  }
  return { state: createState(), recovered: false, corrupt: false, fresh: true };
}

export function EditorPage({ initialDoc, editable = true, ownerLabel = 'tu isla', saveRemote, ownerAvatar }: { initialDoc?: Doc; editable?: boolean; ownerLabel?: string; saveRemote?: (doc: Doc) => Promise<void>; ownerAvatar?: AvatarSpec | null }) {
  const boot = useRef<ReturnType<typeof init> | null>(null);
  if (boot.current === null) boot.current = init(initialDoc);
  const [state, dispatch] = useReducer(editorReducer, boot.current.state);
  const [placing, setPlacing] = useState<string | null>(null);
  const [exploring, setExploring] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [prologue, setPrologue] = useState(() => editable && !prologueSeen());
  useEffect(() => void restorationStore.refresh(), []);
  const [floats, setFloats] = useState<Float[]>([]);
  const [combo, setCombo] = useState(0);
  const [win, setWin] = useState({ catalog: { open: true, min: false }, objects: { open: false, min: false }, workshop: { open: false, min: false }, daily: { open: false, min: false } });
  const [toast, setToast] = useState<{ id: number; text: string; tone: 'error' | 'info' } | null>(
    boot.current.corrupt ? { id: -1, text: 'el borrador guardado estaba dañado; se empezó una isla nueva', tone: 'error' } : null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveResult | 'pendiente' | 'remoto-error'>('ok');
  const sceneRef = useRef<IslandScene | null>(null);
  const comboRef = useRef({ count: 0, last: 0 });
  const floatId = useRef(0);
  const hydratedRemote = useRef(!initialDoc || !saveRemote);
  const doc = state.doc;
  const cameraOn = useSyncExternalStore(phoneBus.subscribe, phoneBus.cameraMode);
  const country = useCountry();
  const avatar = useAvatar();

  /* primera visita local: el recuerdo de creación se registra al instante (con la fecha real) y la captura se añade cuando la escena está lista.
     el trabajo no depende del ciclo de montaje: así tampoco se duplica ni se pierde con el doble montaje de desarrollo. */
  useEffect(() => {
    const fresh = (boot.current as { fresh?: boolean } | null)?.fresh;
    if (!fresh || !editable || initialDoc || saveRemote || creationStarted) return;
    creationStarted = true;
    void (async () => {
      try {
        const memory = await addMemory({ kind: 'creacion', text: 'empezaste tu isla' }, { unique: true });
        if (!memory) return;
        for (let i = 0; i < 20 && !sceneBridge.get(); i++) await new Promise((r) => setTimeout(r, 300));
        await new Promise((r) => setTimeout(r, 1800));
        const scene = sceneBridge.get();
        if (!scene) return;
        const shot = await scene.capture();
        if (shot) await attachPhoto(memory.id, shot.blob, shot.width, shot.height);
      } catch {
        /* el álbum es opcional: si falla, el juego sigue */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => phoneBus.setCamera(false), []);

  const charm = useMemo(() => computeCharm(doc.objects, CATALOG_MAP), [doc.objects]);
  const progress = { level: doc.maxLevel, ...progressForLevel(charm, doc.maxLevel) };
  const mission = nextMission({ objects: doc.objects, level: doc.maxLevel, country, visitedWorld: worldVisit.get() });
  const selected = doc.objects.find((o) => o.id === state.selectedId) ?? null;

  /* ---------- guardado local y remoto ---------- */
  useEffect(() => {
    // la carga inicial viene del servidor: no la reescribimos ni incrementamos su revisión.
    if (!hydratedRemote.current) {
      hydratedRemote.current = true;
      setSaveStatus('ok');
      return;
    }
    setSaveStatus('pendiente');
    const persist = () => {
      const local = localRepository.save(doc);
      if (!saveRemote) return setSaveStatus(local);
      saveRemote(doc).then(() => setSaveStatus(local)).catch(() => setSaveStatus('remoto-error'));
    };
    const t = window.setTimeout(persist, 700);
    const flush = () => localRepository.save(doc);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pagehide', flush);
    };
  }, [doc, saveRemote]);

  /* ---------- avisos ---------- */
  useEffect(() => {
    if (state.notice) {
      setToast(state.notice);
      if (state.notice.tone === 'error') sfx.error();
    }
  }, [state.notice]);

  const objectCount = doc.objects.length;
  const prevCount = useRef(objectCount);
  useEffect(() => {
    if (objectCount > prevCount.current) sfx.place();
    prevCount.current = objectCount;
  }, [objectCount]);

  useEffect(() => {
    if (!state.levelUp) return;
    sfx.levelUp();
    const unlocked = CATALOG.filter((c) => c.unlockLevel === state.levelUp!.level).map((c) => c.name);
    const grew = LAND_TIERS.some((t, i) => i > 0 && t.minLevel === state.levelUp!.level);
    setToast({ id: state.levelUp.id, tone: 'info', text: `nivel ${state.levelUp.level}: +${LEVEL_UP_BONUS} brillos${unlocked.length ? `. desbloqueas ${unlocked.join(', ')}` : ''}${grew ? '. tu isla se hizo más grande' : ''}` });
  }, [state.levelUp]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast((cur) => (cur && cur.id === toast.id ? null : cur)), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---------- acciones ---------- */
  const choose = useCallback((id: string | null) => {
    setPlacing(id);
    if (id) dispatch({ type: 'select', id: null });
  }, []);

  const place = useCallback(
    (x: number, y: number) => {
      if (!placing || !editable) return;
      dispatch({ type: 'place', obj: { id: newObjectId(), assetId: placing, x, y, scale: 1, rotation: 0 } });
    },
    [placing, editable],
  );

  const stepScale = (delta: number) => {
    if (!selected || !editable) return;
    const item = CATALOG_MAP.get(selected.assetId);
    if (!item) return;
    const next = Math.round(Math.min(item.maxScale, Math.max(item.minScale, selected.scale + delta)) * 100) / 100;
    if (next === selected.scale) setToast({ id: Date.now(), tone: 'error', text: 'la escala ya está en el límite' });
    else dispatch({ type: 'patch', id: selected.id, patch: { scale: next } });
  };

  const flip = () => {
    if (!selected || !editable) return;
    const item = CATALOG_MAP.get(selected.assetId);
    if (!item) return;
    const idx = item.orientations.indexOf(selected.rotation);
    dispatch({ type: 'patch', id: selected.id, patch: { rotation: item.orientations[(idx + 1) % item.orientations.length] } });
  };

  const callbacks = useMemo<SceneCallbacks>(
    () => ({
      onSelect: (id) => dispatch({ type: 'select', id }),
      onPlace: place,
      onMove: (id, x, y) => {
        if (!editable) return;
        const w = clampToWorld(x, y);
        dispatch({ type: 'move', id, x: w.x, y: w.y });
      },
      onInvalid: (text) => setToast({ id: Date.now(), tone: 'error', text }),
      onPop: ({ screenX, screenY, kind }) => {
        const golden = kind !== 'burbuja';
        const bonus = kind === 'mariposa' || kind === 'pez';
        const now = performance.now();
        const c = comboRef.current;
        c.count = bonus ? c.count : now - c.last <= COMBO_WINDOW_MS ? Math.min(c.count + 1, 9) : 1;
        c.last = now;
        setCombo(c.count);
        const multiplier = bonus ? 1 : Math.min(c.count, 5);
        const value = bonus ? (kind === 'pez' ? 15 : 10) * (3 + progress.level) : (3 + progress.level) * multiplier * (kind === 'dorada' ? 5 : 1);
        dispatch({ type: 'pop', value, combo: c.count });
        if (kind === 'pez') sfx.splash();
        else sfx.pop();
        window.setTimeout(() => sfx.coin(), 70);
        const id = ++floatId.current;
        const text = `+${value}${!bonus && c.count > 1 ? ` x${c.count}` : ''}`;
        setFloats((f) => [...f.slice(-8), { id, x: screenX, y: screenY, text, golden }]);
        window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1000);
      },
      onZoom: () => undefined,
    }),
    [place, progress.level, editable],
  );

  /* el combo caduca solo */
  useEffect(() => {
    if (combo === 0) return;
    const t = window.setTimeout(() => {
      if (performance.now() - comboRef.current.last >= COMBO_WINDOW_MS - 50) setCombo(0);
    }, COMBO_WINDOW_MS);
    return () => window.clearTimeout(t);
  }, [combo]);

  /* ---------- teclado ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const inField = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === 'Escape') {
        sceneRef.current?.cancelInteraction();
        setPlacing(null);
        return;
      }
      if (inField) return;
      if (editable && (e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
        e.preventDefault();
        dispatch({ type: 'remove', id: state.selectedId });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.selectedId, editable]);

  const sceneProps = useMemo(() => ({ objects: doc.objects, level: doc.maxLevel, selectedId: state.selectedId, placing, country: editable ? country : null, avatar: editable ? avatar : ownerAvatar ?? null }), [doc.objects, doc.maxLevel, state.selectedId, placing, country, editable, avatar, ownerAvatar]);
  const saveText = saveStatus === 'cuota' ? 'sin espacio en este dispositivo' : saveStatus === 'error' || saveStatus === 'remoto-error' ? 'no se pudo guardar en la nube' : saveStatus === 'pendiente' ? 'guardando...' : saveRemote ? 'guardado en la nube' : 'guardado en este dispositivo';
  const placingItem = placing ? CATALOG_MAP.get(placing) : null;

  const toggleWin = (key: 'catalog' | 'objects' | 'workshop' | 'daily') =>
    setWin((w) => {
      const cur = w[key];
      const next = !cur.open ? { open: true, min: false } : cur.min ? { open: true, min: false } : { open: true, min: true };
      return { ...w, [key]: next };
    });
  const patchWin = (key: 'catalog' | 'objects' | 'workshop' | 'daily', v: Partial<{ open: boolean; min: boolean }>) => setWin((w) => ({ ...w, [key]: { ...w[key], ...v } }));

  const orbIcon = <span className="mini-orb" />;
  const hasSel = !!selected;

  return (
    <div className={`game${cameraOn ? ' game--camera' : ''}`}>
      <Backdrop withIsland={false} />
      <SceneView scene={sceneProps} callbacks={callbacks} controlRef={sceneRef} />

      <header className="hud">
        <div className="hud__bar glass-panel">
          {editable ? (
            <a className="hud__avatar hud__avatar--face" href={routeHref('personaje')} aria-label="editar mi personaje">
              <AvatarImg crop="cabeza" />
            </a>
          ) : (
            <span className="hud__avatar" aria-hidden="true" />
          )}
          {editable && country && <FlagBadge code={country} width={40} />}
          <div className="hud__who">
            <strong>{ownerLabel}</strong>
            <span>{editable ? (saveRemote ? 'cuenta conectada' : 'modo local') : 'visita'}</span>
          </div>
          <div className="hud__coins" aria-label={`${doc.brillos} brillos`}>
            <span className="hud__orb" aria-hidden="true" />
            <strong>{doc.brillos}</strong>
          </div>
          <div className="hud__level">
            <span className="hud__lvl" title={nextExpansionLevel(progress.level) ? `tu isla crece en el nivel ${nextExpansionLevel(progress.level)}` : undefined}>nivel {progress.level}</span>
            <div className="vista-bar" role="progressbar" aria-label="progreso de nivel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)}>
              <span style={{ width: `${progress.ratio * 100}%` }} />
            </div>
            <span className="hud__charm">encanto {charm}{progress.next !== null ? ` / ${progress.next}` : ''}</span>
          </div>
        </div>
        <p className="hud__hint">
          {placingItem ? `toca la isla para colocar: ${placingItem.name}. esc para terminar.` : mission ? `misión: ${mission.mission.text} (${mission.value}/${mission.mission.goal})` : 'revienta burbujas, atrapa la mariposa y el pez saltarín; decora tu isla.'}
          {combo > 1 && <span className="hud__combo"> combo x{combo}</span>}
        </p>
      </header>

      <div className="floats" aria-hidden="true">
        {floats.map((f) => (
          <span key={f.id} className={`float${f.golden ? ' float--gold' : ''}`} style={{ left: f.x, top: f.y }}>
            {f.text}
          </span>
        ))}
      </div>

      {editable && win.objects.open && (
        <AeroWindow className="win-objects" title="objetos de la isla" icon={orbIcon} collapsed={win.objects.min} onMinimize={() => patchWin('objects', { min: !win.objects.min })} onClose={() => patchWin('objects', { open: false })}>
          <ObjectInspector objects={doc.objects} selectedId={state.selectedId} onSelect={(id) => dispatch({ type: 'select', id })} onPatch={(id, patch) => dispatch({ type: 'patch', id, patch })} />
        </AeroWindow>
      )}

      {editable && win.catalog.open && (
        <AeroWindow className="win-catalog" title="decoraciones" icon={orbIcon} collapsed={win.catalog.min} onMinimize={() => patchWin('catalog', { min: !win.catalog.min })} onClose={() => patchWin('catalog', { open: false })}>
          <div className="catalog-bar">
            <EditorToolbar
              canUndo={state.undo.length > 0}
              canRedo={state.redo.length > 0}
              hasSelection={hasSel}
              onUndo={() => dispatch({ type: 'undo' })}
              onRedo={() => dispatch({ type: 'redo' })}
              onFlip={flip}
              onSmaller={() => stepScale(-0.1)}
              onBigger={() => stepScale(0.1)}
              onDelete={() => selected && dispatch({ type: 'remove', id: selected.id })}
            />
            <span className="catalog-bar__status">
              {doc.objects.length} / 150 objetos · {saveText}
            </span>
          </div>
          <DecorationCatalog placing={placing} level={doc.maxLevel} brillos={doc.brillos} onChoose={choose} />
        </AeroWindow>
      )}

      {editable && win.workshop.open && (
        <AeroWindow className="win-workshop" title="laboratorio aero" icon={<span className="mini-orb mini-orb--green" />} collapsed={win.workshop.min} onMinimize={() => patchWin('workshop', { min: !win.workshop.min })} onClose={() => patchWin('workshop', { open: false })}>
          <AeroWorkshop level={doc.maxLevel} onOpenArcade={() => { window.location.hash = routeHref('arcade'); }} />
        </AeroWindow>
      )}

      {editable && win.daily.open && (
        <AeroWindow className="win-daily" title="marea diaria" icon={<span className="mini-orb mini-orb--globe" />} collapsed={win.daily.min} onMinimize={() => patchWin('daily', { min: !win.daily.min })} onClose={() => patchWin('daily', { open: false })}>
          <DailyTide />
        </AeroWindow>
      )}

      <div className="balloon-region" aria-live="polite">
        {toast && <Balloon key={toast.id} tone={toast.tone} text={toast.text} title={toast.tone === 'info' && state.levelUp && toast.id === state.levelUp.id ? `nivel ${state.levelUp.level}` : undefined} />}
      </div>

      <Taskbar
        tasks={[
          { id: 'catalog', label: 'decoraciones', icon: <span className="mini-orb" />, active: win.catalog.open && !win.catalog.min, onClick: () => toggleWin('catalog') },
          {
            id: 'mundo',
            label: 'mundo',
            icon: <span className="mini-orb mini-orb--globe" />,
            active: false,
            onClick: () => {
              prepareFromIsland(minePosition(countryStore.get()));
              window.location.hash = '#/mundo';
            },
          },
          { id: 'workshop', label: 'laboratorio', icon: <span className="mini-orb mini-orb--green" />, active: win.workshop.open && !win.workshop.min, onClick: () => toggleWin('workshop') },
          { id: 'daily', label: 'marea diaria', icon: <span className="mini-orb mini-orb--globe" />, active: win.daily.open && !win.daily.min, onClick: () => toggleWin('daily') },
          { id: 'missions', label: 'misiones', icon: <span className="mini-orb" />, active: missionsOpen, onClick: () => setMissionsOpen((v) => !v) },
          { id: 'explore', label: 'caminar', icon: <span className="mini-orb mini-orb--green" />, active: exploring, onClick: () => setExploring(true) },
          { id: 'objects', label: 'objetos', icon: <span className="mini-orb mini-orb--green" />, active: win.objects.open && !win.objects.min, onClick: () => toggleWin('objects') },
        ]}
      />
      {prologue && <Prologue onDone={() => setPrologue(false)} />}
      {missionsOpen && (
        <AeroWindow className="win-missions" title="misiones del faro" icon={orbIcon} onClose={() => setMissionsOpen(false)}>
          <MissionsPanel ctx={{ objects: doc.objects, level: doc.maxLevel, country, visitedWorld: worldVisit.get() }} />
        </AeroWindow>
      )}
      {exploring && <ExploreMode objects={doc.objects} level={doc.maxLevel} avatar={avatar} onExit={() => setExploring(false)} />}
      <CameraOverlay />
      {editable && <CountryGate />}
      <span className="sr-only" aria-live="polite">
        {selected ? `seleccionado: ${CATALOG_MAP.get(selected.assetId)?.name}` : ''}
      </span>
    </div>
  );
}
