import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('capítulos de la pista larga', () => {
  const j = JSON.parse(readFileSync('public/audio/soundtrack.chapters.json', 'utf8')) as { duration: number; starts: number[] };
  it('empiezan en 0, van en orden y dejan canciones de duración razonable', () => {
    expect(j.starts[0]).toBe(0);
    expect(j.starts.length).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < j.starts.length; i++) expect(j.starts[i] - j.starts[i - 1]).toBeGreaterThan(60);
    expect(j.duration - j.starts[j.starts.length - 1]).toBeGreaterThan(60);
  });
});
