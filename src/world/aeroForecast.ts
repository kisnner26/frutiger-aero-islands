export interface AeroForecast {
  label: string;
  detail: string;
  tone: 'sun' | 'cloud' | 'wave' | 'rainbow';
}

const signals: readonly AeroForecast[] = [
  { label: 'brisa de burbujas', detail: 'corriente suave para visitas', tone: 'sun' },
  { label: 'marea luminosa', detail: 'ideal para navegar rutas', tone: 'wave' },
  { label: 'nubes de cristal', detail: 'el cielo guarda destellos', tone: 'cloud' },
  { label: 'arco de agua', detail: 'señal favorable en el archipiélago', tone: 'rainbow' },
];

/** pronóstico estético diario, determinista y sin afirmar clima real. */
export function aeroForecast(country: string | null): AeroForecast {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${country ?? 'mar'}:${day}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return signals[hash % signals.length];
}
