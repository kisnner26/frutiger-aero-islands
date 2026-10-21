import { lang } from '../i18n';
/** países seleccionables: código iso 3166-1 alfa-2, nombre en español y un punto de referencia (lat, lon) aproximado.
 *  las coordenadas son aproximaciones propias para ubicar la zona de cada isla; no son datos cartográficos oficiales. */
export interface Country {
  code: string;
  name: string;
  /** nombre en español, para que la búsqueda también lo encuentre en inglés. */
  nameEs: string;
  lat: number;
  lon: number;
}

const regionNames = lang === 'en' && typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
const localName = (code: string, es: string) => {
  try {
    return regionNames?.of(code.toUpperCase())?.toLowerCase() ?? es;
  } catch {
    return es;
  }
};
const c = (code: string, name: string, lat: number, lon: number): Country => ({ code, name: localName(code, name), nameEs: name, lat, lon });

export const COUNTRIES: readonly Country[] = [
  // américa
  c('us', 'estados unidos', 39, -98), c('ca', 'canadá', 58, -100), c('mx', 'méxico', 23, -102), c('gt', 'guatemala', 15.5, -90.3), c('sv', 'el salvador', 13.8, -88.9), c('hn', 'honduras', 14.8, -86.6),
  c('ni', 'nicaragua', 12.9, -85.2), c('cr', 'costa rica', 9.9, -84.2), c('pa', 'panamá', 8.5, -80.1), c('cu', 'cuba', 21.5, -79.5), c('do', 'república dominicana', 18.9, -70.5), c('pr', 'puerto rico', 18.2, -66.5),
  c('jm', 'jamaica', 18.1, -77.3), c('ht', 'haití', 19, -72.5), c('co', 'colombia', 4.6, -74.1), c('ve', 'venezuela', 7, -66), c('ec', 'ecuador', -1.4, -78.4), c('pe', 'perú', -9.2, -75),
  c('bo', 'bolivia', -16.7, -64.7), c('br', 'brasil', -10, -52), c('py', 'paraguay', -23.4, -58.4), c('uy', 'uruguay', -32.8, -56), c('ar', 'argentina', -34, -64), c('cl', 'chile', -35.7, -71.5),
  // europa
  c('es', 'españa', 40.2, -3.7), c('pt', 'portugal', 39.6, -8), c('fr', 'francia', 46.6, 2.4), c('it', 'italia', 42.8, 12.5), c('de', 'alemania', 51, 10.4), c('gb', 'reino unido', 54, -2.5),
  c('ie', 'irlanda', 53.2, -8), c('nl', 'países bajos', 52.2, 5.5), c('be', 'bélgica', 50.6, 4.6), c('ch', 'suiza', 46.8, 8.2), c('at', 'austria', 47.6, 14.1), c('se', 'suecia', 62, 15),
  c('no', 'noruega', 64.5, 12), c('fi', 'finlandia', 64.5, 26), c('dk', 'dinamarca', 56, 10), c('pl', 'polonia', 52, 19), c('cz', 'chequia', 49.8, 15.5), c('gr', 'grecia', 39, 22),
  c('tr', 'turquía', 39, 35), c('ua', 'ucrania', 49, 31), c('ro', 'rumania', 45.9, 24.9), c('ru', 'rusia', 60, 95), c('hu', 'hungría', 47, 19.5), c('rs', 'serbia', 44, 20.8),
  c('hr', 'croacia', 45.1, 15.2), c('bg', 'bulgaria', 42.7, 25.5), c('is', 'islandia', 64.9, -18.6),
  // áfrica
  c('ma', 'marruecos', 31.8, -6.9), c('dz', 'argelia', 28, 2.6), c('tn', 'túnez', 33.9, 9.5), c('eg', 'egipto', 26.8, 30.8), c('ng', 'nigeria', 9.1, 8.7), c('gh', 'ghana', 7.9, -1),
  c('sn', 'senegal', 14.5, -14.4), c('ci', 'costa de marfil', 7.5, -5.5), c('cm', 'camerún', 5.7, 12.7), c('et', 'etiopía', 9.1, 40.5), c('ke', 'kenia', 0.2, 37.9), c('tz', 'tanzania', -6.4, 34.9),
  c('ug', 'uganda', 1.4, 32.3), c('za', 'sudáfrica', -29, 24.7), c('ao', 'angola', -11.2, 17.9), c('mz', 'mozambique', -18.7, 35.5), c('zw', 'zimbabue', -19, 29.2), c('cd', 'república democrática del congo', -2.9, 23.7),
  c('ly', 'libia', 27, 17), c('sd', 'sudán', 15.5, 30), c('mg', 'madagascar', -19, 46.9), c('gq', 'guinea ecuatorial', 1.6, 10.4),
  // asia
  c('cn', 'china', 35, 103), c('jp', 'japón', 36.2, 138.3), c('kr', 'corea del sur', 36.4, 127.9), c('in', 'india', 22.6, 79), c('pk', 'pakistán', 30, 69.3), c('bd', 'bangladés', 23.8, 90.3),
  c('id', 'indonesia', -2.5, 118), c('ph', 'filipinas', 12.9, 122.7), c('vn', 'vietnam', 16, 107.8), c('th', 'tailandia', 15.1, 101), c('my', 'malasia', 4.2, 102), c('sg', 'singapur', 1.35, 103.8),
  c('tw', 'taiwán', 23.7, 121), c('sa', 'arabia saudita', 24, 45), c('ae', 'emiratos árabes unidos', 24, 54), c('il', 'israel', 31, 35), c('ir', 'irán', 32.4, 53.7), c('iq', 'irak', 33, 44),
  c('kz', 'kazajistán', 48, 67), c('np', 'nepal', 28.4, 84.1), c('lk', 'sri lanka', 7.9, 80.7), c('mn', 'mongolia', 46.9, 103.8),
  // más países
  c('bz', 'belice', 17.2, -88.7), c('tt', 'trinidad y tobago', 10.5, -61.3), c('bs', 'bahamas', 24.7, -78), c('bb', 'barbados', 13.2, -59.5), c('lt', 'lituania', 55.3, 23.9), c('lv', 'letonia', 56.9, 24.9),
  c('ee', 'estonia', 58.7, 25.5), c('sk', 'eslovaquia', 48.7, 19.5), c('si', 'eslovenia', 46.1, 14.8), c('lu', 'luxemburgo', 49.8, 6.1), c('cy', 'chipre', 35, 33), c('mt', 'malta', 35.9, 14.4),
  c('ge', 'georgia', 42.2, 43.5), c('am', 'armenia', 40.2, 45), c('az', 'azerbaiyán', 40.3, 47.7), c('uz', 'uzbekistán', 41.4, 64.6), c('kh', 'camboya', 12.6, 104.9), c('la', 'laos', 18.2, 103.9),
  c('mm', 'myanmar', 21.9, 95.9), c('af', 'afganistán', 33.9, 67.7), c('jo', 'jordania', 31.2, 36.5), c('lb', 'líbano', 33.9, 35.9), c('kw', 'kuwait', 29.3, 47.5), c('qa', 'catar', 25.3, 51.2),
  c('om', 'omán', 21.5, 55.9), c('ye', 'yemen', 15.6, 48.5), c('bw', 'botsuana', -22.3, 24.7), c('na', 'namibia', -22.6, 17.1), c('zm', 'zambia', -13.1, 27.8), c('mw', 'malaui', -13.3, 34.3),
  c('ml', 'malí', 17.6, -4), c('ne', 'níger', 17.6, 8.1), c('td', 'chad', 15.5, 18.7), c('bf', 'burkina faso', 12.2, -1.6), c('gn', 'guinea', 9.9, -9.7), c('sl', 'sierra leona', 8.5, -11.8),
  c('lr', 'liberia', 6.4, -9.4), c('so', 'somalia', 5.2, 46.2), c('pg', 'papúa nueva guinea', -6.3, 143.9), c('fj', 'fiyi', -17.7, 178.1),
  // oceanía
  c('au', 'australia', -25.3, 134), c('nz', 'nueva zelanda', -41, 174),
];

const BY_CODE = new Map(COUNTRIES.map((x) => [x.code, x]));

export function findCountry(code: string | null | undefined): Country | undefined {
  return code ? BY_CODE.get(code.toLowerCase()) : undefined;
}

/** quita tildes y pasa a minúsculas para buscar. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function searchCountries(query: string): Country[] {
  const q = normalize(query);
  const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, lang));
  if (!q) return sorted;
  return sorted.filter((x) => normalize(x.name).includes(q) || normalize(x.nameEs).includes(q) || x.code === q);
}
