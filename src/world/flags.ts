/** banderas dibujadas por código con un acabado frutiger aero (brillo de cristal, pliegues y borde).
 *  cada bandera es una composición de formas sobre un lienzo de 3 × 2 unidades; los escudos complejos se simplifican. */
import { makeCanvas } from '../art/pencil';

type P = [number, number];
export type Layer =
  | { t: 'h' | 'v'; c: string[]; w?: number[] }
  | { t: 'rect'; x: number; y: number; w: number; h: number; c: string }
  | { t: 'circle'; x: number; y: number; r: number; c: string; s?: string; sw?: number }
  | { t: 'star'; x: number; y: number; r: number; c: string; n?: number; rot?: number }
  | { t: 'poly'; pts: P[]; c: string }
  | { t: 'cross'; x: number; y: number; w: number; c: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; c: string }
  | { t: 'g'; x: number; y: number; w: number; h: number; layers: Layer[] };

const RED = '#d62828', WHT = '#ffffff', BLU = '#1d4fb8', DBL = '#0b2a6b', LBL = '#4aa3e0', GRN = '#1e8f3e', DGR = '#0a6a3a', YEL = '#f7c600', ORG = '#ff8a00', BLK = '#161616', MRN = '#8a1c2b';

const H = (c: string[], w?: number[]): Layer => ({ t: 'h', c, w });
const V = (c: string[], w?: number[]): Layer => ({ t: 'v', c, w });
const R = (x: number, y: number, w: number, h: number, c: string): Layer => ({ t: 'rect', x, y, w, h, c });
const C = (x: number, y: number, r: number, c: string, s?: string, sw?: number): Layer => ({ t: 'circle', x, y, r, c, s, sw });
const S = (x: number, y: number, r: number, c: string, n = 5, rot = 0): Layer => ({ t: 'star', x, y, r, c, n, rot });
const T = (c: string, ...pts: P[]): Layer => ({ t: 'poly', pts, c });
const X = (x: number, y: number, w: number, c: string): Layer => ({ t: 'cross', x, y, w, c });
const L = (x1: number, y1: number, x2: number, y2: number, w: number, c: string): Layer => ({ t: 'line', x1, y1, x2, y2, w, c });
const G = (x: number, y: number, w: number, h: number, layers: Layer[]): Layer => ({ t: 'g', x, y, w, h, layers });
const stripes = (n: number, a: string, b: string) => Array.from({ length: n }, (_, i) => (i % 2 ? b : a));
const stars = (cx: number, cy: number, r: number, c: string, pts: P[]) => pts.map(([dx, dy]) => S(cx + dx, cy + dy, r, c));

const UNION: Layer[] = [R(0, 0, 3, 2, BLU), L(0, 0, 3, 2, 0.5, WHT), L(3, 0, 0, 2, 0.5, WHT), L(0, 0, 3, 2, 0.2, RED), L(3, 0, 0, 2, 0.2, RED), X(1.5, 1, 0.8, WHT), X(1.5, 1, 0.46, RED)];
const nordic = (bg: string, cross: string, inner?: string): Layer[] => [R(0, 0, 3, 2, bg), X(1.05, 1, inner ? 0.62 : 0.4, cross), ...(inner ? [X(1.05, 1, 0.3, inner)] : [])];
const emblem = (c = '#c9a227', r = 0.2): Layer => C(1.5, 1, r, c, BLK, 0.03);

