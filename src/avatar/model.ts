/** personaje original de frutiger aero islands: proporciones caricaturescas, cabeza grande y rasgos legibles.
 *  todas las opciones básicas (tonos de piel, rostro, peinados, ropa) son gratuitas y no dependen del cuerpo. */

export const SKIN = ['#fde3cf', '#f6c9a6', '#e9ad82', '#d08c5e', '#b06a3e', '#8a4b2a', '#6a3418', '#4a2410', '#f3d2b8', '#c4885a'] as const;
export const HAIR_COLORS = ['#1a1410', '#3a2414', '#6a3c1c', '#a8642c', '#d8a24c', '#e8d08a', '#b8b8c0', '#c43a2a', '#3a6ad8', '#9a4ad8', '#2aa88a', '#ff7ab8'] as const;
export const EYE_COLORS = ['#3a2414', '#6a4a2a', '#2a6aa8', '#3a8a5a', '#6a6a76', '#7a3aa8'] as const;
export const CLOTH_COLORS = ['#ffffff', '#e84a4a', '#ff9a3a', '#ffd23a', '#7ad04a', '#2aa86a', '#3ac8d8', '#3a8ae8', '#3a4ad8', '#9a5ad8', '#e86ab8', '#2a2a3a'] as const;

export const CATEGORIES = {
  head: ['ovalada', 'redonda', 'cuadrada suave'],
  eyes: ['redondos', 'grandes', 'rasgados', 'soñolientos', 'felices', 'brillantes'],
  brows: ['rectas', 'arqueadas', 'gruesas', 'finas', 'inclinadas'],
  nose: ['punto', 'pequeña', 'redonda', 'botón'],
  mouth: ['sonrisa', 'sonrisa grande', 'neutra', 'pequeña', 'de lado', 'sorpresa'],
  hair: ['sin pelo', 'corto', 'largo liso', 'ondulado', 'rizado', 'coleta', 'moño', 'afro', 'cresta', 'media melena'],
  beard: ['ninguno', 'barba corta', 'bigote', 'perilla', 'barba completa'],
  top: ['camiseta', 'sudadera', 'camisa', 'vestido', 'tirantes', 'chaleco'],
  bottom: ['pantalón', 'shorts', 'falda'],
  shoes: ['tenis', 'sandalias', 'botas', 'descalzo'],
  accessory: ['ninguno', 'gafas redondas', 'gafas cuadradas', 'gorro', 'gorra', 'flor', 'auriculares', 'sombrero de paja'],
  body: ['delgado', 'medio', 'ancho'],
  freckles: ['sin pecas', 'con pecas'],
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
export type ColorKey = 'skin' | 'hairColor' | 'eyeColor' | 'topColor' | 'bottomColor' | 'shoesColor' | 'accessoryColor';

export interface AvatarSpec {
  v: 1;
  skin: number;
  head: number;
  eyes: number;
  eyeColor: number;
  brows: number;
  nose: number;
  mouth: number;
  hair: number;
  hairColor: number;
  beard: number;
  top: number;
  topColor: number;
  bottom: number;
  bottomColor: number;
  shoes: number;
  shoesColor: number;
  accessory: number;
  accessoryColor: number;
  body: number;
  freckles: number;
}

/** límite superior (exclusivo) de cada campo. */
export const LIMITS: Record<Exclude<keyof AvatarSpec, 'v'>, number> = {
  skin: SKIN.length,
  head: CATEGORIES.head.length,
  eyes: CATEGORIES.eyes.length,
  eyeColor: EYE_COLORS.length,
  brows: CATEGORIES.brows.length,
  nose: CATEGORIES.nose.length,
  mouth: CATEGORIES.mouth.length,
  hair: CATEGORIES.hair.length,
  hairColor: HAIR_COLORS.length,
  beard: CATEGORIES.beard.length,
  top: CATEGORIES.top.length,
  topColor: CLOTH_COLORS.length,
  bottom: CATEGORIES.bottom.length,
  bottomColor: CLOTH_COLORS.length,
  shoes: CATEGORIES.shoes.length,
  shoesColor: CLOTH_COLORS.length,
  accessory: CATEGORIES.accessory.length,
  accessoryColor: CLOTH_COLORS.length,
  body: CATEGORIES.body.length,
  freckles: CATEGORIES.freckles.length,
};

export const FIELD_KEYS = Object.keys(LIMITS) as Array<Exclude<keyof AvatarSpec, 'v'>>;

export const DEFAULT_AVATAR: AvatarSpec = {
  v: 1, skin: 2, head: 0, eyes: 0, eyeColor: 1, brows: 1, nose: 1, mouth: 0, hair: 1, hairColor: 2, beard: 0,
  top: 0, topColor: 7, bottom: 0, bottomColor: 11, shoes: 0, shoesColor: 0, accessory: 0, accessoryColor: 3, body: 1, freckles: 0,
};

/** valida un valor desconocido: cada campo entero y dentro de su rango; lo inválido toma el valor por defecto. */
export function normalizeAvatar(raw: unknown): AvatarSpec {
  const out: AvatarSpec = { ...DEFAULT_AVATAR };
  if (!raw || typeof raw !== 'object') return out;
  const src = raw as Record<string, unknown>;
  for (const k of FIELD_KEYS) {
    const n = src[k];
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < LIMITS[k]) out[k] = n;
  }
  return out;
}

/** rostro y ropa al azar; el rasgo físico (piel, cuerpo) se elige entre todas las opciones por igual. */
export function randomAvatar(rand: () => number = Math.random): AvatarSpec {
  const out: AvatarSpec = { ...DEFAULT_AVATAR };
  for (const k of FIELD_KEYS) out[k] = Math.min(LIMITS[k] - 1, Math.floor(rand() * LIMITS[k]));
  if (rand() < 0.6) out.beard = 0;
  if (rand() < 0.5) out.accessory = 0;
  if (rand() < 0.7) out.freckles = 0;
  return out;
}

export function sameAvatar(a: AvatarSpec, b: AvatarSpec): boolean {
  return FIELD_KEYS.every((k) => a[k] === b[k]);
}
