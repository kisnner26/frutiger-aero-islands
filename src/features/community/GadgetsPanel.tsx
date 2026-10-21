import { useEffect, useState } from 'react';
import { listGadgets, type Gadget } from '../../persistence/community';
import './social.css';
import { tr } from '../../i18n';

/** gadgets del catálogo: se desbloquean al alcanzar el nivel de tu isla. */
export function GadgetsPanel({ level, onUse }: { level: number; onUse: (gadget: Gadget) => void }) {
  const [items, setItems] = useState<Gadget[] | null>(null);
  useEffect(() => { listGadgets().then(setItems).catch(() => setItems([])); }, []);
  if (items && !items.length) return <p className="world-community__message">{tr('los gadgets estarán disponibles al conectar la comunidad.', 'gadgets will be available when the community is connected.')}</p>;
  return (
    <ul className="gadget-list" aria-label="gadgets">
      {(items ?? []).map((g) => {
        const open = level >= g.unlockLevel;
        return (
          <li key={g.id} className={open ? 'is-open' : ''}>
            <strong>{g.name}</strong>
            <small>{g.description}</small>
            {open ? <button type="button" onClick={() => onUse(g)}>usar gadget</button> : <em>se desbloquea en el nivel {g.unlockLevel}</em>}
          </li>
        );
      })}
    </ul>
  );
}