export const FLAGS: Record<string, Layer[]> = {
  us: [H(stripes(13, RED, WHT)), R(0, 0, 1.3, 1.08, DBL), ...stars(0.65, 0.54, 0.07, WHT, [[-0.45, -0.35], [-0.15, -0.35], [0.15, -0.35], [0.45, -0.35], [-0.3, -0.12], [0, -0.12], [0.3, -0.12], [-0.45, 0.11], [-0.15, 0.11], [0.15, 0.11], [0.45, 0.11], [-0.3, 0.34], [0, 0.34], [0.3, 0.34]])],
  ca: [V([RED, WHT, RED], [1, 2, 1]), S(1.5, 1.02, 0.5, RED, 11)],
  mx: [V([DGR, WHT, RED]), C(1.5, 1, 0.3, '#8a6a2a', GRN, 0.06)],
  gt: [V([LBL, WHT, LBL]), C(1.5, 1, 0.22, GRN)],
  sv: [H([BLU, WHT, BLU]), C(1.5, 1, 0.2, '#6aa84f', YEL, 0.04)],
  hn: [H([BLU, WHT, BLU]), ...[[0, 0], [-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]].map(([x, y]) => S(1.5 + x, 1 + y, 0.12, BLU))],
  ni: [H([BLU, WHT, BLU]), C(1.5, 1, 0.26, YEL, GRN, 0.05), T(GRN, [1.5, 0.8], [1.68, 1.15], [1.32, 1.15])],
  cr: [H([BLU, WHT, RED, WHT, BLU], [1, 1, 2, 1, 1])],
  pa: [R(0, 0, 3, 2, WHT), R(1.5, 0, 1.5, 1, RED), R(0, 1, 1.5, 1, BLU), S(0.75, 0.5, 0.3, BLU), S(2.25, 1.5, 0.3, RED)],
  cu: [H([BLU, WHT, BLU, WHT, BLU]), T(RED, [0, 0], [1.7, 1], [0, 2]), S(0.55, 1, 0.34, WHT)],
  do: [R(0, 0, 3, 2, WHT), R(0, 0, 1.4, 0.9, BLU), R(1.6, 0, 1.4, 0.9, RED), R(0, 1.1, 1.4, 0.9, RED), R(1.6, 1.1, 1.4, 0.9, BLU), X(1.5, 1, 0.22, WHT)],
  pr: [H([RED, WHT, RED, WHT, RED]), T(BLU, [0, 0], [1.7, 1], [0, 2]), S(0.55, 1, 0.34, WHT)],
  jm: [R(0, 0, 3, 2, GRN), T(BLK, [0, 0], [1.5, 1], [0, 2]), T(BLK, [3, 0], [1.5, 1], [3, 2]), L(0, 0, 3, 2, 0.34, YEL), L(3, 0, 0, 2, 0.34, YEL)],
  ht: [H([BLU, RED]), R(1.05, 0.65, 0.9, 0.7, WHT)],
  co: [H([YEL, BLU, RED], [2, 1, 1])],
  ve: [H([YEL, BLU, RED]), ...[-0.7, -0.5, -0.25, 0, 0.25, 0.5, 0.7].map((x) => S(1.5 + x, 0.95 - 0.12 * Math.cos(x * 2.2), 0.07, WHT))],
  ec: [H([YEL, BLU, RED], [2, 1, 1]), C(1.5, 1, 0.22, '#8a6a2a', BLK, 0.03)],
  pe: [V([RED, WHT, RED]), C(1.5, 1, 0.16, '#8a6a2a')],
  bo: [H([RED, YEL, GRN]), C(1.5, 1, 0.18, '#8a6a2a')],
  br: [R(0, 0, 3, 2, GRN), T(YEL, [1.5, 0.15], [2.75, 1], [1.5, 1.85], [0.25, 1]), C(1.5, 1, 0.6, BLU), L(0.95, 1.12, 2.05, 0.82, 0.12, WHT)],
  py: [H([RED, WHT, BLU]), C(1.5, 1, 0.2, GRN, '#8a6a2a', 0.04)],
  uy: [H(stripes(9, WHT, LBL)), R(0, 0, 1.2, 1.1, WHT), C(0.6, 0.55, 0.28, YEL)],
  ar: [H([LBL, WHT, LBL]), C(1.5, 1, 0.26, YEL, '#b8860b', 0.03)],
  cl: [H([WHT, RED]), R(0, 0, 1, 1, DBL), S(0.5, 0.5, 0.3, WHT)],
  es: [H([RED, YEL, RED], [1, 2, 1]), C(0.95, 1, 0.14, MRN)],
  pt: [V([DGR, RED], [2, 3]), C(1.2, 1, 0.38, YEL, WHT, 0.04), R(1.05, 0.85, 0.3, 0.3, RED)],
  fr: [V([BLU, WHT, RED])],
  it: [V([GRN, WHT, RED])],
  de: [H([BLK, RED, YEL])],
  gb: UNION,
  ie: [V([GRN, WHT, ORG])],
  nl: [H([RED, WHT, BLU])],
  be: [V([BLK, YEL, RED])],
  ch: [R(0, 0, 3, 2, RED), R(1.2, 0.45, 0.6, 1.1, WHT), R(0.95, 0.7, 1.1, 0.6, WHT)],
  at: [H([RED, WHT, RED])],
  se: nordic(BLU, YEL),
  no: nordic(RED, BLU, WHT).slice(0, 1).concat([X(1.05, 1, 0.62, WHT), X(1.05, 1, 0.3, BLU)]),
  fi: nordic(WHT, BLU),
  dk: nordic(RED, WHT),
  pl: [H([WHT, RED])],
  cz: [H([WHT, RED]), T(BLU, [0, 0], [1.5, 1], [0, 2])],
  gr: [H(stripes(9, BLU, WHT)), R(0, 0, 1.1, 1.1, BLU), X(0.55, 0.55, 0.22, WHT)],
  tr: [R(0, 0, 3, 2, RED), C(1.05, 1, 0.5, WHT), C(1.2, 1, 0.4, RED), S(1.7, 1, 0.24, WHT)],
  ua: [H([BLU, YEL])],
  ro: [V([DBL, YEL, RED])],
  ru: [H([WHT, BLU, RED])],
  hu: [H([RED, WHT, DGR])],
  rs: [H([RED, DBL, WHT]), R(0.75, 0.55, 0.5, 0.8, RED)],
  hr: [H([RED, WHT, BLU]), R(1.3, 0.7, 0.4, 0.6, RED), R(1.3, 0.7, 0.2, 0.2, WHT), R(1.7 - 0.2, 0.9, 0.2, 0.2, WHT)],
  bg: [H([WHT, GRN, RED])],
  is: nordic(BLU, WHT).slice(0, 1).concat([X(1.0, 1, 0.62, WHT), X(1.0, 1, 0.3, RED)]),
  ma: [R(0, 0, 3, 2, RED), S(1.5, 1.05, 0.45, DGR)],
  dz: [V([DGR, WHT]), C(1.5, 1, 0.5, RED), C(1.65, 1, 0.4, WHT), S(1.78, 1, 0.22, RED)],
  tn: [R(0, 0, 3, 2, RED), C(1.5, 1, 0.55, WHT), C(1.6, 1, 0.38, RED), S(1.68, 1, 0.2, RED)],
  eg: [H([RED, WHT, BLK]), C(1.5, 1, 0.2, '#c9a227')],
  ng: [V([GRN, WHT, GRN])],
  gh: [H([RED, YEL, GRN]), S(1.5, 1, 0.4, BLK)],
  sn: [V([GRN, YEL, RED]), S(1.5, 1, 0.34, GRN)],
  ci: [V([ORG, WHT, GRN])],
  cm: [V([DGR, RED, YEL]), S(1.5, 1, 0.34, YEL)],
  et: [H([GRN, YEL, RED]), C(1.5, 1, 0.5, BLU), S(1.5, 1, 0.34, YEL)],
  ke: [H([BLK, WHT, RED, WHT, GRN], [3, 0.4, 3, 0.4, 3]), C(1.5, 1, 0.42, RED, BLK, 0.06)],
  tz: [R(0, 0, 3, 2, BLK), T(GRN, [0, 0], [2.45, 0], [0, 1.65]), T(LBL, [3, 2], [0.55, 2], [3, 0.35]), L(0, 2, 3, 0, 0.8, BLK), L(0, 2, 3, 0, 1.0, YEL), L(0, 2, 3, 0, 0.7, BLK)],
  ug: [H([BLK, YEL, RED, BLK, YEL, RED]), C(1.5, 1, 0.38, WHT, BLK, 0.03)],
  za: [H([RED, DBL]), R(1.0, 0.7, 2.0, 0.6, WHT), R(0.9, 0.78, 2.1, 0.44, DGR), T(WHT, [0, 0], [1.55, 1], [0, 2]), T(DGR, [0, 0.12], [1.4, 1], [0, 1.88]), T(YEL, [0, 0.36], [0.95, 1], [0, 1.64]), T(BLK, [0, 0.5], [0.72, 1], [0, 1.5])],
  ao: [H([RED, BLK]), C(1.5, 1, 0.34, YEL), S(1.5, 1, 0.2, YEL)],
  mz: [H([DGR, BLK, YEL], [3, 3, 3]), R(0, 0.65, 3, 0.1, WHT), R(0, 1.25, 3, 0.1, WHT), T(RED, [0, 0], [1.1, 1], [0, 2]), S(0.4, 1, 0.3, YEL)],
  zw: [H([GRN, YEL, RED, BLK, RED, YEL, GRN]), T(WHT, [0, 0], [1.2, 1], [0, 2]), S(0.4, 1, 0.3, RED)],
  cd: [R(0, 0, 3, 2, LBL), L(0, 2, 3, 0, 0.5, YEL), L(0, 2, 3, 0, 0.34, RED), S(0.4, 0.4, 0.3, YEL)],
  ly: [H([RED, BLK, DGR], [1, 2, 1]), C(1.45, 1, 0.3, WHT), C(1.55, 1, 0.24, BLK), S(1.7, 1, 0.14, WHT)],
  sd: [H([RED, WHT, BLK]), T(DGR, [0, 0], [1.1, 1], [0, 2])],
  mg: [R(0, 0, 3, 2, WHT), R(1, 0, 2, 1, RED), R(1, 1, 2, 1, DGR)],
  gq: [H([DGR, WHT, RED]), T(BLU, [0, 0], [1, 1], [0, 2])],
  cn: [R(0, 0, 3, 2, RED), S(0.55, 0.55, 0.38, YEL), ...[[1.15, 0.2], [1.35, 0.45], [1.35, 0.75], [1.15, 1.0]].map(([x, y]) => S(x, y, 0.1, YEL))],
  jp: [R(0, 0, 3, 2, WHT), C(1.5, 1, 0.6, RED)],
  kr: [R(0, 0, 3, 2, WHT), C(1.5, 1, 0.5, RED), C(1.5, 1.2, 0.3, BLU), ...[[0.5, 0.35], [2.5, 0.35], [0.5, 1.65], [2.5, 1.65]].map(([x, y]) => L(x - 0.22, y, x + 0.22, y, 0.1, BLK))],
  in: [H([ORG, WHT, GRN]), C(1.5, 1, 0.25, 'none', DBL, 0.06)],
  pk: [V([WHT, DGR], [1, 3]), C(1.9, 1, 0.5, WHT), C(2.05, 0.95, 0.42, DGR), S(2.2, 0.85, 0.18, WHT)],
  bd: [R(0, 0, 3, 2, DGR), C(1.4, 1, 0.6, RED)],
  id: [H([RED, WHT])],
  ph: [H([BLU, RED]), T(WHT, [0, 0], [1.4, 1], [0, 2]), C(0.5, 1, 0.2, YEL)],
  vn: [R(0, 0, 3, 2, RED), S(1.5, 1.05, 0.62, YEL)],
  th: [H([RED, WHT, DBL, WHT, RED], [1, 1, 2, 1, 1])],
  my: [H(stripes(14, RED, WHT)), R(0, 0, 1.5, 1.0, DBL), C(0.62, 0.5, 0.3, YEL), C(0.72, 0.5, 0.25, DBL), S(1.05, 0.5, 0.2, YEL, 14)],
  sg: [H([RED, WHT]), C(0.65, 0.5, 0.36, WHT), C(0.78, 0.5, 0.3, RED), ...[[0.95, 0.3], [1.1, 0.5], [1.0, 0.72], [0.82, 0.76], [0.88, 0.34]].map(([x, y]) => S(x, y, 0.08, WHT))],
  tw: [R(0, 0, 3, 2, RED), R(0, 0, 1.5, 1, DBL), C(0.75, 0.5, 0.28, WHT)],
  sa: [R(0, 0, 3, 2, DGR), L(0.7, 1.35, 2.3, 1.35, 0.1, WHT), R(0.8, 0.6, 1.4, 0.18, WHT)],
  ae: [H([DGR, WHT, BLK]), R(0, 0, 0.75, 2, RED)],
  il: [R(0, 0, 3, 2, WHT), R(0, 0.2, 3, 0.3, BLU), R(0, 1.5, 3, 0.3, BLU), S(1.5, 1, 0.42, 'none', 6), C(1.5, 1, 0.01, WHT)],
  ir: [H([DGR, WHT, RED]), C(1.5, 1, 0.16, RED)],
  iq: [H([RED, WHT, BLK]), R(1.0, 0.92, 1.0, 0.16, DGR)],
  kz: [R(0, 0, 3, 2, LBL), C(1.5, 0.85, 0.35, YEL), L(0.35, 1.7, 2.65, 1.7, 0.1, YEL)],
  np: [R(0, 0, 3, 2, WHT), T(BLU, [0.25, 0], [2.2, 1.05], [1.1, 1.05], [2.2, 2], [0.25, 2]), T(RED, [0.4, 0.2], [1.85, 0.95], [0.9, 0.95], [1.85, 1.8], [0.4, 1.8]), C(0.8, 0.62, 0.14, WHT), C(0.8, 1.4, 0.16, WHT)],
  lk: [R(0, 0, 3, 2, YEL), R(0.12, 0.12, 0.5, 1.76, DGR), R(0.62, 0.12, 0.5, 1.76, ORG), R(1.25, 0.12, 1.63, 1.76, MRN)],
  mn: [V([RED, BLU, RED]), C(0.5, 0.7, 0.2, YEL)],
  au: [R(0, 0, 3, 2, DBL), G(0, 0, 1.5, 1, UNION), S(0.75, 1.5, 0.3, WHT, 7), S(2.2, 0.45, 0.15, WHT, 7), S(2.5, 0.95, 0.15, WHT, 7), S(2.0, 1.1, 0.15, WHT, 7), S(2.25, 1.6, 0.15, WHT, 7)],
  nz: [R(0, 0, 3, 2, DBL), G(0, 0, 1.5, 1, UNION), S(2.2, 0.5, 0.17, RED), S(2.55, 0.95, 0.17, RED), S(2.0, 1.1, 0.17, RED), S(2.25, 1.6, 0.17, RED)],
  bz: [R(0, 0, 3, 2, DBL), R(0, 0, 3, 0.25, RED), R(0, 1.75, 3, 0.25, RED), C(1.5, 1, 0.65, WHT, DGR, 0.07)],
  tt: [R(0, 0, 3, 2, RED), L(0, 0, 3, 2, 0.75, WHT), L(0, 0, 3, 2, 0.5, BLK)],
  bs: [H([LBL, YEL, LBL]), T(BLK, [0, 0], [1.2, 1], [0, 2])],
  bb: [V([DBL, YEL, DBL]), L(1.5, 0.6, 1.5, 1.5, 0.08, BLK), L(1.3, 0.65, 1.3, 1.1, 0.06, BLK), L(1.7, 0.65, 1.7, 1.1, 0.06, BLK)],
  lt: [H([YEL, DGR, RED])],
  lv: [H([MRN, WHT, MRN], [2, 1, 2])],
  ee: [H([BLU, BLK, WHT])],
  sk: [H([WHT, BLU, RED]), R(0.55, 0.5, 0.7, 1.0, RED), X(0.9, 0.95, 0.12, WHT)],
  si: [H([WHT, BLU, RED]), R(0.45, 0.4, 0.6, 0.8, BLU), T(WHT, [0.75, 0.55], [0.9, 0.9], [0.6, 0.9])],
  lu: [H([RED, WHT, LBL])],
  cy: [R(0, 0, 3, 2, WHT), T(ORG, [0.85, 0.6], [2.15, 0.6], [2.4, 0.95], [1.5, 1.25], [0.7, 0.95]), L(1.0, 1.55, 2.0, 1.55, 0.1, GRN)],
  mt: [V([WHT, RED]), R(0.1, 0.1, 0.2, 0.2, '#b8b8b8')],
  ge: [R(0, 0, 3, 2, WHT), X(1.5, 1, 0.34, RED), ...[[0.75, 0.5], [2.25, 0.5], [0.75, 1.5], [2.25, 1.5]].map(([x, y]) => X(x, y, 0.001, RED)).slice(0, 0), R(0.62, 0.38, 0.26, 0.08, RED), R(0.69, 0.3, 0.12, 0.24, RED), R(2.12, 0.38, 0.26, 0.08, RED), R(2.19, 0.3, 0.12, 0.24, RED), R(0.62, 1.54, 0.26, 0.08, RED), R(0.69, 1.46, 0.12, 0.24, RED), R(2.12, 1.54, 0.26, 0.08, RED), R(2.19, 1.46, 0.12, 0.24, RED)],
  am: [H([RED, DBL, ORG])],
  az: [H([LBL, RED, DGR]), C(1.4, 1, 0.3, WHT), C(1.5, 1, 0.24, RED), S(1.75, 1, 0.13, WHT, 8)],
  uz: [H([LBL, RED, WHT, RED, DGR], [6, 0.4, 5, 0.4, 6]), C(0.5, 0.45, 0.22, WHT)],
  kh: [H([DBL, RED, DBL], [1, 2, 1]), R(1.0, 0.8, 1.0, 0.45, WHT), T(WHT, [1.2, 0.8], [1.5, 0.55], [1.8, 0.8])],
  la: [H([RED, DBL, RED], [1, 2, 1]), C(1.5, 1, 0.42, WHT)],
  mm: [H([YEL, DGR, RED]), S(1.5, 1.05, 0.7, WHT)],
  af: [V([BLK, RED, DGR]), C(1.5, 1, 0.34, WHT, '#8a6a2a', 0.03)],
  jo: [H([BLK, WHT, DGR]), T(RED, [0, 0], [1.4, 1], [0, 2]), S(0.45, 1, 0.2, WHT, 7)],
  lb: [H([RED, WHT, RED], [1, 2, 1]), T(DGR, [1.5, 0.55], [1.75, 1.2], [1.25, 1.2]), R(1.45, 1.2, 0.1, 0.2, '#6a4a2a')],
  kw: [H([DGR, WHT, RED]), T(BLK, [0, 0], [0.9, 0.67], [0.9, 1.33], [0, 2])],
  qa: [R(0, 0, 3, 2, MRN), T(WHT, [0, 0], [0.9, 0], [0.55, 0.22], [0.9, 0.44], [0.55, 0.66], [0.9, 0.88], [0.55, 1.1], [0.9, 1.32], [0.55, 1.54], [0.9, 1.76], [0.7, 2], [0, 2])],
  om: [H([WHT, RED, DGR]), R(0, 0, 0.85, 2, RED), emblem(WHT, 0.2)],
  ye: [H([RED, WHT, BLK])],
  bw: [H([LBL, WHT, BLK, WHT, LBL], [3, 0.35, 1.2, 0.35, 3])],
  na: [R(0, 0, 3, 2, DGR), T(BLU, [0, 0], [2.1, 0], [0, 1.45]), L(0, 2, 3, 0, 0.5, WHT), L(0, 2, 3, 0, 0.3, RED), C(0.5, 0.5, 0.26, YEL)],
  zm: [R(0, 0, 3, 2, DGR), R(1.9, 1.1, 0.35, 0.9, RED), R(2.25, 1.1, 0.35, 0.9, BLK), R(2.6, 1.1, 0.4, 0.9, ORG), C(2.4, 0.5, 0.2, ORG)],
  mw: [H([BLK, RED, DGR]), C(1.5, 0.62, 0.3, RED)],
  ml: [V([DGR, YEL, RED])],
  ne: [H([ORG, WHT, DGR]), C(1.5, 1, 0.25, ORG)],
  td: [V([DBL, YEL, RED])],
  bf: [H([RED, DGR]), S(1.5, 1, 0.5, YEL)],
  gn: [V([RED, YEL, DGR])],
  sl: [H([DGR, WHT, BLU])],
  lr: [H(stripes(11, RED, WHT)), R(0, 0, 0.95, 1.1, DBL), S(0.48, 0.55, 0.3, WHT)],
  so: [R(0, 0, 3, 2, LBL), S(1.5, 1, 0.55, WHT)],
  pg: [R(0, 0, 3, 2, BLK), T(RED, [3, 0], [0, 0], [3, 2]), S(0.7, 1.45, 0.2, WHT), S(2.2, 0.55, 0.2, YEL)],
  fj: [R(0, 0, 3, 2, LBL), G(0, 0, 1.5, 1, UNION), R(1.85, 0.5, 0.8, 1.0, WHT), R(1.95, 0.6, 0.6, 0.3, RED), R(2.05, 1.0, 0.4, 0.3, LBL)],
};

