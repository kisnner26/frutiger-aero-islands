export interface Light {
  /** color del velo en rgb */
  rgb: [number, number, number];
  /** opacidad 0..1; 0 es mediodía sin velo */
  alpha: number;
}

/** puntos clave de la luz a lo largo del día (hora local, 0..24). */
const KEYS: readonly { h: number; light: Light }[] = [
  { h: 0, light: { rgb: [10, 24, 70], alpha: 0.42 } },
  { h: 5, light: { rgb: [20, 40, 100], alpha: 0.36 } },
  { h: 6.5, light: { rgb: [255, 170, 120], alpha: 0.2 } },
  { h: 9, light: { rgb: [255, 240, 200], alpha: 0.05 } },
  { h: 12, light: { rgb: [255, 255, 255], alpha: 0 } },
  { h: 16, light: { rgb: [255, 235, 190], alpha: 0.05 } },
  { h: 18, light: { rgb: [255, 140, 70], alpha: 0.24 } },
  { h: 19.5, light: { rgb: [120, 70, 140], alpha: 0.32 } },
  { h: 21, light: { rgb: [20, 36, 90], alpha: 0.4 } },
  { h: 24, light: { rgb: [10, 24, 70], alpha: 0.42 } },
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** luz del cielo según la hora local, interpolada entre amanecer, mediodía, atardecer y noche. */
export function lightAt(hour: number): Light {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h)));
  return {
    rgb: [mix(a.light.rgb[0], b.light.rgb[0], t), mix(a.light.rgb[1], b.light.rgb[1], t), mix(a.light.rgb[2], b.light.rgb[2], t)].map(Math.round) as [number, number, number],
    alpha: mix(a.light.alpha, b.light.alpha, t),
  };
}
