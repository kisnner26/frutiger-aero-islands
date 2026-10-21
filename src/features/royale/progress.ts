/**
 * progreso de las batallas: rango aero (nivel y experiencia), medallas, misiones del día y marcas personales.
 * todo vive en este dispositivo; los soles se cobran con el mismo sistema que los minijuegos.
 */
import { awardSoles } from '../../persistence/soles';
import { tr } from '../../i18n';

const KEY = 'frutiger-aero-islands:progreso-batallas';

export type Mode = 'royale' | 'blob' | 'paintball';

/** lo que cada partida aporta al progreso. */
export interface MatchSummary {
  mode: Mode;
  placement: number;
  players: number;
  kills: number;
  bestCombo: number;
  powers: number;
  seconds: number;
  /** blob: masa final y células comidas. */
  mass: number;
  ate: number;
  lowHpWin: boolean;
}

export interface MissionState { id: string; progress: number; done: boolean }
export interface Progress {
  xp: number;
  matches: number;
  wins: number;
  top3: number;
  kills: number;
  bestCombo: number;
  bestMass: number;
  streak: number;
  medals: string[];
  day: string;
  missions: MissionState[];
}

/** rangos: cada uno exige más experiencia que el anterior. */
const RANKS: Array<[string, string]> = [
  ['gota', 'droplet'], ['burbuja', 'bubble'], ['pecera', 'fishbowl'], ['cristal', 'crystal'], ['brisa', 'breeze'],
  ['aurora', 'aurora'], ['zafiro', 'sapphire'], ['nácar', 'pearl'], ['cielo', 'skybound'], ['leyenda aero', 'aero legend'],
];
export const xpForLevel = (level: number) => 60 * level * (level + 1);
export function levelOf(xp: number): { level: number; into: number; need: number; name: string } {
  let level = 0;
  while (xp >= xpForLevel(level + 1) && level < 60) level++;
  const base = level === 0 ? 0 : xpForLevel(level);
  const need = xpForLevel(level + 1) - base;
  const [es, en] = RANKS[Math.min(RANKS.length - 1, Math.floor(level / 2))];
  return { level, into: xp - base, need, name: tr(es, en) };
}

export interface Medal { id: string; name: string; desc: string; reward: number; test: (s: MatchSummary, p: Progress) => boolean }
export const MEDALS: Medal[] = [
  { id: 'first-win', name: tr('primera victoria', 'first victory'), desc: tr('gana una partida', 'win a match'), reward: 60, test: (s) => s.placement === 1 },
  { id: 'combo-10', name: tr('racha de cristal', 'crystal streak'), desc: tr('encadena 10 golpes seguidos', 'chain 10 hits in a row'), reward: 50, test: (s) => s.bestCombo >= 10 },
  { id: 'combo-16', name: tr('frenesí total', 'total frenzy'), desc: tr('llega a 16 golpes seguidos', 'reach 16 hits in a row'), reward: 90, test: (s) => s.bestCombo >= 16 },
  { id: 'hunter', name: tr('cazador de burbujas', 'bubble hunter'), desc: tr('revienta a 5 rivales en una partida', 'pop 5 rivals in one match'), reward: 70, test: (s) => s.mode === 'royale' && s.kills >= 5 },
  { id: 'last-breath', name: tr('último aliento', 'last breath'), desc: tr('gana con casi nada de vida', 'win with almost no health'), reward: 80, test: (s) => s.lowHpWin },
  { id: 'three-crowns', name: tr('tres coronas', 'three crowns'), desc: tr('suma 3 victorias', 'collect 3 victories'), reward: 120, test: (_s, p) => p.wins >= 3 },
  { id: 'giant', name: tr('gigante de cristal', 'crystal giant'), desc: tr('llega a 1500 de masa en aero blob', 'reach 1500 mass in aero blob'), reward: 80, test: (s) => s.mode === 'blob' && s.mass >= 1500 },
  { id: 'devourer', name: tr('devorador', 'devourer'), desc: tr('come a 6 células en aero blob', 'eat 6 cells in aero blob'), reward: 70, test: (s) => s.mode === 'blob' && s.ate >= 6 },
  { id: 'regular', name: tr('habitual de la arena', 'arena regular'), desc: tr('juega 10 partidas', 'play 10 matches'), reward: 60, test: (_s, p) => p.matches >= 10 },
];

interface MissionDef { id: string; text: [string, string]; goal: number; metric: (s: MatchSummary) => number; how: 'sum' | 'max'; reward: number }
const MISSION_POOL: MissionDef[] = [
  { id: 'm-play', text: ['juega 3 partidas', 'play 3 matches'], goal: 3, metric: () => 1, how: 'sum', reward: 40 },
  { id: 'm-pops', text: ['revienta a 6 rivales', 'pop 6 rivals'], goal: 6, metric: (s) => s.kills, how: 'sum', reward: 50 },
  { id: 'm-top3', text: ['termina entre los 3 primeros', 'finish in the top 3'], goal: 1, metric: (s) => (s.placement <= 3 ? 1 : 0), how: 'sum', reward: 60 },
  { id: 'm-win', text: ['gana una partida', 'win a match'], goal: 1, metric: (s) => (s.placement === 1 ? 1 : 0), how: 'sum', reward: 90 },
  { id: 'm-combo', text: ['encadena un combo de 6', 'chain a combo of 6'], goal: 6, metric: (s) => s.bestCombo, how: 'max', reward: 50 },
  { id: 'm-power', text: ['recoge 4 objetos o poderes', 'collect 4 pickups or powers'], goal: 4, metric: (s) => s.powers, how: 'sum', reward: 40 },
  { id: 'm-mass', text: ['llega a 600 de masa en blob', 'reach 600 mass in blob'], goal: 600, metric: (s) => (s.mode === 'blob' ? s.mass : 0), how: 'max', reward: 60 },
  { id: 'm-ate', text: ['come a 3 células en blob', 'eat 3 cells in blob'], goal: 3, metric: (s) => (s.mode === 'blob' ? s.ate : 0), how: 'sum', reward: 50 },
];
export const missionDef = (id: string) => MISSION_POOL.find((m) => m.id === id)!;

