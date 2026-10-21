import { tr } from '../i18n';
export interface AeroForecast {
  label: string;
  detail: string;
  tone: 'sun' | 'cloud' | 'wave' | 'rainbow';
}

const signals: readonly AeroForecast[] = [
  { label: tr('brisa de burbujas', 'bubble breeze'), detail: tr('corriente suave para visitas', 'gentle current for visits'), tone: 'sun' },
  { label: tr('marea luminosa', 'glowing tide'), detail: tr('ideal para navegar rutas', 'ideal for sailing routes'), tone: 'wave' },
  { label: tr('nubes de cristal', 'glass clouds'), detail: tr('el cielo guarda destellos', 'the sky holds sparkles'), tone: 'cloud' },
  { label: tr('arco de agua', 'water arc'), detail: tr('señal favorable en el archipiélago', 'favorable signal across the archipelago'), tone: 'rainbow' },
];

/** pronóstico estético diario, determinista y sin afirmar clima real. */
export function aeroForecast(country: string | null): AeroForecast {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${country ?? 'mar'}:${day}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return signals[hash % signals.length];
}
