import { useMemo, useState } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { AvatarImg } from '../../avatar/AvatarFace';
import { CATEGORIES, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, SKIN, randomAvatar, sameAvatar, DEFAULT_AVATAR, type AvatarSpec, type CategoryKey, type ColorKey } from '../../avatar/model';
import { avatarStore, useAvatar } from '../../avatar/store';
import { avatarDataUrl, type AvatarCrop } from '../../avatar/svg';
import { pushAvatar } from '../../persistence/avatar';
import { sfx } from '../../audio/sfx';
import { AeroWindow } from '../../ui/AeroWindow';
import { tr } from '../../i18n';

type Tab = 'cara' | 'pelo' | 'ropa' | 'extras';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'cara', label: tr('cara', 'face') },
  { id: 'pelo', label: tr('pelo', 'hair') },
  { id: 'ropa', label: tr('ropa', 'clothes') },
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
    setNote(err ? { tone: 'error', text: `${tr('guardado en este dispositivo; no se pudo guardar en tu cuenta', 'saved on this device; could not save to your account')}: ${err}` } : { tone: 'ok', text: tr('personaje guardado.', 'character saved.') });
  };

  const back = () => {
    if (dirty) setLeaving(true);
    else window.location.hash = routeHref('inicio');
  };

  return (
    <AeroWindow className="win-avatar" title={tr('mi personaje', 'my character')} icon={<span className="mini-orb mini-orb--green" />}>
      <div className="ae">
        <section className="ae__preview" aria-label={tr('vista previa', 'preview')}>
          <div className="ae__stage">
            <AvatarImg spec={draft} crop="completo" className="ae__figure" alt={tr('vista previa de tu personaje', 'preview of your character')} />
          </div>
          <div className="ae__quick">
            <button type="button" className="vista-button" onClick={() => setDraft(randomAvatar())}>
              {tr('al azar', 'randomize')}
            </button>
            <button type="button" className="vista-button" onClick={() => setDraft(dirty ? saved : DEFAULT_AVATAR)} disabled={!dirty && sameAvatar(draft, DEFAULT_AVATAR)}>
              {dirty ? tr('deshacer cambios', 'undo changes') : tr('personaje inicial', 'default character')}
            </button>
          </div>
        </section>

        <section className="ae__panel">
          <div className="ae__tabs" role="tablist" aria-label={tr('categorías', 'categories')}>
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="ae__options" role="tabpanel">
            {tab === 'cara' && (
              <>
                <Styles label={tr('forma de la cara', 'face shape')} field="head" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Swatches label={tr('tono de piel', 'skin tone')} field="skin" draft={draft} onPick={pickColor} />
                <Styles label={tr('ojos', 'eyes')} field="eyes" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Swatches label={tr('color de ojos', 'eye color')} field="eyeColor" draft={draft} onPick={pickColor} />
                <Styles label={tr('cejas', 'eyebrows')} field="brows" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label={tr('nariz', 'nose')} field="nose" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label={tr('boca', 'mouth')} field="mouth" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label={tr('pecas', 'freckles')} field="freckles" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Styles label={tr('vello facial', 'facial hair')} field="beard" crop="cabeza" draft={draft} onPick={pickStyle} />
              </>
            )}
            {tab === 'pelo' && (
              <>
                <Styles label={tr('peinado', 'hairstyle')} field="hair" crop="cabeza" draft={draft} onPick={pickStyle} />
                <Swatches label={tr('color de pelo', 'hair color')} field="hairColor" draft={draft} onPick={pickColor} />
              </>
            )}
            {tab === 'ropa' && (
              <>
                <Styles label={tr('parte de arriba', 'top')} field="top" crop="completo" draft={draft} onPick={pickStyle} />
                <Swatches label={tr('color de arriba', 'top color')} field="topColor" draft={draft} onPick={pickColor} />
                {draft.top === 3 ? (
                  <p className="ae__hint">{tr('el vestido cubre la parte de abajo.', 'the dress covers the bottom.')}</p>
                ) : (
                  <>
                    <Styles label={tr('parte de abajo', 'bottom')} field="bottom" crop="completo" draft={draft} onPick={pickStyle} />
                    <Swatches label={tr('color de abajo', 'bottom color')} field="bottomColor" draft={draft} onPick={pickColor} />
                  </>
                )}
                <Styles label={tr('calzado', 'footwear')} field="shoes" crop="completo" draft={draft} onPick={pickStyle} />
                <Swatches label={tr('color del calzado', 'footwear color')} field="shoesColor" draft={draft} onPick={pickColor} />
              </>
            )}
            {tab === 'extras' && (
              <>
                <Styles label={tr('accesorio', 'accessory')} field="accessory" crop="cabeza" draft={draft} onPick={pickStyle} />
                {draft.accessory !== 0 && <Swatches label={tr('color del accesorio', 'accessory color')} field="accessoryColor" draft={draft} onPick={pickColor} />}
                <Styles label={tr('complexión', 'build')} field="body" crop="completo" draft={draft} onPick={pickStyle} />
              </>
            )}
          </div>
        </section>

        <footer className="ae__footer">
          <p className={`ae__note${note ? ` ae__note--${note.tone}` : ''}`} role="status" aria-live="polite">
            {note ? note.text : dirty ? tr('tienes cambios sin guardar.', 'you have unsaved changes.') : tr('tu personaje está guardado.', 'your character is saved.')}
          </p>
          {leaving ? (
            <div className="ae__confirm" role="alertdialog" aria-label={tr('descartar cambios', 'discard changes')}>
              <span>{tr('¿salir sin guardar?', 'leave without saving?')}</span>
              <button type="button" className="vista-button" onClick={() => (window.location.hash = routeHref('inicio'))}>
                {tr('salir', 'leave')}
              </button>
              <button type="button" className="vista-button vista-button--primary" onClick={() => setLeaving(false)}>
                {tr('seguir editando', 'keep editing')}
              </button>
            </div>
          ) : (
            <div className="ae__actions">
              <button type="button" className="vista-button" onClick={back}>
                {tr('volver', 'back')}
              </button>
              <button type="button" className="vista-button vista-button--primary" disabled={!dirty} onClick={() => void save()}>
                {tr('guardar personaje', 'save character')}
              </button>
            </div>
          )}
        </footer>
      </div>
    </AeroWindow>
  );
}
