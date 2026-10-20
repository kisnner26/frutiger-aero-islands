import { useEffect, useState } from 'react';
import { CATALOG_MAP } from '../../catalog/catalog';
import type { PlacedObject } from '../../domain/island';

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
      <h2 className="inspector__title">objetos de la isla</h2>
      {objects.length === 0 ? (
        <p className="inspector__empty">la isla está vacía: elige una decoración para colocarla.</p>
      ) : (
        <ul className="inspector__list" aria-label="objetos colocados">
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
        <form className="inspector__form" onSubmit={(e) => e.preventDefault()} aria-label={`propiedades de ${item.name}`}>
          <NumberField label="posición x" value={selected.x} min={0} max={1000} step={1} onCommit={(v) => onPatch(selected.id, { x: Math.round(v) })} />
          <NumberField label="posición y" value={selected.y} min={0} max={1000} step={1} onCommit={(v) => onPatch(selected.id, { y: Math.round(v) })} />
          <NumberField label="escala" value={selected.scale} min={item.minScale} max={item.maxScale} step={0.1} onCommit={(v) => onPatch(selected.id, { scale: Math.round(v * 100) / 100 })} />
          <label className="field">
            <span>orientación</span>
            <select value={selected.rotation} onChange={(e) => onPatch(selected.id, { rotation: Number(e.target.value) })}>
              {item.orientations.map((o) => (
                <option key={o} value={o}>
                  {o === 0 ? 'normal' : 'espejo'}
                </option>
              ))}
            </select>
          </label>
        </form>
      ) : (
        objects.length > 0 && <p className="inspector__empty">elige un objeto para editar su posición, escala y orientación.</p>
      )}
    </div>
  );
}