const today = () => new Date().toISOString().slice(0, 10);

/** tres misiones distintas por día, elegidas de forma estable a partir de la fecha. */
export function dailyMissions(day: string): MissionState[] {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = [...MISSION_POOL];
  const out: MissionState[] = [];
  for (let i = 0; i < 3; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const pick = pool.splice(h % pool.length, 1)[0];
    out.push({ id: pick.id, progress: 0, done: false });
  }
  return out;
}

const blank = (): Progress => ({ xp: 0, matches: 0, wins: 0, top3: 0, kills: 0, bestCombo: 0, bestMass: 0, streak: 0, medals: [], day: today(), missions: dailyMissions(today()) });

export function loadProgress(): Progress {
  try {
    const p = { ...blank(), ...(JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<Progress>) };
    if (p.day !== today()) {
      p.day = today();
      p.missions = dailyMissions(p.day);
    }
    return p;
  } catch {
    return blank();
  }
}
function save(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: el progreso de esta partida no se guarda */
  }
}

export interface Outcome {
  summary: MatchSummary;
  progress: Progress;
  xpGained: number;
  before: { level: number; into: number; need: number; name: string };
  after: { level: number; into: number; need: number; name: string };
  leveledUp: boolean;
  newMedals: Medal[];
  missionsDone: Array<{ id: string; text: string; reward: number }>;
  lines: Array<{ label: string; soles: number }>;
  soles: number;
  won: boolean;
}

/** soles por puesto (con el tope diario de los juegos) y por bajas. */
export const baseSoles = (placement: number, kills: number) => (placement === 1 ? 160 : placement <= 3 ? 70 : placement <= 6 ? 35 : 15) + kills * 8;
export const xpFor = (s: MatchSummary) =>
  20 + Math.max(0, s.players + 1 - s.placement) * 6 + s.kills * 12 + (s.placement === 1 ? 120 : 0) + s.bestCombo * 4 + Math.round(s.mass / 40) + s.ate * 8;

/** registra una partida y devuelve todo lo que hay que mostrar: experiencia, nivel, medallas, misiones y soles. */
export function recordMatch(s: MatchSummary): Outcome {
  const p = loadProgress();
  const before = levelOf(p.xp);
  const lines: Outcome['lines'] = [];

  const base = awardSoles(baseSoles(s.placement, s.kills));
  lines.push({ label: s.placement === 1 ? tr('premio de victoria', 'victory prize') : `${tr('puesto', 'place')} ${s.placement}`, soles: base });

  p.matches += 1;
  p.kills += s.kills;
  if (s.placement === 1) p.wins += 1;
  if (s.placement <= 3) p.top3 += 1;
  p.streak = s.placement === 1 ? p.streak + 1 : 0;
  p.bestCombo = Math.max(p.bestCombo, s.bestCombo);
  p.bestMass = Math.max(p.bestMass, s.mass);
  const xpGained = xpFor(s);
  p.xp += xpGained;

  const newMedals: Medal[] = [];
  for (const medal of MEDALS) {
    if (!p.medals.includes(medal.id) && medal.test(s, p)) {
      p.medals.push(medal.id);
      newMedals.push(medal);
      lines.push({ label: `${tr('medalla', 'medal')}: ${medal.name}`, soles: awardSoles(medal.reward, { capped: false }) });
    }
  }

  const missionsDone: Outcome['missionsDone'] = [];
  for (const ms of p.missions) {
    if (ms.done) continue;
    const def = missionDef(ms.id);
    const v = def.metric(s);
    ms.progress = def.how === 'max' ? Math.max(ms.progress, v) : ms.progress + v;
    if (ms.progress >= def.goal) {
      ms.done = true;
      ms.progress = def.goal;
      const text = tr(def.text[0], def.text[1]);
      missionsDone.push({ id: ms.id, text, reward: def.reward });
      lines.push({ label: `${tr('misión', 'mission')}: ${text}`, soles: awardSoles(def.reward, { capped: false }) });
    }
  }
  if (p.missions.every((m) => m.done) && missionsDone.length) lines.push({ label: tr('misiones del día completas', 'all daily missions done'), soles: awardSoles(80, { capped: false }) });

  const after = levelOf(p.xp);
  const leveledUp = after.level > before.level;
  if (leveledUp) lines.push({ label: `${tr('nivel', 'level')} ${after.level}`, soles: awardSoles(25 * (after.level - before.level), { capped: false }) });
  save(p);
  return { summary: s, progress: p, xpGained, before, after, leveledUp, newMedals, missionsDone, lines, soles: lines.reduce((a, l) => a + l.soles, 0), won: s.placement === 1 };
}
