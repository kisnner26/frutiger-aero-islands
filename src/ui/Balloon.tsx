import { tr } from '../i18n';
interface Props {
  tone: 'info' | 'error';
  text: string;
  title?: string;
}

/** globo de notificación junto a la bandeja, como en windows vista. */
export function Balloon({ tone, text, title }: Props) {
  return (
    <div className={`balloon balloon--${tone}`} role="status">
      <span className="balloon__icon" aria-hidden="true">
        {tone === 'error' ? '×' : 'i'}
      </span>
      <div className="balloon__text">
        <strong>{title ?? (tone === 'error' ? tr('aviso', 'notice') : 'frutiger aero islands')}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}
