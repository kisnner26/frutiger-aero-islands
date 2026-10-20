import { useMemo, useState } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { AvatarImg } from '../../avatar/AvatarFace';
import { CATEGORIES, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, SKIN, randomAvatar, sameAvatar, DEFAULT_AVATAR, type AvatarSpec, type CategoryKey, type ColorKey } from '../../avatar/model';
import { avatarStore, useAvatar } from '../../avatar/store';
import { avatarDataUrl, type AvatarCrop } from '../../avatar/svg';
import { pushAvatar } from '../../persistence/avatar';
import { sfx } from '../../audio/sfx';
import { AeroWindow } from '../../ui/AeroWindow';

type Tab = 'cara' | 'pelo' | 'ropa' | 'extras';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'cara', label: 'cara' },
  { id: 'pelo', label: 'pelo' },
  { id: 'ropa', label: 'ropa' },
  { id: 'extras', label: 'extras' },
];

const PALETTE: Record<ColorKey, readonly string[]> = {
  skin: SKIN,
  hairColor: HAIR_COLORS,
  eyeColor: EYE_COLORS,
  topColor: CLOTH_COLORS,
  bottomColor: CLOTH_COLORS,
  shoesColor: CLOTH_COLORS,
  accessoryColor: CLOTH_COLORS,
};

