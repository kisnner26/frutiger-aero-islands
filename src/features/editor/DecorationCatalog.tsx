import { CATALOG } from '../../catalog/catalog';

interface Props {
  placing: string | null;
  level: number;
  brillos: number;
  onChoose: (id: string | null) => void;
}

/** fichas al estilo del menú de la wii u: cuadrados brillantes con etiqueta. */
export function DecorationCatalog({ placing, level, brillos, onChoose }: Props) {
  return (
    <ul className="tiles" aria-label="decoraciones">
      {CATALOG.map((item) => {
        const locked = item.unlockLevel > level;
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
                {locked && <span className="tile__lock">nivel {item.unlockLevel}</span>}
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
  );
}
