import { describe, expect, it } from 'vitest';
import { computeCharm, levelFor } from '../src/domain/charm';
import { CATALOG_MAP } from '../src/catalog/catalog';
import { MAX_HISTORY, type PlacedObject } from '../src/domain/island';
import { createState, editorReducer, type Doc, type EditorState } from '../src/features/editor/commands';
import { parseDraft, saveDraft, DRAFT_VERSION } from '../src/persistence/localDraft';

const obj = (id: string, assetId = 'flores', x = 500, y = 500, scale = 1): PlacedObject => ({ id, assetId, x, y, scale, rotation: 0 });
const empty = (brillos = 1000): EditorState => createState({ objects: [], brillos, maxLevel: 10, stats: { pops: 0, bestCombo: 0 } });

describe('comandos y historial', () => {
  it('coloca, cobra y deshace devolviendo brillos', () => {
    let s = empty(100);
    s = editorReducer(s, { type: 'place', obj: obj('a', 'palmera') });
    expect(s.doc.objects).toHaveLength(1);
    expect(s.doc.brillos).toBe(100 - CATALOG_MAP.get('palmera')!.cost);
    s = editorReducer(s, { type: 'undo' });
    expect(s.doc.objects).toHaveLength(0);
    expect(s.doc.brillos).toBe(100);
    s = editorReducer(s, { type: 'redo' });
    expect(s.doc.objects).toHaveLength(1);
  });

  it('rechaza sin brillos, fuera de zona y bloqueados por nivel', () => {
    let s = empty(0);
    s = editorReducer(s, { type: 'place', obj: obj('a') });
    expect(s.doc.objects).toHaveLength(0);
    expect(s.notice?.text).toMatch(/faltan/);
    s = editorReducer(empty(), { type: 'place', obj: obj('a', 'flores', 10, 10) });
    expect(s.doc.objects).toHaveLength(0);
    const nivel1 = createState({ objects: [], brillos: 1000, maxLevel: 1, stats: { pops: 0, bestCombo: 0 } });
    expect(editorReducer(nivel1, { type: 'place', obj: obj('c', 'pabellon') }).doc.objects).toHaveLength(0);
  });

  it('mover, escalar y rotar son comandos que se deshacen', () => {
    let s = editorReducer(empty(), { type: 'place', obj: obj('a') });
    s = editorReducer(s, { type: 'move', id: 'a', x: 520, y: 510 });
    s = editorReducer(s, { type: 'patch', id: 'a', patch: { scale: 1.5 } });
    s = editorReducer(s, { type: 'patch', id: 'a', patch: { rotation: 1 } });
    expect(s.doc.objects[0]).toMatchObject({ x: 520, y: 510, scale: 1.5, rotation: 1 });
    s = editorReducer(s, { type: 'undo' });
    s = editorReducer(s, { type: 'undo' });
    s = editorReducer(s, { type: 'undo' });
    expect(s.doc.objects[0]).toMatchObject({ x: 500, y: 500, scale: 1, rotation: 0 });
  });

  it('escala inválida o fuera de zona no cambia nada', () => {
    let s = editorReducer(empty(), { type: 'place', obj: obj('a') });
    const before = s.doc.objects[0];
    s = editorReducer(s, { type: 'patch', id: 'a', patch: { scale: 9 } });
    s = editorReducer(s, { type: 'move', id: 'a', x: 5, y: 5 });
    expect(s.doc.objects[0]).toEqual(before);
    expect(s.undo).toHaveLength(1);
  });

  it('borrar devuelve el coste y se puede deshacer en su sitio', () => {
    let s = empty(50);
    s = editorReducer(s, { type: 'place', obj: obj('a') });
    s = editorReducer(s, { type: 'place', obj: obj('b', 'flores', 520, 520) });
    const gasto = 50 - s.doc.brillos;
    s = editorReducer(s, { type: 'remove', id: 'a' });
    expect(s.doc.brillos).toBe(50 - gasto + CATALOG_MAP.get('flores')!.cost);
    s = editorReducer(s, { type: 'undo' });
    expect(s.doc.objects.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('historial limitado a 50 operaciones', () => {
    let s = empty(10000);
    for (let i = 0; i < 60; i++) s = editorReducer(s, { type: 'place', obj: obj(`o${i}`, 'flores', 400 + (i % 30), 450 + Math.floor(i / 30)) });
    expect(s.undo.length).toBe(MAX_HISTORY);
  });

  it('el objeto 151 se rechaza', () => {
    let s = empty(100000);
    for (let i = 0; i < 150; i++) s = editorReducer(s, { type: 'place', obj: obj(`o${i}`, 'flores', 300 + (i % 50) * 8, 400 + Math.floor(i / 50) * 20) });
    expect(s.doc.objects).toHaveLength(150);
    s = editorReducer(s, { type: 'place', obj: obj('extra') });
    expect(s.doc.objects).toHaveLength(150);
    expect(s.notice?.text).toMatch(/150/);
  });

  it('subir de nivel concede brillos y el nivel no baja al borrar', () => {
    const base = createState({ objects: [], brillos: 1000, maxLevel: 1, stats: { pops: 0, bestCombo: 0 } });
    let s = base;
    for (let i = 0; i < 6; i++) s = editorReducer(s, { type: 'place', obj: obj(`p${i}`, i % 2 ? 'arbol' : 'palmera', 420 + i * 30, 480 + (i % 2) * 20) });
    expect(s.doc.maxLevel).toBeGreaterThan(1);
    expect(s.levelUp).not.toBeNull();
    const nivel = s.doc.maxLevel;
    for (let i = 0; i < 6; i++) s = editorReducer(s, { type: 'remove', id: `p${i}` });
    expect(s.doc.maxLevel).toBe(nivel);
  });
});

describe('encanto', () => {
  it('suma base, variedad y armonía', () => {
    const solo = computeCharm([obj('a', 'palmera')], CATALOG_MAP);
    const dos = computeCharm([obj('a', 'palmera'), obj('b', 'roca', 520, 500)], CATALOG_MAP);
    const lejos = computeCharm([obj('a', 'palmera', 300, 500), obj('b', 'roca', 700, 500)], CATALOG_MAP);
    expect(dos).toBeGreaterThan(lejos);
    expect(lejos).toBeGreaterThan(solo);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(1e9)).toBe(10);
  });
});

describe('borrador local', () => {
  const doc: Doc = { objects: [obj('a')], brillos: 77, maxLevel: 2, stats: { pops: 3, bestCombo: 2 } };

  it('ida y vuelta', () => {
    const store = new Map<string, string>();
    expect(saveDraft(doc, { setItem: (k, v) => void store.set(k, v) })).toBe('ok');
    const raw = [...store.values()][0];
    expect(parseDraft(raw)).toEqual(doc);
  });

  it('json corrupto y datos inválidos devuelven null', () => {
    expect(parseDraft('{no es json')).toBeNull();
    expect(parseDraft(JSON.stringify({ version: 99, objects: [] }))).toBeNull();
    expect(parseDraft(JSON.stringify({ version: DRAFT_VERSION, objects: [{ id: 'a', assetId: 'inexistente', x: 1, y: 1, scale: 1, rotation: 0 }], brillos: 1, maxLevel: 1 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ version: DRAFT_VERSION, objects: [obj('a'), obj('a')], brillos: 1, maxLevel: 1 }))).toBeNull();
  });

  it('cuota excedida no lanza', () => {
    const res = saveDraft(doc, {
      setItem: () => {
        throw new DOMException('lleno', 'QuotaExceededError');
      },
    });
    expect(res).toBe('cuota');
  });
});
