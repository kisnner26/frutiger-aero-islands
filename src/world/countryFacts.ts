/** datos básicos de cada país del atlas: capital, continente e idioma(s) principales. */
export interface CountryFacts {
  capital: string;
  continente: string;
  idioma: string;
}

const AM = 'américa', EU = 'europa', AF = 'áfrica', AS = 'asia', OC = 'oceanía';
const T: Array<[string, string, string, string]> = [
  ['us', 'washington d. c.', AM, 'inglés'], ['ca', 'ottawa', AM, 'inglés y francés'], ['mx', 'ciudad de méxico', AM, 'español'], ['gt', 'ciudad de guatemala', AM, 'español'],
  ['sv', 'san salvador', AM, 'español'], ['hn', 'tegucigalpa', AM, 'español'], ['ni', 'managua', AM, 'español'], ['cr', 'san josé', AM, 'español'], ['pa', 'ciudad de panamá', AM, 'español'],
  ['cu', 'la habana', AM, 'español'], ['do', 'santo domingo', AM, 'español'], ['pr', 'san juan', AM, 'español e inglés'], ['jm', 'kingston', AM, 'inglés'], ['ht', 'puerto príncipe', AM, 'criollo haitiano y francés'],
  ['co', 'bogotá', AM, 'español'], ['ve', 'caracas', AM, 'español'], ['ec', 'quito', AM, 'español'], ['pe', 'lima', AM, 'español y quechua'], ['bo', 'sucre y la paz', AM, 'español, quechua y aimara'],
  ['br', 'brasilia', AM, 'portugués'], ['py', 'asunción', AM, 'español y guaraní'], ['uy', 'montevideo', AM, 'español'], ['ar', 'buenos aires', AM, 'español'], ['cl', 'santiago', AM, 'español'],
  ['bz', 'belmopán', AM, 'inglés'], ['tt', 'puerto españa', AM, 'inglés'], ['bs', 'nasáu', AM, 'inglés'], ['bb', 'bridgetown', AM, 'inglés'],
  ['es', 'madrid', EU, 'español'], ['pt', 'lisboa', EU, 'portugués'], ['fr', 'parís', EU, 'francés'], ['it', 'roma', EU, 'italiano'], ['de', 'berlín', EU, 'alemán'], ['gb', 'londres', EU, 'inglés'],
  ['ie', 'dublín', EU, 'inglés e irlandés'], ['nl', 'ámsterdam', EU, 'neerlandés'], ['be', 'bruselas', EU, 'neerlandés, francés y alemán'], ['ch', 'berna', EU, 'alemán, francés, italiano y romanche'],
  ['at', 'viena', EU, 'alemán'], ['se', 'estocolmo', EU, 'sueco'], ['no', 'oslo', EU, 'noruego'], ['fi', 'helsinki', EU, 'finés y sueco'], ['dk', 'copenhague', EU, 'danés'], ['pl', 'varsovia', EU, 'polaco'],
  ['cz', 'praga', EU, 'checo'], ['gr', 'atenas', EU, 'griego'], ['tr', 'ankara', AS, 'turco'], ['ua', 'kiev', EU, 'ucraniano'], ['ro', 'bucarest', EU, 'rumano'], ['ru', 'moscú', EU, 'ruso'],
  ['hu', 'budapest', EU, 'húngaro'], ['rs', 'belgrado', EU, 'serbio'], ['hr', 'zagreb', EU, 'croata'], ['bg', 'sofía', EU, 'búlgaro'], ['is', 'reikiavik', EU, 'islandés'],
  ['lt', 'vilna', EU, 'lituano'], ['lv', 'riga', EU, 'letón'], ['ee', 'tallin', EU, 'estonio'], ['sk', 'bratislava', EU, 'eslovaco'], ['si', 'liubliana', EU, 'esloveno'], ['lu', 'luxemburgo', EU, 'luxemburgués, francés y alemán'],
  ['cy', 'nicosia', EU, 'griego y turco'], ['mt', 'la valeta', EU, 'maltés e inglés'],
  ['ma', 'rabat', AF, 'árabe y tamazight'], ['dz', 'argel', AF, 'árabe y tamazight'], ['tn', 'túnez', AF, 'árabe'], ['eg', 'el cairo', AF, 'árabe'], ['ng', 'abuya', AF, 'inglés'], ['gh', 'acra', AF, 'inglés'],
  ['sn', 'dakar', AF, 'francés'], ['ci', 'yamusukro', AF, 'francés'], ['cm', 'yaundé', AF, 'francés e inglés'], ['et', 'adís abeba', AF, 'amárico'], ['ke', 'nairobi', AF, 'suajili e inglés'],
  ['tz', 'dodoma', AF, 'suajili e inglés'], ['ug', 'kampala', AF, 'inglés y suajili'], ['za', 'pretoria, ciudad del cabo y bloemfontein', AF, '12 idiomas oficiales'], ['ao', 'luanda', AF, 'portugués'],
  ['mz', 'maputo', AF, 'portugués'], ['zw', 'harare', AF, 'inglés, shona y ndebele'], ['cd', 'kinsasa', AF, 'francés'], ['ly', 'trípoli', AF, 'árabe'], ['sd', 'jartum', AF, 'árabe e inglés'],
  ['mg', 'antananarivo', AF, 'malgache y francés'], ['gq', 'malabo', AF, 'español, francés y portugués'], ['bw', 'gaborone', AF, 'inglés y setsuana'], ['na', 'windhoek', AF, 'inglés'], ['zm', 'lusaka', AF, 'inglés'],
  ['mw', 'lilongüe', AF, 'inglés y chichewa'], ['ml', 'bamako', AF, 'francés'], ['ne', 'niamey', AF, 'francés'], ['td', 'yamena', AF, 'francés y árabe'], ['bf', 'uagadugú', AF, 'francés'],
  ['gn', 'conakri', AF, 'francés'], ['sl', 'freetown', AF, 'inglés'], ['lr', 'monrovia', AF, 'inglés'], ['so', 'mogadiscio', AF, 'somalí y árabe'],
  ['cn', 'pekín', AS, 'chino mandarín'], ['jp', 'tokio', AS, 'japonés'], ['kr', 'seúl', AS, 'coreano'], ['in', 'nueva delhi', AS, 'hindi e inglés'], ['pk', 'islamabad', AS, 'urdu e inglés'], ['bd', 'daca', AS, 'bengalí'],
  ['id', 'yakarta', AS, 'indonesio'], ['ph', 'manila', AS, 'filipino e inglés'], ['vn', 'hanói', AS, 'vietnamita'], ['th', 'bangkok', AS, 'tailandés'], ['my', 'kuala lumpur', AS, 'malayo'],
  ['sg', 'singapur', AS, 'inglés, malayo, chino y tamil'], ['tw', 'taipéi', AS, 'chino mandarín'], ['sa', 'riad', AS, 'árabe'], ['ae', 'abu dabi', AS, 'árabe'], ['il', 'jerusalén', AS, 'hebreo y árabe'],
  ['ir', 'teherán', AS, 'persa'], ['iq', 'bagdad', AS, 'árabe y kurdo'], ['kz', 'astaná', AS, 'kazajo y ruso'], ['np', 'katmandú', AS, 'nepalí'], ['lk', 'sri jayawardenapura kotte', AS, 'cingalés y tamil'],
  ['mn', 'ulán bator', AS, 'mongol'], ['ge', 'tiflis', AS, 'georgiano'], ['am', 'ereván', AS, 'armenio'], ['az', 'bakú', AS, 'azerí'], ['uz', 'taskent', AS, 'uzbeko'], ['kh', 'nom pen', AS, 'jemer'],
  ['la', 'vientián', AS, 'lao'], ['mm', 'naipyidó', AS, 'birmano'], ['af', 'kabul', AS, 'pastún y darí'], ['jo', 'amán', AS, 'árabe'], ['lb', 'beirut', AS, 'árabe'], ['kw', 'kuwait', AS, 'árabe'],
  ['qa', 'doha', AS, 'árabe'], ['om', 'mascate', AS, 'árabe'], ['ye', 'saná', AS, 'árabe'],
  ['pg', 'port moresby', OC, 'inglés, tok pisin y hiri motu'], ['fj', 'suva', OC, 'inglés, fiyiano e hindi'], ['au', 'canberra', OC, 'inglés'], ['nz', 'wellington', OC, 'inglés, maorí y lengua de señas'],
];

export const COUNTRY_FACTS: ReadonlyMap<string, CountryFacts> = new Map(T.map(([code, capital, continente, idioma]) => [code, { capital, continente, idioma }]));
