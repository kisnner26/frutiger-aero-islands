import { useEffect, useState } from 'react';
import { contributeToExpedition, listExpeditions, myExpeditionContributions, type Expedition } from '../../persistence/community';
import { currentSession, readableSupabaseError } from '../../persistence/supabase';
import './social.css';
import { tr } from '../../i18n';
import { db } from '../../i18n/dbText';

const CAP = 100;

export function WorldCommunityPanel() {
  const [items, setItems] = useState<Expedition[] | null>(null);
  const [mine, setMine] = useState<Record<string, number>>({});
  const [signed, setSigned] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    listExpeditions().then(setItems).catch(() => { setItems([]); setMessage(tr('las expediciones estarán disponibles al conectar la comunidad.', 'expeditions will be available when the community is connected.')); });
    void currentSession().then((s) => { setSigned(Boolean(s)); if (s) void myExpeditionContributions().then(setMine); });
  }, []);
  const contribute = async (item: Expedition) => {
    try {
      const progress = await contributeToExpedition(item.id, 10);
      setItems((all) => (all ?? []).map((entry) => (entry.id === item.id ? { ...entry, progress } : entry)));
      setMine((m) => ({ ...m, [item.id]: Math.min(CAP, (m[item.id] ?? 0) + 10) }));
      setMessage('');
    } catch (error) { setMessage(readableSupabaseError(error, tr('no se pudo registrar el aporte.', 'could not record the contribution.'))); }
  };
  return (
    <section className="world-community" aria-labelledby="expedition-title">
      <header><p>{tr('evento regional', 'regional event')}</p><h2 id="expedition-title">{tr('expediciones del mundo', 'world expeditions')}</h2></header>
      {items && !items.length && !message && <p className="world-community__message">{tr('no hay expediciones abiertas ahora.', 'there are no open expeditions right now.')}</p>}
      {(items ?? []).map((item) => {
        const done = item.progress >= item.goal;
        const full = (mine[item.id] ?? 0) >= CAP;
        return (
          <article key={item.id}>
            <span className={`world-community__icon world-community__icon--${item.kind}`} aria-hidden="true" />
            <div>
              <strong>{db(item.title)}</strong>
              <small>{db(item.region)} · {tr('recompensa', 'reward')}: {db(item.reward)} · {item.progress}/{item.goal}{signed ? ` · ${tr('tu aporte', 'your contribution')} ${mine[item.id] ?? 0}/${CAP}` : ''}</small>
              <i><b style={{ width: `${Math.min(100, (item.progress / item.goal) * 100)}%` }} /></i>
            </div>
            <button type="button" disabled={!signed || done || full} onClick={() => void contribute(item)} aria-label={`${tr('aportar 10 a', 'contribute 10 to')} ${db(item.title)}`}>+10</button>
          </article>
        );
      })}
      {!signed && items && items.length > 0 && <p className="world-community__message">{tr('conecta tu cuenta para aportar.', 'sign in to contribute.')}</p>}
      {message && <p className="world-community__message" role="status">{message}</p>}
    </section>
  );
}
