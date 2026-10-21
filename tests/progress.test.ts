import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
  vi.resetModules();
});

const summary = (over: Partial<import('../src/features/royale/progress').MatchSummary> = {}) => ({ mode: 'royale' as const, placement: 5, players: 12, kills: 1, bestCombo: 2, powers: 1, seconds: 80, mass: 0, ate: 0, lowHpWin: false, ...over });

describe('progreso de las batallas', () => {
  it('el nivel sube con la experiencia y cada nivel cuesta más', async () => {
    const { levelOf, xpForLevel } = await import('../src/features/royale/progress');
    expect(levelOf(0).level).toBe(0);
    expect(levelOf(xpForLevel(3)).level).toBe(3);
    expect(xpForLevel(4) - xpForLevel(3)).toBeGreaterThan(xpForLevel(3) - xpForLevel(2));
  });

  it('las misiones del día son tres, distintas y estables para la misma fecha', async () => {
    const { dailyMissions } = await import('../src/features/royale/progress');
    const a = dailyMissions('2026-10-21');
    expect(a.length).toBe(3);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    expect(dailyMissions('2026-10-21')).toEqual(a);
  });

  it('ganar da medalla, experiencia y premios, y la medalla no se repite', async () => {
    const { recordMatch } = await import('../src/features/royale/progress');
    const first = recordMatch(summary({ placement: 1, kills: 6, bestCombo: 11 }));
    expect(first.won).toBe(true);
    expect(first.xpGained).toBeGreaterThan(100);
    expect(first.newMedals.map((m) => m.id)).toEqual(expect.arrayContaining(['first-win', 'combo-10', 'hunter']));
    const second = recordMatch(summary({ placement: 1 }));
    expect(second.newMedals.map((m) => m.id)).not.toContain('first-win');
    expect(second.progress.wins).toBe(2);
    expect(second.progress.streak).toBe(2);
  });

  it('una derrota corta la racha y aun así da experiencia', async () => {
    const { recordMatch } = await import('../src/features/royale/progress');
    recordMatch(summary({ placement: 1 }));
    const lost = recordMatch(summary({ placement: 9 }));
    expect(lost.progress.streak).toBe(0);
    expect(lost.xpGained).toBeGreaterThan(0);
  });
});
