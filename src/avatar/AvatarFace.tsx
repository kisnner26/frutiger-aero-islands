import { avatarDataUrl, type AvatarCrop } from './svg';
import { useAvatar } from './store';
import type { AvatarSpec } from './model';

/** imagen del personaje (cabeza o cuerpo entero) a partir de su especificación; por defecto el personaje guardado. */
export function AvatarImg({ spec, crop = 'cabeza', className = '', alt = '' }: { spec?: AvatarSpec; crop?: AvatarCrop; className?: string; alt?: string }) {
  const mine = useAvatar();
  return <img className={`avatar-img ${className}`.trim()} src={avatarDataUrl(spec ?? mine, crop)} alt={alt} draggable={false} />;
}
