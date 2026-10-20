import { describe, expect, it } from 'vitest';
import { MILESTONES, nextMilestone, reachedMilestones } from '../src/story/lore';
import { missionStatus, nextMission } from '../src/story/missions';
import { CATALOG } from '../src/catalog/catalog';

const obj = (id: string, assetId: string) => ({ id, assetId, x: 500, y: 500, scale: 1, rotation: 0 });

describe('historia y misiones', () => {
  it('los hitos están ordenados y cada recompensa de decoración existe en el catálogo', () => {
    expect(MILESTONES.map((m) => m.percent)).toEqual([...MILESTONES.map((m) => m.percent)].sort((a, b) => a - b));
    expect(reachedMilestones(5).length).toBe(2);
    expect(nextMilestone(100)).toBeNull();
    for (const c of CATALOG.filter((x) => x.unlockPercent)) expect(MILESTONES.some((m) => m.percent === c.unlockPercent), c.id).toBe(true);
  });

  it('las misiones avanzan con la isla y la siguiente es la primera pendiente', () => {
    const ctx = { objects: [obj('a', 'palmera'), obj('b', 'flores')], level: 1, country: null, visitedWorld: false };
    expect(nextMission(ctx)?.mission.id).toBe('primera-luz');
    const more = { ...ctx, objects: [...ctx.objects, obj('c', 'roca'), obj('d', 'arbol'), obj('e', 'pez')], country: 'ni' };
    const st = missionStatus(more);
    expect(st.find((s) => s.mission.id === 'primera-luz')?.done).toBe(true);
    expect(st.find((s) => s.mission.id === 'jardin')?.done).toBe(true);
    expect(st.find((s) => s.mission.id === 'tu-pais')?.done).toBe(true);
  });
});
