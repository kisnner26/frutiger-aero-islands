import { useEffect, useState } from 'react';
import { islandSocialStatus, toggleIslandFavorite, toggleIslandLike, type IslandSocialStatus } from '../../persistence/community';
import { readableSupabaseError } from '../../persistence/supabase';
import './social.css';
import { tr } from '../../i18n';

interface Props { islandId: string; ownerName: string; }
const initial: IslandSocialStatus = { likes: 0, favorites: 0, isLiked: false, isFavorited: false };

export function IslandSocialControls({ islandId, ownerName }: Props) {
  const [state, setState] = useState(initial); const [message, setMessage] = useState(''); const [busy, setBusy] = useState<'like' | 'favorite' | null>(null);
  useEffect(() => { let active = true; islandSocialStatus(islandId).then((value) => active && setState(value)).catch(() => undefined); return () => { active = false; }; }, [islandId]);
  const toggle = async (kind: 'like' | 'favorite') => {
    setBusy(kind); setMessage('');
    try {
      const active = kind === 'like' ? await toggleIslandLike(islandId) : await toggleIslandFavorite(islandId);
      setState((value) => kind === 'like' ? { ...value, isLiked: active, likes: value.likes + (active ? 1 : -1) } : { ...value, isFavorited: active, favorites: value.favorites + (active ? 1 : -1) });
    } catch (error) { setMessage(readableSupabaseError(error, tr('inicia sesión para guardar esta isla.', 'sign in to save this island.'))); } finally { setBusy(null); }
  };
  return <aside className="island-social" aria-label={`${tr('acciones para la isla de', 'actions for the island of')} ${ownerName}`}><p className="island-social__owner">{tr('isla de', 'island of')} <strong>{ownerName}</strong></p><div><button type="button" aria-pressed={state.isLiked} disabled={busy !== null} onClick={() => void toggle('like')}>{state.isLiked ? tr('♥ te gusta', '♥ liked') : tr('♡ me gusta', '♡ like')} <b>{state.likes}</b></button><button type="button" aria-pressed={state.isFavorited} disabled={busy !== null} onClick={() => void toggle('favorite')}>{state.isFavorited ? tr('★ guardada', '★ saved') : tr('☆ guardar', '☆ save')} <b>{state.favorites}</b></button></div>{message && <p className="island-social__message" role="status">{message}</p>}</aside>;
}
