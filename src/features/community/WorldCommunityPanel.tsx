import { useEffect, useState } from 'react';
import { contributeToExpedition, listExpeditions, myExpeditionContributions, type Expedition } from '../../persistence/community';
import { currentSession, readableSupabaseError } from '../../persistence/supabase';
import './social.css';

const CAP = 100;

export function WorldCommunityPanel() {
  const [items, setItems] = useState<Expedition[] | null>(null);
  const [mine, setMine] = useState<Record<string, number>>({});
  const [signed, setSigned] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    listExpeditions().then(setItems).catch(() => { setItems([]); setMessage('las expediciones estarán disponibles al conectar la comunidad.'); });
    void currentSession().then((s) => { setSigned(Boolean(s)); if (s) void myExpeditionContributions().then(setMine); });
  }, []);
  const contribute = async (item: Expedition) => {
    try {
      const progress = await contributeToExpedition(item.id, 10);
      setItems((all) => (all ?? []).map((entry) => (entry.id === item.id ? { ...entry, progress } : entry)));
      setMine((m) => ({ ...m, [item.id]: Math.min(CAP, (m[item.id] ?? 0) + 10) }));
      setMessage('');
    } catch (error) { setMessage(readableSupabaseError(error, 'no se pudo registrar el aporte.')); }
  };
  return (
    <section className="world-community" aria-labelledby="expedition-title">
      <header><p>evento regional</p><h2 id="expedition-title">expediciones del mundo</h2></header>
      {items && !items.length && !message && <p className="world-community__message">no hay expediciones abiertas ahora.</p>}
      {(items ?? []).map((item) => {
        const done = item.progress >= item.goal;
        const full = (mine[item.id] ?? 0) >= CAP;
        return (
          <article key={item.id}>
            <span className={`world-community__icon world-community__icon--${item.kind}`} aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <small>{item.region} · recompensa: {item.reward} · {item.progress}/{item.goal}{signed ? ` · tu aporte ${mine[item.id] ?? 0}/${CAP}` : ''}</small>
              <i><b style={{ width: `${Math.min(100, (item.progress / item.goal) * 100)}%` }} /></i>
            </div>
            <button type="button" disabled={!signed || done || full} onClick={() => void contribute(item)} aria-label={`aportar 10 a ${item.title}`}>+10</button>
          </article>
        );
      })}
      {!signed && items && items.length > 0 && <p className="world-community__message">conecta tu cuenta para aportar.</p>}
      {message && <p className="world-community__message" role="status">{message}</p>}
    </section>
  );
}
