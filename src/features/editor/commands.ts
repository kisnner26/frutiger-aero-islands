import { CATALOG_MAP } from '../../catalog/catalog';
import { computeCharm, levelFor, LEVEL_UP_BONUS } from '../../domain/charm';
import { ERROR_TEXT, validateObject, validatePlacement } from '../../domain/geometry';
import { MAX_HISTORY, type PlacedObject } from '../../domain/island';

export interface Stats {
  pops: number;
  bestCombo: number;
}

/** estado persistente del juego local. */
export interface Doc {
  objects: PlacedObject[];
  brillos: number;
  maxLevel: number;
  stats: Stats;
}

type Command =
  | { kind: 'place'; obj: PlacedObject; cost: number }
  | { kind: 'remove'; obj: PlacedObject; index: number; refund: number }
  | { kind: 'update'; id: string; from: Partial<PlacedObject>; to: Partial<PlacedObject> };

export interface EditorState {
  doc: Doc;
  undo: Command[];
  redo: Command[];
  /** mensaje de error o aviso para anunciar en html. */
  notice: { id: number; text: string; tone: 'error' | 'info' } | null;
  levelUp: { id: number; level: number } | null;
  selectedId: string | null;
}

export type Action =
  | { type: 'place'; obj: PlacedObject }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'patch'; id: string; patch: Partial<Pick<PlacedObject, 'scale' | 'rotation' | 'x' | 'y'>> }
  | { type: 'remove'; id: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select'; id: string | null }
  | { type: 'pop'; value: number; combo: number }
  | { type: 'reward'; value: number }
  | { type: 'load'; doc: Doc };

export const START_BRILLOS = 100;

export function initialDoc(): Doc {
  return {
    objects: [
      { id: 'inicial-palmera', assetId: 'palmera', x: 440, y: 470, scale: 1, rotation: 0 },
      { id: 'inicial-flores', assetId: 'flores', x: 540, y: 520, scale: 1, rotation: 0 },
    ],
    brillos: START_BRILLOS,
    maxLevel: 1,
    stats: { pops: 0, bestCombo: 0 },
  };
}

export function createState(doc: Doc = initialDoc()): EditorState {
  return { doc, undo: [], redo: [], notice: null, levelUp: null, selectedId: null };
}

let noticeSeq = 0;
const note = (text: string, tone: 'error' | 'info' = 'error') => ({ id: ++noticeSeq, text, tone });

export function newObjectId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `o-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyCmd(doc: Doc, cmd: Command): Doc {
  switch (cmd.kind) {
    case 'place':
      return { ...doc, objects: [...doc.objects, cmd.obj], brillos: doc.brillos - cmd.cost };
    case 'remove':
      return { ...doc, objects: doc.objects.filter((o) => o.id !== cmd.obj.id), brillos: doc.brillos + cmd.refund };
    case 'update':
      return { ...doc, objects: doc.objects.map((o) => (o.id === cmd.id ? { ...o, ...cmd.to } : o)) };
  }
}

function revertCmd(doc: Doc, cmd: Command): Doc {
  switch (cmd.kind) {
    case 'place':
      return { ...doc, objects: doc.objects.filter((o) => o.id !== cmd.obj.id), brillos: doc.brillos + cmd.cost };
    case 'remove': {
      const objects = [...doc.objects];
      objects.splice(Math.min(cmd.index, objects.length), 0, cmd.obj);
      return { ...doc, objects, brillos: doc.brillos - cmd.refund };
    }
    case 'update':
      return { ...doc, objects: doc.objects.map((o) => (o.id === cmd.id ? { ...o, ...cmd.from } : o)) };
  }
}

/** sube de nivel si el encanto lo permite; el nivel nunca baja. */
function settleLevel(state: EditorState): EditorState {
  const level = levelFor(computeCharm(state.doc.objects, CATALOG_MAP));
  if (level <= state.doc.maxLevel) return state;
  const gained = level - state.doc.maxLevel;
  return {
    ...state,
    doc: { ...state.doc, maxLevel: level, brillos: state.doc.brillos + gained * LEVEL_UP_BONUS },
    levelUp: { id: ++noticeSeq, level },
  };
}

function push(state: EditorState, cmd: Command): EditorState {
  const doc = applyCmd(state.doc, cmd);
  const undo = [...state.undo, cmd].slice(-MAX_HISTORY);
  return settleLevel({ ...state, doc, undo, redo: [], notice: null });
}

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'place': {
      const item = CATALOG_MAP.get(action.obj.assetId);
      const err = validatePlacement(item, action.obj, state.doc.objects.length, state.doc.maxLevel);
      if (err) return { ...state, notice: note(ERROR_TEXT[err]) };
      if (item!.unlockLevel > state.doc.maxLevel) return { ...state, notice: note(`se desbloquea en el nivel ${item!.unlockLevel}`) };
      if (state.doc.objects.some((o) => o.id === action.obj.id)) return { ...state, notice: note('identificador repetido') };
      if (state.doc.brillos < item!.cost) return { ...state, notice: note(`faltan ${item!.cost - state.doc.brillos} brillos`) };
      return { ...push(state, { kind: 'place', obj: action.obj, cost: item!.cost }), selectedId: action.obj.id };
    }
    case 'move':
      return patchObject(state, action.id, { x: action.x, y: action.y });
    case 'patch':
      return patchObject(state, action.id, action.patch);
    case 'remove': {
      const index = state.doc.objects.findIndex((o) => o.id === action.id);
      if (index < 0) return state;
      const obj = state.doc.objects[index];
      const refund = CATALOG_MAP.get(obj.assetId)?.cost ?? 0;
      return { ...push(state, { kind: 'remove', obj, index, refund }), selectedId: null };
    }
    case 'undo': {
      const cmd = state.undo[state.undo.length - 1];
      if (!cmd) return state;
      const doc = revertCmd(state.doc, cmd);
      const selectedId = state.selectedId && doc.objects.some((o) => o.id === state.selectedId) ? state.selectedId : null;
      return { ...state, doc, undo: state.undo.slice(0, -1), redo: [...state.redo, cmd], selectedId, notice: null };
    }
    case 'redo': {
      const cmd = state.redo[state.redo.length - 1];
      if (!cmd) return state;
      if (cmd.kind === 'place' && state.doc.brillos < cmd.cost) return { ...state, notice: note(`faltan ${cmd.cost - state.doc.brillos} brillos`) };
      const doc = applyCmd(state.doc, cmd);
      return settleLevel({ ...state, doc, redo: state.redo.slice(0, -1), undo: [...state.undo, cmd].slice(-MAX_HISTORY), notice: null });
    }
    case 'select':
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id };
    case 'pop':
      return {
        ...state,
        doc: {
          ...state.doc,
          brillos: state.doc.brillos + action.value,
          stats: { pops: state.doc.stats.pops + 1, bestCombo: Math.max(state.doc.stats.bestCombo, action.combo) },
        },
      };
    case 'reward':
      return { ...state, doc: { ...state.doc, brillos: state.doc.brillos + Math.max(0, Math.floor(action.value)) } };
    case 'load':
      return createState(action.doc);
  }
}

function patchObject(state: EditorState, id: string, patch: Partial<PlacedObject>): EditorState {
  const current = state.doc.objects.find((o) => o.id === id);
  if (!current) return state;
  const next = { ...current, ...patch };
  const err = validateObject(CATALOG_MAP.get(current.assetId), next, state.doc.maxLevel);
  if (err) return { ...state, notice: note(ERROR_TEXT[err]) };
  const from: Partial<PlacedObject> = {};
  const to: Partial<PlacedObject> = {};
  for (const key of Object.keys(patch) as (keyof PlacedObject)[]) {
    if (current[key] !== next[key]) {
      (from as Record<string, unknown>)[key] = current[key];
      (to as Record<string, unknown>)[key] = next[key];
    }
  }
  if (Object.keys(to).length === 0) return state;
  return push(state, { kind: 'update', id, from, to });
}
