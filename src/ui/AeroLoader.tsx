import { useEffect, useState } from 'react';
import './aero-loader.css';
import { tr } from '../i18n';

type Variant = 'scene' | 'page' | 'inline';

interface Props {
  text: string;
  detail?: string;
  variant?: Variant;
}

/** estado de carga compartido: una señal física del mundo, no texto aislado sobre el fondo. */
export function AeroLoader({ text, detail = tr('sincronizando agua, cielo y recuerdos...', 'syncing water, sky and memories...'), variant = 'page' }: Props) {
  // nunca se queda esperando en silencio: a los 10 s avisa y ofrece reintentar o volver
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (variant === 'inline') return undefined;
    const t = window.setTimeout(() => setSlow(true), 10_000);
    return () => window.clearTimeout(t);
  }, [variant]);
  return (
    <section className={`aero-loader aero-loader--${variant}`} role="status" aria-live="polite" aria-label={text}>
      <div className="aero-loader__orb" aria-hidden="true"><i /><b /><span className="aero-loader__ring aero-loader__ring--one" /><span className="aero-loader__ring aero-loader__ring--two" /></div>
      <div className="aero-loader__copy"><p>{tr('señal aero', 'aero signal')}</p><strong>{text}</strong><small>{detail}</small></div>
      <div className="aero-loader__progress" aria-hidden="true"><i /></div>
      {slow && (
        <div className="aero-loader__slow">
          <span>{tr('está tardando más de lo normal. revisa tu conexión.', 'this is taking longer than usual. check your connection.')}</span>
          <button type="button" className="vista-button vista-button--primary" onClick={() => window.location.reload()}>{tr('reintentar', 'retry')}</button>
          <button type="button" className="landing__text-link" onClick={() => { window.location.hash = '#/'; window.location.reload(); }}>{tr('volver al inicio', 'back to the start')}</button>
        </div>
      )}
    </section>
  );
}