function Styles({ label, field, crop, draft, onPick }: { label: string; field: CategoryKey; crop: AvatarCrop; draft: AvatarSpec; onPick: (field: CategoryKey, i: number) => void }) {
  return (
    <fieldset className="ae-group">
      <legend>{label}</legend>
      <div className="ae-styles">
        {CATEGORIES[field].map((name, i) => (
          <button key={name} type="button" aria-pressed={draft[field] === i} onClick={() => onPick(field, i)}>
            <img src={avatarDataUrl({ ...draft, [field]: i }, crop)} alt="" loading="lazy" draggable={false} />
            <span>{name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Swatches({ label, field, draft, onPick }: { label: string; field: ColorKey; draft: AvatarSpec; onPick: (field: ColorKey, i: number) => void }) {
  return (
    <fieldset className="ae-group">
      <legend>{label}</legend>
      <div className="ae-swatches" role="group" aria-label={label}>
        {PALETTE[field].map((hex, i) => (
          <button key={hex} type="button" aria-label={`${label} ${i + 1}`} aria-pressed={draft[field] === i} style={{ background: hex }} onClick={() => onPick(field, i)} />
        ))}
      </div>
    </fieldset>
  );
}

/** editor de personaje: cambios en un borrador con vista previa; solo se guardan al confirmar. */
export function AvatarEditor() {
  const saved = useAvatar();
  const [draft, setDraft] = useState<AvatarSpec>(saved);
  const [tab, setTab] = useState<Tab>('cara');
  const [leaving, setLeaving] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const dirty = useMemo(() => !sameAvatar(draft, saved), [draft, saved]);

  const setField = <K extends keyof AvatarSpec>(field: K, value: AvatarSpec[K]) => {
    sfx.click();
    setNote(null);
    setDraft((d) => ({ ...d, [field]: value }));
  };
  const pickStyle = (field: CategoryKey, i: number) => setField(field, i);
  const pickColor = (field: ColorKey, i: number) => setField(field, i);

  const save = async () => {
    avatarStore.set(draft);
    sfx.coin();
    const err = await pushAvatar();
    setNote(err ? { tone: 'error', text: `guardado en este dispositivo; no se pudo guardar en tu cuenta: ${err}` } : { tone: 'ok', text: 'personaje guardado.' });
  };

  const back = () => {
    if (dirty) setLeaving(true);
    else window.location.hash = routeHref('inicio');
  };

  return (
    <AeroWindow className="win-avatar" title="mi personaje" icon={<span className="mini-orb mini-orb--green" />}>
      <div className="ae">
        <section className="ae__preview" aria-label="vista previa">
          <div className="ae__stage">
            <AvatarImg spec={draft} crop="completo" className="ae__figure" alt="vista previa de tu personaje" />
          </div>
          <div className="ae__quick">
            <button type="button" className="vista-button" onClick={() => setDraft(randomAvatar())}>
              al azar
            </button>
            <button type="button" className="vista-button" onClick={() => setDraft(dirty ? saved : DEFAULT_AVATAR)} disabled={!dirty && sameAvatar(draft, DEFAULT_AVATAR)}>
              {dirty ? 'deshacer cambios' : 'personaje inicial'}
            </button>
          </div>
        </section>

        <section className="ae__panel">
          <div className="ae__tabs" role="tablist" aria-label="categorías">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="ae__options" role="tabpanel">
            {tab === 'cara' && (
              <>
                <Styles label="forma de la cara" field="head" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Swatches label="tono de piel" field="skin" draft={draft} onPick={pickColor} />
                <Styles label="ojos" field="eyes" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Swatches label="color de ojos" field="eyeColor" draft={draft} onPick={pickColor} />
                <Styles label="cejas" field="brows" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label="nariz" field="nose" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label="boca" field="mouth" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label="pecas" field="freckles" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label="vello facial" field="beard" crop="cabeza" draft={draft} onPick={pickStyle} />
              </>
            )}
            {tab === 'pelo' && (
              <>
                <Styles label="peinado" field="hair" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Swatches label="color de pelo" field="hairColor" draft={draft} onPick={pickColor} />
              </>
            )}
            {tab === 'ropa' && (
              <>
                <Styles label="parte de arriba" field="top" crop="completo" draft={draft} onPick={pickStyle} />
                <Swatches label="color de arriba" field="topColor" draft={draft} onPick={pickColor} />
                {draft.top === 3 ? (
                  <p className="ae__hint">el vestido cubre la parte de abajo.</p>
                ) : (
                  <>
                    <Styles label="parte de abajo" field="bottom" crop="completo" draft={draft} onPick={pickStyle} />
                    <Swatches label="color de abajo" field="bottomColor" draft={draft} onPick={pickColor} />
                  </>
                )}
                <Styles label="calzado" field="shoes" crop="completo" draft={draft} onPick={pickStyle} />
                <Swatches label="color del calzado" field="shoesColor" draft={draft} onPick={pickColor} />
              </>
            )}
            {tab === 'extras' && (
              <>
                <Styles label="accesorio" field="accessory" crop="cabeza" draft={draft} onPick={pickStyle} />
                {draft.accessory !== 0 && <Swatches label="color del accesorio" field="accessoryColor" draft={draft} onPick={pickColor} />}
                <Styles label="complexión" field="body" crop="completo" draft={draft} onPick={pickStyle} />
              </>
            )}
          </div>
        </section>

        <footer className="ae__footer">
          <p className={`ae__note${note ? ` ae__note--${note.tone}` : ''}`} role="status" aria-live="polite">
            {note ? note.text : dirty ? 'tienes cambios sin guardar.' : 'tu personaje está guardado.'}
          </p>
          {leaving ? (
            <div className="ae__confirm" role="alertdialog" aria-label="descartar cambios">
              <span>¿salir sin guardar?</span>
              <button type="button" className="vista-button" onClick={() => (window.location.hash = routeHref('inicio'))}>
                salir
              </button>
              <button type="button" className="vista-button vista-button--primary" onClick={() => setLeaving(false)}>
                seguir editando
              </button>
            </div>
          ) : (
            <div className="ae__actions">
              <button type="button" className="vista-button" onClick={back}>
                volver
              </button>
              <button type="button" className="vista-button vista-button--primary" disabled={!dirty} onClick={() => void save()}>
                guardar personaje
              </button>
            </div>
          )}
        </footer>
      </div>
    </AeroWindow>
  );
}
