import { useEffect, useState } from 'react';
import { CATALOG_MAP } from '../../catalog/catalog';
import type { PlacedObject } from '../../domain/island';
import { tr } from '../../i18n';

interface FieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
}

/** confirma al salir del campo o con enter, para no crear un comando por tecla. */
function NumberField({ label, value, min, max, step, onCommit }: FieldProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (text.trim() === '' || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    if (n !== value) onCommit(n);
    else setText(String(value));
  };
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
    </label>
  );
}

interface Props {
  objects: readonly PlacedObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>>) => void;
}

export function ObjectInspector({ objects, selectedId, onSelect, onPatch }: Props) {
  const selected = objects.find((o) => o.id === selectedId);
  const item = selected ? CATALOG_MAP.get(selected.assetId) : undefined;
  return (
    <div className="inspector">
      <h2 className="inspector__title">{tr('objetos de la isla', 'island objects')}</h2>
      {objects.length === 0 ? (
        <p className="inspector__empty">{tr('la isla está vacía: elige una decoración para colocarla.', 'the island is empty: pick a decoration to place it.')}</p>
      ) : (
        <ul className="inspector__list" aria-label={tr('objetos colocados', 'placed objects')}>
          {objects.map((o, i) => (
            <li key={o.id}>
              <button type="button" aria-pressed={o.id === selectedId} onClick={() => onSelect(o.id === selectedId ? null : o.id)}>
                {i + 1}. {CATALOG_MAP.get(o.assetId)?.name ?? o.assetId}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && item ? (
        <form className="inspector__form" onSubmit={(e) => e.preventDefault()} aria-label={`${tr('propiedades de', 'properties of')} ${item.name}`}>
          <NumberField label={tr('posición x', 'position x')} value={selected.x} min={0} max={1000} step={1} onCommit={(v) => onPatch(selected.id, { x: Math.round(v) })} />
          <NumberField label={tr('posición y', 'position y')} value={selected.y} min={0} max={1000} step={1} onCommit={(v) => onPatch(selected.id, { y: Math.round(v) })} />
          <NumberField label={tr('escala', 'scale')} value={selected.scale} min={item.minScale} max={item.maxScale} step={0.1} onCommit={(v) => onPatch(selected.id, { scale: Math.round(v * 100) / 100 })} />
          <label className="field">
            <span>{tr('orientación', 'orientation')}</span>
            <select value={selected.rotation} onChange={(e) => onPatch(selected.id, { rotation: Number(e.target.value) })}>
              {item.orientations.map((o) => (
                <option key={o} value={o}>
                  {o === 0 ? tr('normal', 'normal') : tr('espejo', 'mirrored')}
                </option>
              ))}
            </select>
          </label>
        </form>
      ) : (
        objects.length > 0 && <p className="inspector__empty">{tr('elige un objeto para editar su posición, escala y orientación.', 'pick an object to edit its position, scale and orientation.')}</p>
      )}
    </div>
  );
}
