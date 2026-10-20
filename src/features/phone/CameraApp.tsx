import { useSyncExternalStore } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { sceneBridge } from '../../engine/sceneBridge';
import { phoneBus } from './phoneBus';

export function CameraApp({ onClose }: { onClose: () => void }) {
  const scene = useSyncExternalStore(sceneBridge.subscribe, sceneBridge.get);
  return (
    <div className="appscreen">
      <h3>cámara</h3>
      {scene ? (
        <>
          <p>enmarca tu isla, acércate con el zoom y toma fotografías. cada una se muestra antes de guardarse; solo se conserva si tú lo eliges.</p>
          <button
            type="button"
            className="vista-button vista-button--primary"
            onClick={() => {
              phoneBus.setCamera(true);
              onClose();
            }}
          >
            abrir cámara
          </button>
        </>
      ) : (
        <>
          <p>la cámara fotografía la escena de una isla. ábrela desde dentro de tu isla.</p>
          <a className="vista-button vista-button--primary" href={routeHref('isla')} onClick={onClose}>
            ir a mi isla
          </a>
        </>
      )}
    </div>
  );
}
