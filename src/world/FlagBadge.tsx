import { findCountry } from './countries';
import { flagDataUrl } from './flags';

/** bandera frutiger aero de un país; no muestra nada si no hay país elegido. */
export function FlagBadge({ code, width = 36, title = true }: { code: string | null | undefined; width?: number; title?: boolean }) {
  const c = findCountry(code);
  if (!c) return null;
  return <img className="flag-badge" src={flagDataUrl(c.code, width * 2)} width={width} height={Math.round((width * 2) / 3)} alt={title ? `bandera de ${c.name}` : ''} draggable={false} />;
}
