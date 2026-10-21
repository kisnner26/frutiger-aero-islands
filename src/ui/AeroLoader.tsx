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
  return (
    <section className={`aero-loader aero-loader--${variant}`} role="status" aria-live="polite" aria-label={text}>
      <div className="aero-loader__orb" aria-hidden="true"><i /><b /><span className="aero-loader__ring aero-loader__ring--one" /><span className="aero-loader__ring aero-loader__ring--two" /></div>
      <div className="aero-loader__copy"><p>señal aero</p><strong>{text}</strong><small>{detail}</small></div>
      <div className="aero-loader__progress" aria-hidden="true"><i /></div>
    </section>
  );
}
