import { useEffect, useState } from 'react';
import { listGadgets, type Gadget } from '../../persistence/community';
import './social.css';

/** gadgets del catálogo: se desbloquean al alcanzar el nivel de tu isla. */
export function GadgetsPanel({ level }: { level: number }) {
  const [items, setItems] = useState<Gadget[] | null>(null);
  useEffect(() => { listGadgets().then(setItems).catch(() => setItems([])); }, []);
  if (items && !items.length) return <p className="world-community__message">los gadgets estarán disponibles al conectar la comunidad.</p>;
  return (
    <ul className="gadget-list" aria-label="gadgets">
      {(items ?? []).map((g) => {
        const open = level >= g.unlockLevel;
        return (
          <li key={g.id} className={open ? 'is-open' : ''}>
            <strong>{g.name}</strong>
            <small>{g.description}</small>
            <em>{open ? 'desbloqueado' : `se desbloquea en el nivel ${g.unlockLevel}`}</em>
          </li>
        );
      })}
    </ul>
  );
}
