import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../src/world/countries';
import { COUNTRY_FACTS } from '../src/world/countryFacts';

describe('datos de países', () => {
  it('cada país del atlas tiene capital, continente e idioma', () => {
    for (const c of COUNTRIES) expect(COUNTRY_FACTS.get(c.code), c.code).toBeDefined();
  });
});
