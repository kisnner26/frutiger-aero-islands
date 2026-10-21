import { useState } from 'react';
import { CATALOG } from '../../catalog/catalog';
import type { CatalogItem } from '../../domain/island';
import { useRestoration } from '../../world/restorationStore';
import { tr } from '../../i18n';

interface Props {
  placing: string | null;
  level: number;
  brillos: number;
  onChoose: (id: string | null) => void;
}

type Group = 'todo' | 'naturaleza' | 'hogar' | 'mar' | 'cielo';
const GROUPS: Array<{ id: Group; label: string; has: (i: CatalogItem) => boolean }> = [
  { id: 'todo', label: tr('todo', 'all'), has: () => true },
  { id: 'naturaleza', label: tr('naturaleza', 'nature'), has: (i) => ['vegetacion', 'roca', 'cristal'].includes(i.category) },
  { id: 'hogar', label: tr('hogar y ocio', 'home and leisure'), has: (i) => ['arquitectura', 'mobiliario', 'ocio'].includes(i.category) || i.id === 'fuente' },
  { id: 'mar', label: tr('mar', 'sea'), has: (i) => i.placementZone === 'water' },
  { id: 'cielo', label: tr('cielo y magia', 'sky and magic'), has: (i) => i.category === 'cielo' },
];

/** fichas al estilo del menú de la wii u: cuadrados brillantes con etiqueta. */
export function DecorationCatalog({ placing, level, brillos, onChoose }: Props) {
  const [group, setGroup] = useState<Group>('todo');
  const planet = useRestoration();
  const shown = CATALOG.filter(GROUPS.find((g) => g.id === group)!.has).sort((a, b) => a.unlockLevel - b.unlockLevel || a.cost - b.cost);
  return (
    <>
    <div className="tile-tabs" role="tablist" aria-label={tr('categorías', 'categories')}>
      {GROUPS.map((g) => (
        <button key={g.id} type="button" role="tab" aria-selected={group === g.id} className={group === g.id ? 'is-active' : ''} onClick={() => setGroup(g.id)}>
          {g.label}
        </button>
      ))}
    </div>
    <ul className="tiles" aria-label={tr('decoraciones', 'decorations')}>
      {shown.map((item) => {
        const lockedByPlanet = Boolean(item.unlockPercent && planet < item.unlockPercent);
        const locked = item.unlockLevel > level || lockedByPlanet;
        const poor = !locked && item.cost > brillos;
        const active = placing === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              className={`tile${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}${poor ? ' is-poor' : ''}`}
              aria-pressed={active}
              aria-disabled={locked || poor}
              onClick={() => {
                if (locked || poor) return;
                onChoose(active ? null : item.id);
              }}
            >
              <span className="tile__art">
                <img src={item.assetPath} alt="" draggable={false} />
                {locked && <span className="tile__lock">{lockedByPlanet ? `${tr('planeta', 'planet')} ${item.unlockPercent}%` : `${tr('nivel', 'level')} ${item.unlockLevel}`}</span>}
              </span>
              <span className="tile__name">{item.name}</span>
              <span className="tile__cost">
                <i aria-hidden="true" />
                {item.cost}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
    </>
  );
}
