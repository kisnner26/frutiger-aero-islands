import { useSyncExternalStore } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { sceneBridge } from '../../engine/sceneBridge';
import { phoneBus } from './phoneBus';
import { tr } from '../../i18n';

export function CameraApp({ onClose }: { onClose: () => void }) {
  const scene = useSyncExternalStore(sceneBridge.subscribe, sceneBridge.get);
  return (
    <div className="appscreen">
      <h3>{tr('cámara', 'camera')}</h3>
      {scene ? (
        <>
          <p>{tr('enmarca tu isla, acércate con el zoom y toma fotografías. cada una se muestra antes de guardarse; solo se conserva si tú lo eliges.', 'frame your island, zoom in and take photos. each one is shown before saving; it is only kept if you choose to.')}</p>
          <button
            type="button"
            className="vista-button vista-button--primary"
            onClick={() => {
              phoneBus.setCamera(true);
              onClose();
            }}
          >
            {tr('abrir cámara', 'open camera')}
          </button>
        </>
      ) : (
        <>
          <p>{tr('la cámara fotografía la escena de una isla. ábrela desde dentro de tu isla.', 'the camera photographs the scene of an island. open it from inside your island.')}</p>
          <a className="vista-button vista-button--primary" href={routeHref('isla')} onClick={onClose}>
            {tr('ir a mi isla', 'go to my island')}
          </a>
        </>
      )}
    </div>
  );
}
