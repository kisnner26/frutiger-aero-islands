import { useSyncExternalStore } from 'react';
import { tr } from '../i18n';

const KEY = 'frutiger-aero-islands:cosmeticos';

export interface Palette { id: string; name: string; tint: number }
export interface Title { id: string; name: string }

/** colores del suelo de la isla: tiñen el césped y la arena sin tocar los dibujos. */
export const PALETTES: readonly Palette[] = [
  { id: 'prado', name: tr('prado', 'meadow'), tint: 0xffffff },
  { id: 'coral', name: tr('coral', 'coral'), tint: 0xffd8c9 },
  { id: 'menta', name: tr('menta', 'mint'), tint: 0xcfffe4 },
  { id: 'atardecer', name: tr('atardecer', 'sunset'), tint: 0xffc89a },
  { id: 'cristal', name: tr('cristal', 'crystal'), tint: 0xb9e6ff },
  { id: 'aurora', name: tr('aurora', 'aurora'), tint: 0xdcc2ff },
  { id: 'oro', name: tr('oro aero', 'aero gold'), tint: 0xffe48f },
];

export const TITLES: readonly Title[] = [
  { id: 'recien-llegado', name: tr('recién llegado', 'newcomer') },
  { id: 'marinero', name: tr('marinero de burbujas', 'bubble sailor') },
  { id: 'jardinero', name: tr('jardinero aero', 'aero gardener') },
  { id: 'capitan', name: tr('capitán de la marea', 'tide captain') },
  { id: 'viajero', name: tr('viajero de cristal', 'crystal traveler') },
  { id: 'leyenda', name: tr('leyenda aero', 'aero legend') },
];

interface State { palettes: string[]; titles: string[]; palette: string; title: string }
const blank = (): State => ({ palettes: ['prado'], titles: ['recien-llegado'], palette: 'prado', title: 'recien-llegado' });

function read(): State {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<State> | null;
    const b = blank();
    const list = (a: unknown, base: string[], valid: (id: string) => boolean) => [...new Set([...base, ...(Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string' && valid(x)) : [])])];
    const palettes = list(v?.palettes, b.palettes, (id) => PALETTES.some((p) => p.id === id));
    const titles = list(v?.titles, b.titles, (id) => TITLES.some((t) => t.id === id));
    return {
      palettes,
      titles,
      palette: v?.palette && palettes.includes(v.palette) ? v.palette : b.palette,
      title: v?.title && titles.includes(v.title) ? v.title : b.title,
    };
  } catch {
    return blank();
  }
}

let state = typeof window === 'undefined' ? blank() : read();
let snapshot = state;
const listeners = new Set<() => void>();
function commit(next: State) {
  state = next;
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento: se mantiene mientras la pestaña siga abierta */
  }
  listeners.forEach((l) => l());
}

export const cosmetics = {
  get: () => snapshot,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  grant(kind: 'paleta' | 'titulo', id: string) {
    if (kind === 'paleta' && PALETTES.some((p) => p.id === id) && !state.palettes.includes(id)) commit({ ...state, palettes: [...state.palettes, id] });
    if (kind === 'titulo' && TITLES.some((t) => t.id === id) && !state.titles.includes(id)) commit({ ...state, titles: [...state.titles, id] });
  },
  equipPalette(id: string) {
    if (state.palettes.includes(id)) commit({ ...state, palette: id });
  },
  equipTitle(id: string) {
    if (state.titles.includes(id)) commit({ ...state, title: id });
  },
};

export const useCosmetics = () => useSyncExternalStore(cosmetics.subscribe, cosmetics.get);
export const paletteTint = (id: string) => PALETTES.find((p) => p.id === id)?.tint ?? 0xffffff;
export const titleName = (id: string) => TITLES.find((t) => t.id === id)?.name ?? '';
