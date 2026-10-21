import { useEffect, useMemo, useRef, useState } from 'react';
import type { Doc } from '../editor/commands';
import { routeHref } from '../../app/useHashRoute';
import { completeProfile, currentSession, getIsland, isSupabaseConfigured, myIsland, readableSupabaseError, saveIsland, type PublicIsland } from '../../persistence/supabase';
import { touchIslandPresence } from '../../persistence/community';
import { IslandSocialControls } from './IslandSocialControls';
import { VisitBanner } from './VisitBanner';
import { ReportButton } from '../legal/ReportButton';
import { AeroWindow } from '../../ui/AeroWindow';
import { EditorPage } from '../editor/EditorPage';
import { AeroLoader } from '../../ui/AeroLoader';
import { createLatestQueue } from '../../persistence/latestQueue';
import { tr } from '../../i18n';

function Loading({ text }: { text: string }) { return <AeroLoader variant="scene" text={text} detail={tr('la marea está preparando la visita...', 'the tide is preparing the visit...')} />; }

export function MyIslandPage() {
  const [state, setState] = useState<'cargando' | 'local' | 'perfil' | 'listo' | 'error'>('cargando');
  const [island, setIsland] = useState<PublicIsland | null>(null); const [username, setUsername] = useState(''); const [message, setMessage] = useState(''); const revision = useRef(0);
  useEffect(() => { let alive = true; (async () => { if (!isSupabaseConfigured) { setState('local'); return; } const session = await currentSession(); if (!session) { window.location.hash = routeHref('auth'); return; } const existing = await myIsland(); if (!alive) return; if (existing) { revision.current = existing.revision; setIsland(existing); setState('listo'); void touchIslandPresence(existing.id).catch(() => undefined); } else setState('perfil'); })().catch(() => alive && setState('error')); return () => { alive = false; }; }, []);
  const create = async (e: React.FormEvent) => { e.preventDefault(); try { const result = await completeProfile(username); revision.current = result.revision; setIsland(result); setState('listo'); } catch (error) { setMessage(readableSupabaseError(error, tr('no se pudo crear tu isla.', 'could not create your island.'))); } };
  const remoteSave = useMemo(() => {
    if (!island) return async (_doc: Doc) => undefined;
    return createLatestQueue(async (doc: Doc) => {
      revision.current = await saveIsland(island.id, revision.current, doc);
    });
  }, [island]);
  useEffect(() => {
    if (!island) return;
    const report = () => void touchIslandPresence(island.id).catch(() => undefined);
    report();
    const timer = window.setInterval(report, 90_000);
    return () => window.clearInterval(timer);
  }, [island]);
  if (state === 'cargando') return <Loading text={tr('abriendo tu isla...', 'opening your island...')} />;
  if (state === 'local') return <EditorPage />;
  if (state === 'error') return <Loading text={tr('no se pudo abrir tu isla. vuelve a intentarlo.', 'could not open your island. try again.')} />;
  if (state === 'perfil') return <div className="app"><main className="main"><AeroWindow className="win-auth" title={tr('tu primera isla', 'your first island')} icon={<span className="mini-orb" />}><form className="auth-form" onSubmit={create}><h1 id="titulo-vista" tabIndex={-1}>{tr('elige tu usuario', 'choose your username')}</h1><label>{tr('usuario público', 'public username')}<input required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder={tr('ejemplo_isla', 'example_island')} /></label>{message && <p className="auth-status auth-status--error" role="alert">{message}</p>}<button className="vista-button">{tr('crear mi isla', 'create my island')}</button></form></AeroWindow></main></div>;
  return island ? <EditorPage key={island.id} initialDoc={island.layout} ownerLabel={island.name} saveRemote={remoteSave} /> : null;
}

export function VisitIslandPage({ username }: { username: string }) {
  const [state, setState] = useState<'cargando' | 'listo' | 'vacio' | 'error'>('cargando'); const [island, setIsland] = useState<PublicIsland | null>(null);
  useEffect(() => { let alive = true; getIsland(username).then((v) => { if (!alive) return; setIsland(v); setState(v ? 'listo' : 'vacio'); }).catch(() => alive && setState('error')); return () => { alive = false; }; }, [username]);
  if (state === 'cargando') return <Loading text={tr('visitando isla...', 'visiting island...')} />;
  if (state !== 'listo' || !island) return <div className="app"><main className="main"><AeroWindow className="win-auth" title={tr('visita', 'visit')} icon={<span className="mini-orb" />}><div className="auth-form"><h1 id="titulo-vista" tabIndex={-1}>{state === 'vacio' ? tr('esta isla no existe', 'this island does not exist') : tr('no se pudo abrir la isla', 'could not open the island')}</h1><a href={routeHref('explorar')}>{tr('explorar islas', 'explore islands')}</a></div></AeroWindow></main></div>;
  return <><VisitBanner island={island} /><ReportButton username={island.username} /><IslandSocialControls islandId={island.id} ownerName={island.displayName} /><EditorPage key={island.id} initialDoc={island.layout} editable={false} ownerLabel={`${tr('isla de', 'island of')} ${island.displayName}`} ownerAvatar={island.avatar} /></>;
}
