import { useEffect, useState, useSyncExternalStore } from 'react';
import { sfx } from '../../audio/sfx';
import { sceneBridge } from '../../engine/sceneBridge';
import { MemoryLimitError, addMemory } from '../../memories/store';
import { phoneBus } from '../phone/phoneBus';
import { tr } from '../../i18n';

interface Shot {
  blob: Blob;
  width: number;
  height: number;
  url: string;
}

/** modo cámara: oculta la interfaz, encuadra con zoom y fotografía la escena real. nada se guarda sin que la persona lo elija. */
export function CameraOverlay() {
  const on = useSyncExternalStore(phoneBus.subscribe, phoneBus.cameraMode);
  const scene = useSyncExternalStore(sceneBridge.subscribe, sceneBridge.get);
  const [zoom, setZoom] = useState(1);
  const [controls, setControls] = useState(true);
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!on || !scene) return;
    setZoom(scene.getZoom());
    const t = window.setInterval(() => setZoom(scene.getZoom()), 200);
    return () => window.clearInterval(t);
  }, [on, scene]);

  useEffect(() => {
    if (!on) {
      setShot(null);
      setNote(null);
      setControls(true);
    }
  }, [on]);

  const discard = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  };

  useEffect(() => {
    if (!on) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shot) discard();
      else phoneBus.setCamera(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  if (!on) return null;

  const take = async () => {
    if (!scene || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await scene.capture();
      if (!r) throw new Error('sin imagen');
      sfx.photo();
      setFlash(true);
      window.setTimeout(() => setFlash(false), 260);
      setShot({ ...r, url: URL.createObjectURL(r.blob) });
    } catch {
      setNote({ tone: 'error', text: tr('no se pudo tomar la fotografía. inténtalo de nuevo.', 'the photo could not be taken. try again.') });
    } finally {
      setBusy(false);
    }
  };

  const keep = async () => {
    if (!shot || busy) return;
    setBusy(true);
    try {
      await addMemory({ kind: 'foto', text: tr('fotografía de tu isla', 'photo of your island'), photo: shot.blob, width: shot.width, height: shot.height });
      URL.revokeObjectURL(shot.url);
      setShot(null);
      setNote({ tone: 'ok', text: tr('guardada en el álbum, solo en este dispositivo.', 'saved to the album, only on this device.') });
    } catch (e) {
      setNote({ tone: 'error', text: e instanceof MemoryLimitError ? e.message : tr('no se pudo guardar en este navegador.', 'could not save in this browser.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="camera" role="region" aria-label={tr('cámara', 'camera')}>
      <div className="camera__frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      {flash && <div className="camera__flash" aria-hidden="true" />}

      {controls ? (
        <div className="camera__bar">
          <label className="camera__zoom">
            <span>{tr('acercar', 'zoom')}</span>
            <input type="range" min={0.5} max={2.5} step={0.05} value={zoom} onChange={(e) => scene?.setZoom(Number(e.target.value))} />
          </label>
          <div className="camera__row">
            <button type="button" className="camera__link" onClick={() => setControls(false)}>
              {tr('ocultar controles', 'hide controls')}
            </button>
            <button type="button" className="camera__shutter" aria-label={tr('tomar fotografía', 'take photo')} disabled={busy || !scene} onClick={() => void take()}>
              <span />
            </button>
            <button type="button" className="camera__link" onClick={() => phoneBus.setCamera(false)}>
              {tr('salir', 'exit')}
            </button>
          </div>
          <p className="camera__hint">{tr('arrastra para encuadrar. las fotos no se guardan hasta que tú lo decidas.', 'drag to frame the shot. photos are not saved until you decide.')}</p>
        </div>
      ) : (
        <button type="button" className="camera__show" onClick={() => setControls(true)}>
          {tr('mostrar controles', 'show controls')}
        </button>
      )}

      {note && (
        <p className={`camera__note camera__note--${note.tone}`} role="status">
          {note.text}
        </p>
      )}

      {shot && (
        <div className="camera__preview" role="dialog" aria-label={tr('fotografía tomada', 'photo taken')}>
          <img src={shot.url} alt={tr('vista previa de la fotografía de tu isla', 'preview of the photo of your island')} />
          <div className="camera__actions">
            <button type="button" className="vista-button vista-button--primary" disabled={busy} onClick={() => void keep()}>
              {tr('conservar en el álbum', 'keep in the album')}
            </button>
            <button type="button" className="vista-button" onClick={discard}>
              {tr('descartar', 'discard')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