/* ---------- dibujo ---------- */

function drawLayers(ctx: CanvasRenderingContext2D, layers: readonly Layer[]) {
  for (const l of layers) {
    ctx.save();
    switch (l.t) {
      case 'h':
      case 'v': {
        const w = l.w ?? l.c.map(() => 1);
        const total = w.reduce((a, b) => a + b, 0);
        let acc = 0;
        l.c.forEach((col, i) => {
          const part = (w[i] / total) * (l.t === 'h' ? 2 : 3);
          ctx.fillStyle = col;
          if (l.t === 'h') ctx.fillRect(0, acc, 3, part + 0.005);
          else ctx.fillRect(acc, 0, part + 0.005, 2);
          acc += part;
        });
        break;
      }
      case 'rect':
        ctx.fillStyle = l.c;
        ctx.fillRect(l.x, l.y, l.w, l.h);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
        if (l.c !== 'none') {
          ctx.fillStyle = l.c;
          ctx.fill();
        }
        if (l.s) {
          ctx.strokeStyle = l.s;
          ctx.lineWidth = l.sw ?? 0.05;
          ctx.stroke();
        }
        break;
      case 'star': {
        const n = l.n ?? 5;
        const inner = l.r * (n === 5 ? 0.382 : 0.55);
        ctx.beginPath();
        for (let i = 0; i < n * 2; i++) {
          const rad = i % 2 ? inner : l.r;
          const a = (Math.PI * i) / n - Math.PI / 2 + ((l.rot ?? 0) * Math.PI) / 180;
          const x = l.x + Math.cos(a) * rad;
          const y = l.y + Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (l.c === 'none') {
          ctx.strokeStyle = BLU;
          ctx.lineWidth = 0.07;
          ctx.stroke();
        } else {
          ctx.fillStyle = l.c;
          ctx.fill();
        }
        break;
      }
      case 'poly':
        ctx.beginPath();
        l.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = l.c;
        ctx.fill();
        break;
      case 'cross':
        ctx.fillStyle = l.c;
        ctx.fillRect(l.x - l.w / 2, 0, l.w, 2);
        ctx.fillRect(0, l.y - l.w / 2, 3, l.w);
        break;
      case 'line':
        ctx.strokeStyle = l.c;
        ctx.lineWidth = l.w;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        break;
      case 'g':
        ctx.beginPath();
        ctx.rect(l.x, l.y, l.w, l.h);
        ctx.clip();
        ctx.translate(l.x, l.y);
        ctx.scale(l.w / 3, l.h / 2);
        drawLayers(ctx, l.layers);
        break;
    }
    ctx.restore();
  }
}

/** pliegues de tela, brillo de cristal superior y borde luminoso. */
function aeroFinish(ctx: CanvasRenderingContext2D, w: number, h: number, folds: number) {
  const fold = ctx.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= folds * 2; i++) fold.addColorStop(i / (folds * 2), i % 2 ? 'rgba(255,255,255,.2)' : 'rgba(0,30,80,.2)');
  ctx.fillStyle = fold;
  ctx.fillRect(0, 0, w, h);
  const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  gloss.addColorStop(0, 'rgba(255,255,255,.78)');
  gloss.addColorStop(1, 'rgba(255,255,255,.04)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.34);
  ctx.quadraticCurveTo(w * 0.5, h * 0.62, 0, h * 0.34);
  ctx.closePath();
  ctx.fill();
  const shade = ctx.createLinearGradient(0, h * 0.7, 0, h);
  shade.addColorStop(0, 'rgba(0,30,80,0)');
  shade.addColorStop(1, 'rgba(0,30,80,.3)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
}

const cache = new Map<string, HTMLCanvasElement>();

/** insignia de bandera: esquinas redondeadas, brillo y borde de cristal. */
export function flagBadge(code: string, width = 96): HTMLCanvasElement {
  const key = `b${code}|${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = width;
  const h = Math.round((w * 2) / 3);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const rad = h * 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, rad);
  ctx.clip();
  ctx.save();
  ctx.scale(w / 3, h / 2);
  drawLayers(ctx, FLAGS[code] ?? [R(0, 0, 3, 2, '#9fb4c8')]);
  ctx.restore();
  aeroFinish(ctx, w, h, 2);
  ctx.restore();
  ctx.lineWidth = Math.max(1.5, w / 40);
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, w - 3, h - 3, rad);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(10,50,100,.55)';
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, w - 1, h - 1, rad);
  ctx.stroke();
  cache.set(key, c);
  return c;
}

/** paño de bandera para asta (sin esquinas redondeadas). */
export function flagCloth(code: string, width = 192): HTMLCanvasElement {
  const key = `c${code}|${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = width;
  const h = Math.round((w * 2) / 3);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.scale(w / 3, h / 2);
  drawLayers(ctx, FLAGS[code] ?? [R(0, 0, 3, 2, '#9fb4c8')]);
  ctx.restore();
  aeroFinish(ctx, w, h, 3);
  ctx.strokeStyle = 'rgba(10,40,90,.7)';
  ctx.lineWidth = Math.max(1.5, w / 60);
  ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);
  cache.set(key, c);
  return c;
}

const urls = new Map<string, string>();
export function flagDataUrl(code: string, width = 72): string {
  const key = `${code}|${width}`;
  let u = urls.get(key);
  if (!u) {
    u = flagBadge(code, width).toDataURL();
    urls.set(key, u);
  }
  return u;
}
