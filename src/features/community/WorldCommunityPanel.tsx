import { useEffect, useState } from 'react';
import { contributeToExpedition, listExpeditions, type Expedition } from '../../persistence/community';
import { readableSupabaseError } from '../../persistence/supabase';
import './social.css';

export function WorldCommunityPanel() {
  const [items, setItems] = useState<Expedition[]>([]); const [message, setMessage] = useState('');
  useEffect(() => { void listExpeditions().then(setItems).catch(() => setMessage('las expediciones estarán disponibles al conectar la comunidad.')); }, []);
  const contribute = async (item: Expedition) => { try { const progress = await contributeToExpedition(item.id, 10); setItems((all) => all.map((entry) => entry.id === item.id ? { ...entry, progress } : entry)); } catch (error) { setMessage(readableSupabaseError(error, 'no se pudo registrar el aporte.')); } };
  return <section className="world-community" aria-labelledby="expedition-title"><header><p>evento regional</p><h2 id="expedition-title">expediciones del mundo</h2></header>{items.map((item) => <article key={item.id}><span className={`world-community__icon world-community__icon--${item.kind}`} aria-hidden="true" /><div><strong>{item.title}</strong><small>{item.region} · recompensa: {item.reward}</small><i><b style={{ width: `${Math.min(100, item.progress / item.goal * 100)}%` }} /></i></div><button type="button" onClick={() => void contribute(item)}>+10</button></article>)}{message && <p className="world-community__message" role="status">{message}</p>}</section>;
}
