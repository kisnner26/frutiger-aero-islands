import { CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, SKIN, type AvatarSpec } from './model';

/** oscurece (<0) o aclara (>0) un color #rrggbb. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export type AvatarCrop = 'completo' | 'cabeza' | 'torso' | 'piernas' | 'pies';
export const VIEWBOX: Record<AvatarCrop, string> = { completo: '0 0 120 200', cabeza: '18 0 84 102', torso: '8 90 104 64', piernas: '16 124 88 70', pies: '22 156 76 38' };

/** dibuja el personaje como svg; todo se compone con formas simples y degradados de cristal. */
export function avatarSvg(spec: AvatarSpec, crop: AvatarCrop = 'completo'): string {
  const skin = SKIN[spec.skin];
  const skinD = shade(skin, -0.22);
  const ink = shade(skin, -0.55);
  const hair = HAIR_COLORS[spec.hairColor];
  const hairD = shade(hair, -0.3);
  const eye = EYE_COLORS[spec.eyeColor];
  const top = CLOTH_COLORS[spec.topColor];
  const topD = shade(top, -0.25);
  const bottom = CLOTH_COLORS[spec.bottomColor];
  const shoe = CLOTH_COLORS[spec.shoesColor];
  const acc = CLOTH_COLORS[spec.accessoryColor];
  const accD = shade(acc, -0.3);
  const line = `stroke="${ink}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"`;
  const bw = [38, 46, 56][spec.body];
  const lx = 60 - bw / 2;
  const dress = spec.top === 3;

  const defs = `<defs>
<linearGradient id="gs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(skin, 0.18)}"/><stop offset="1" stop-color="${skin}"/></linearGradient>
<linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(top, 0.25)}"/><stop offset="1" stop-color="${top}"/></linearGradient>
<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(bottom, 0.15)}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<linearGradient id="gh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(hair, 0.3)}"/><stop offset="1" stop-color="${hair}"/></linearGradient>
<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;

  const parts: string[] = [];
  parts.push(`<ellipse cx="60" cy="190" rx="28" ry="5" fill="#16301f" opacity=".28"/>`);

  /* ---- pelo trasero ---- */
  const hairBack: string[] = [];
  if (spec.hair === 2) hairBack.push(`<rect x="26" y="28" width="68" height="94" rx="30" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 3) hairBack.push(`<path d="M27 40 Q22 80 28 118 Q36 126 42 118 Q48 128 56 118 Q64 128 72 118 Q80 128 90 118 Q98 80 93 40 Z" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 9) hairBack.push(`<rect x="27" y="30" width="66" height="70" rx="28" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 5) hairBack.push(`<path d="M86 52 Q108 56 106 84 Q104 100 94 96 Q100 80 90 70Z" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 7) hairBack.push(`<circle cx="60" cy="48" r="46" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 4) for (const [x, y, r] of [[34, 38, 14], [50, 24, 15], [70, 24, 15], [86, 38, 14], [28, 60, 12], [92, 60, 12]]) hairBack.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 6) hairBack.push(`<circle cx="60" cy="16" r="11" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 10) for (const x of [24, 96]) hairBack.push(`<ellipse cx="${x}" cy="88" rx="7" ry="30" fill="url(#gh)" ${line}/><path d="M${x - 5} 70 H${x + 5} M${x - 5} 84 H${x + 5} M${x - 5} 98 H${x + 5}" stroke="${hairD}" stroke-width="1.4"/><circle cx="${x}" cy="118" r="4" fill="${acc}" ${line}/>`);
  parts.push(...hairBack);
  if (spec.top === 1) parts.push(`<ellipse cx="60" cy="96" rx="${bw / 2 - 3}" ry="9" fill="${shade(top, -0.12)}" ${line}/>`); // capucha

  /* ---- piernas, zapatos y brazos ---- */
  const legTop = 138;
  const legSkin = (x: number, h: number) => `<rect x="${x}" y="${legTop}" width="12" height="${h}" rx="5" fill="url(#gs)" ${line}/>`;
  parts.push(legSkin(47, 40), legSkin(61, 40));
  if (spec.bottom === 0 && !dress) parts.push(`<rect x="45" y="${legTop - 4}" width="15" height="42" rx="6" fill="url(#gb)" ${line}/><rect x="60" y="${legTop - 4}" width="15" height="42" rx="6" fill="url(#gb)" ${line}/>`);
  if (spec.bottom === 1 && !dress) parts.push(`<rect x="45" y="${legTop - 4}" width="15" height="20" rx="6" fill="url(#gb)" ${line}/><rect x="60" y="${legTop - 4}" width="15" height="20" rx="6" fill="url(#gb)" ${line}/>`);
  if (spec.bottom === 2 && !dress) parts.push(`<path d="M${lx - 2} ${legTop - 6} L${lx + bw + 2} ${legTop - 6} L${lx + bw + 10} ${legTop + 20} L${lx - 10} ${legTop + 20} Z" fill="url(#gb)" ${line}/>`);

  const shoeSolid = `fill="${shoe}" ${line}`;
  if (spec.shoes === 0) parts.push(`<ellipse cx="53" cy="181" rx="11" ry="6" ${shoeSolid}/><ellipse cx="67" cy="181" rx="11" ry="6" ${shoeSolid}/><path d="M43 184 Q53 188 63 184 M57 184 Q67 188 77 184" stroke="#fff" stroke-width="2" fill="none"/>`);
  if (spec.shoes === 1) parts.push(`<ellipse cx="53" cy="182" rx="10" ry="5" fill="url(#gs)" ${line}/><ellipse cx="67" cy="182" rx="10" ry="5" fill="url(#gs)" ${line}/><path d="M46 180 H60 M60 180 H74" stroke="${shoe}" stroke-width="3"/>`);
  if (spec.shoes === 2) parts.push(`<rect x="44" y="166" width="14" height="18" rx="5" ${shoeSolid}/><rect x="62" y="166" width="14" height="18" rx="5" ${shoeSolid}/><rect x="42" y="180" width="19" height="6" rx="3" fill="${shade(shoe, -0.35)}"/><rect x="59" y="180" width="19" height="6" rx="3" fill="${shade(shoe, -0.35)}"/>`);
  if (spec.shoes === 3) parts.push(`<ellipse cx="53" cy="182" rx="10" ry="5" fill="url(#gs)" ${line}/><ellipse cx="67" cy="182" rx="10" ry="5" fill="url(#gs)" ${line}/>`);

  // brazos (detrás del torso)
  const armX = [lx - 9, lx + bw - 1];
  const longSleeve = spec.top === 1 || spec.top === 2 || spec.top === 6;
  const shortSleeve = spec.top === 0 || spec.top === 7;
  for (const x of armX) {
    parts.push(`<rect x="${x}" y="100" width="10" height="38" rx="5" fill="url(#gs)" ${line}/>`);
    if (longSleeve) parts.push(`<rect x="${x - 0.5}" y="99" width="11" height="34" rx="5" fill="url(#gt)" ${line}/>`);
    else if (shortSleeve) parts.push(`<rect x="${x - 0.5}" y="99" width="11" height="17" rx="5" fill="url(#gt)" ${line}/>`);
    parts.push(`<circle cx="${x + 5}" cy="140" r="6" fill="url(#gs)" ${line}/>`);
  }

  /* ---- torso y prendas ---- */
  parts.push(`<rect x="53" y="86" width="14" height="16" rx="5" fill="${skinD}" ${line}/>`);
  parts.push(`<rect x="${lx}" y="96" width="${bw}" height="46" rx="13" fill="url(#gt)" ${line}/>`);
  if (dress) parts.push(`<path d="M${lx + 2} 128 L${lx + bw - 2} 128 L${lx + bw + 14} 166 Q60 174 ${lx - 14} 166 Z" fill="url(#gt)" ${line}/><path d="M${lx - 4} 160 Q60 170 ${lx + bw + 4} 160" stroke="${topD}" stroke-width="1.5" fill="none"/>`);
  if (spec.top === 1) parts.push(`<rect x="${lx + 8}" y="120" width="${bw - 16}" height="14" rx="5" fill="${shade(top, -0.1)}" ${line}/><path d="M54 98 V112 M66 98 V112" stroke="${topD}" stroke-width="1.6"/>`);
  if (spec.top === 2) parts.push(`<path d="M50 96 L60 108 L70 96 L66 94 L60 100 L54 94 Z" fill="#fff" ${line}/><path d="M60 108 V140" stroke="${topD}" stroke-width="1.3"/><circle cx="60" cy="118" r="1.3" fill="${topD}"/><circle cx="60" cy="128" r="1.3" fill="${topD}"/>`);
  if (spec.top === 4) parts.push(`<path d="M${lx + 6} 96 V104 M${lx + bw - 6} 96 V104" stroke="${topD}" stroke-width="3"/><path d="M${lx} 100 Q60 110 ${lx + bw} 100" stroke="${shade(skin, -0.05)}" stroke-width="0" fill="none"/>`);
  if (spec.top === 5) parts.push(`<path d="M${lx} 96 L60 124 L${lx + bw} 96 L${lx + bw} 142 L${lx} 142 Z" fill="url(#gt)" ${line}/><path d="M${lx + 2} 96 L60 118 L${lx + bw - 2} 96 L60 130 Z" fill="#fff" opacity=".9"/>`);
  if (spec.top === 6) parts.push(`<rect x="53" y="96" width="14" height="46" fill="#fff" ${line}/><path d="M${lx} 96 H55 V142 H${lx}Z" fill="url(#gt)" ${line}/><path d="M65 96 H${lx + bw} V142 H65Z" fill="url(#gt)" ${line}/><path d="M55 96 L60 110 L65 96" fill="none" stroke="${topD}" stroke-width="1.6"/><circle cx="${lx + 6}" cy="132" r="1.4" fill="${topD}"/><circle cx="${lx + bw - 6}" cy="132" r="1.4" fill="${topD}"/>`);
  if (spec.top === 7) parts.push(`<path d="M${lx + 2} 106 H${lx + bw - 2} M${lx} 116 H${lx + bw} M${lx} 126 H${lx + bw} M${lx + 2} 136 H${lx + bw - 2}" stroke="#fff" stroke-width="3.4" opacity=".85"/>`);
  parts.push(`<path d="M${lx + 6} 100 Q${lx + 10} 118 ${lx + 8} 136" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>`);

  /* ---- cabeza ---- */
  const headShape = [
    `<ellipse cx="60" cy="58" rx="30" ry="36" fill="url(#gs)" ${line}/>`,
    `<ellipse cx="60" cy="58" rx="34" ry="33" fill="url(#gs)" ${line}/>`,
    `<rect x="27" y="23" width="66" height="68" rx="26" fill="url(#gs)" ${line}/>`,
  ][spec.head];
  parts.push(`<ellipse cx="27" cy="62" rx="4.5" ry="7" fill="${skin}" ${line}/><ellipse cx="93" cy="62" rx="4.5" ry="7" fill="${skin}" ${line}/>`);
  parts.push(headShape);
  parts.push(`<ellipse cx="42" cy="71" rx="7" ry="4.5" fill="#ff6a6a" opacity=".28"/><ellipse cx="78" cy="71" rx="7" ry="4.5" fill="#ff6a6a" opacity=".28"/>`);
  if (spec.freckles) for (const [x, y] of [[38, 69], [42, 72], [46, 69], [74, 69], [78, 72], [82, 69]]) parts.push(`<circle cx="${x}" cy="${y}" r="1" fill="${shade(skin, -0.42)}" opacity=".75"/>`);

  /* ---- barba (debajo de la boca) ---- */
  if (spec.beard === 1) for (let i = 0; i < 26; i++) parts.push(`<circle cx="${40 + (i % 9) * 5}" cy="${76 + Math.floor(i / 9) * 5 + ((i * 7) % 3)}" r="0.9" fill="${hairD}" opacity=".6"/>`);
  if (spec.beard === 4) parts.push(`<path d="M30 66 Q32 96 60 98 Q88 96 90 66 Q84 82 60 84 Q36 82 30 66Z" fill="url(#gh)" ${line}/>`);
  if (spec.beard === 3) parts.push(`<path d="M53 83 Q60 94 67 83 Q60 86 53 83Z" fill="url(#gh)" ${line}/>`);

  /* ---- rostro ---- */
  const exL = 45;
  const exR = 75;
  const ey = 60;
  const eyeFull = (cx: number, rx: number, ry: number) =>
    `<ellipse cx="${cx}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff" ${line}/><ellipse cx="${cx}" cy="${ey + 0.8}" rx="${rx * 0.62}" ry="${ry * 0.74}" fill="${eye}"/><circle cx="${cx}" cy="${ey + 1}" r="${rx * 0.32}" fill="#111"/><circle cx="${cx - rx * 0.28}" cy="${ey - ry * 0.3}" r="${rx * 0.22}" fill="#fff"/>`;
  const eyes = [
    () => eyeFull(exL, 5.4, 6.4) + eyeFull(exR, 5.4, 6.4),
    () => eyeFull(exL, 7, 8) + eyeFull(exR, 7, 8),
    () => `<path d="M38 ${ey + 1} Q45 ${ey - 6} 52 ${ey - 1} Q45 ${ey + 5} 38 ${ey + 1}Z" fill="#fff" ${line}/><circle cx="46" cy="${ey}" r="2.6" fill="${eye}"/><path d="M68 ${ey - 1} Q75 ${ey - 6} 82 ${ey + 1} Q75 ${ey + 5} 68 ${ey - 1}Z" fill="#fff" ${line}/><circle cx="74" cy="${ey}" r="2.6" fill="${eye}"/>`,
    () => eyeFull(exL, 5.4, 5.4) + eyeFull(exR, 5.4, 5.4) + `<path d="M39 ${ey - 1} Q45 ${ey - 3} 51 ${ey - 1} V${ey - 6} H39Z" fill="url(#gs)"/><path d="M39 ${ey - 1} H51 M69 ${ey - 1} H81" stroke="${ink}" stroke-width="1.6"/><path d="M69 ${ey - 1} Q75 ${ey - 3} 81 ${ey - 1} V${ey - 6} H69Z" fill="url(#gs)"/>`,
    () => `<path d="M39 ${ey + 3} Q45 ${ey - 6} 51 ${ey + 3}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/><path d="M69 ${ey + 3} Q75 ${ey - 6} 81 ${ey + 3}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`,
    () => eyeFull(exL, 6.4, 7.4) + eyeFull(exR, 6.4, 7.4) + `<path d="M${exL - 2} ${ey - 3} l1.6 -2.6 l1.6 2.6 l-2.6 -1.4 h2.6z M${exR - 2} ${ey - 3} l1.6 -2.6 l1.6 2.6 l-2.6 -1.4 h2.6z" fill="#fff"/>`,
  ][spec.eyes]();
  parts.push(eyes);

  const bz = hairD;
  const brows = [
    `<path d="M38 49 H52 M68 49 H82" stroke="${bz}" stroke-width="2.6" stroke-linecap="round"/>`,
    `<path d="M38 50 Q45 44 52 49 M68 49 Q75 44 82 50" stroke="${bz}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    `<path d="M37 49 H53 M67 49 H83" stroke="${bz}" stroke-width="4.4" stroke-linecap="round"/>`,
    `<path d="M39 48 Q45 46 51 48 M69 48 Q75 46 81 48" stroke="${bz}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    `<path d="M38 51 L52 46 M82 51 L68 46" stroke="${bz}" stroke-width="2.8" stroke-linecap="round"/>`,
  ][spec.brows];
  parts.push(brows);

  const nose = [
    `<circle cx="60" cy="69" r="1.4" fill="${ink}" opacity=".7"/>`,
    `<path d="M58 64 Q57 70 60 70" stroke="${ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    `<circle cx="60" cy="68" r="3.4" fill="${shade(skin, -0.08)}" ${line}/><circle cx="59" cy="67" r="1" fill="#fff" opacity=".7"/>`,
    `<ellipse cx="60" cy="68.5" rx="3.4" ry="2.4" fill="none" stroke="${ink}" stroke-width="1.4"/>`,
  ][spec.nose];
  parts.push(nose);

  const mouth = [
    `<path d="M50 78 Q60 87 70 78" stroke="#8a2a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    `<path d="M47 77 Q60 94 73 77 Z" fill="#7a1f2a" ${line}/><path d="M50 78 Q60 82 70 78 L69 80 Q60 84 51 80Z" fill="#fff"/>`,
    `<path d="M52 80 H68" stroke="#8a2a2a" stroke-width="2.4" stroke-linecap="round"/>`,
    `<ellipse cx="60" cy="80" rx="3.6" ry="2.4" fill="#8a2a2a"/>`,
    `<path d="M51 80 Q60 82 70 76" stroke="#8a2a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    `<ellipse cx="60" cy="81" rx="4.6" ry="5.6" fill="#7a1f2a" ${line}/>`,
  ][spec.mouth];
  parts.push(mouth);
  if (spec.beard === 2) parts.push(`<path d="M47 75 Q60 70 73 75 Q60 80 47 75Z" fill="url(#gh)" ${line}/>`);
  parts.push(`<ellipse cx="46" cy="38" rx="13" ry="7" fill="url(#gl)" transform="rotate(-24 46 38)"/>`);

  /* ---- pelo delantero ---- */
  const cap = `<path d="M28 58 Q26 22 60 22 Q94 22 92 58 Q86 40 72 36 Q60 44 44 36 Q32 42 28 58Z" fill="url(#gh)" ${line}/>`;
  if (spec.hair === 1) parts.push(cap);
  if (spec.hair === 2 || spec.hair === 9 || spec.hair === 3 || spec.hair === 10) parts.push(`<path d="M27 66 Q22 20 60 20 Q98 20 93 66 Q88 38 66 34 Q56 46 40 38 Q32 46 27 66Z" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 4 || spec.hair === 7) parts.push(`<path d="M30 52 Q34 28 60 28 Q86 28 90 52 Q78 40 60 42 Q42 40 30 52Z" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 5 || spec.hair === 6) parts.push(cap);
  if (spec.hair === 11) parts.push(`<path d="M28 56 L30 26 L42 38 L48 14 L58 34 L66 12 L74 34 L84 16 L88 38 L94 28 L92 56 Q84 40 60 42 Q36 40 28 56Z" fill="url(#gh)" ${line}/>`);
  if (spec.hair === 8) parts.push(`<path d="M52 30 Q60 4 68 30 Q64 36 60 34 Q56 36 52 30Z" fill="url(#gh)" ${line}/><path d="M30 50 Q34 30 52 26 M90 50 Q86 30 68 26" stroke="${hairD}" stroke-width="3" fill="none" opacity=".6"/>`);

  /* ---- accesorios ---- */
  if (spec.accessory === 1) parts.push(`<circle cx="45" cy="${ey}" r="9" fill="#fff" fill-opacity=".18" stroke="${accD}" stroke-width="2"/><circle cx="75" cy="${ey}" r="9" fill="#fff" fill-opacity=".18" stroke="${accD}" stroke-width="2"/><path d="M54 ${ey} H66 M36 ${ey - 2} L28 ${ey - 4} M84 ${ey - 2} L92 ${ey - 4}" stroke="${accD}" stroke-width="2" fill="none"/>`);
  if (spec.accessory === 2) parts.push(`<rect x="35" y="${ey - 7}" width="20" height="15" rx="4" fill="#fff" fill-opacity=".18" stroke="${accD}" stroke-width="2"/><rect x="65" y="${ey - 7}" width="20" height="15" rx="4" fill="#fff" fill-opacity=".18" stroke="${accD}" stroke-width="2"/><path d="M55 ${ey - 1} H65 M35 ${ey - 3} L28 ${ey - 4} M85 ${ey - 3} L92 ${ey - 4}" stroke="${accD}" stroke-width="2" fill="none"/>`);
  if (spec.accessory === 3) parts.push(`<path d="M27 46 Q26 12 60 12 Q94 12 93 46 Q60 36 27 46Z" fill="${acc}" ${line}/><rect x="25" y="38" width="70" height="10" rx="5" fill="${shade(acc, -0.18)}" ${line}/><circle cx="60" cy="9" r="5" fill="${shade(acc, 0.2)}" ${line}/>`);
  if (spec.accessory === 4) parts.push(`<path d="M28 44 Q28 14 60 14 Q92 14 92 44 Q60 36 28 44Z" fill="${acc}" ${line}/><path d="M60 40 Q96 36 108 44 Q98 52 62 46Z" fill="${shade(acc, -0.2)}" ${line}/>`);
  if (spec.accessory === 5) parts.push(`<g transform="translate(86 30)"><circle r="6" cx="0" cy="-7" fill="${acc}" ${line}/><circle r="6" cx="7" cy="0" fill="${acc}" ${line}/><circle r="6" cx="0" cy="7" fill="${acc}" ${line}/><circle r="6" cx="-7" cy="0" fill="${acc}" ${line}/><circle r="4" fill="#ffd23a" ${line}/></g>`);
  if (spec.accessory === 6) parts.push(`<path d="M26 60 Q24 14 60 14 Q96 14 94 60" fill="none" stroke="${accD}" stroke-width="4" stroke-linecap="round"/><rect x="19" y="54" width="11" height="20" rx="5" fill="${acc}" ${line}/><rect x="90" y="54" width="11" height="20" rx="5" fill="${acc}" ${line}/>`);
  if (spec.accessory === 7) parts.push(`<ellipse cx="60" cy="34" rx="50" ry="11" fill="#e8cf8a" ${line}/><path d="M34 34 Q34 8 60 8 Q86 8 86 34Z" fill="#f2dc9c" ${line}/><path d="M34 30 H86" stroke="${acc}" stroke-width="5"/>`);

  if (spec.accessory === 8) parts.push(`<path d="M32 34 L36 12 L48 26 L60 8 L72 26 L84 12 L88 34 Z" fill="${acc}" ${line}/><rect x="32" y="30" width="56" height="7" rx="3" fill="${shade(acc, -0.18)}" ${line}/><circle cx="60" cy="10" r="3" fill="#fff" ${line}/><circle cx="36" cy="13" r="2.4" fill="#fff"/><circle cx="84" cy="13" r="2.4" fill="#fff"/>`);
  if (spec.accessory === 9) parts.push(`<path d="M78 26 L98 12 L98 40Z M78 26 L58 12 L58 40Z" fill="${acc}" ${line}/><circle cx="78" cy="26" r="5" fill="${accD}" ${line}/>`);
  if (spec.accessory === 10) parts.push(`<path d="M30 40 L32 6 L54 24Z" fill="${acc}" ${line}/><path d="M36 30 L36 14 L47 24Z" fill="#ffb0c0"/><path d="M90 40 L88 6 L66 24Z" fill="${acc}" ${line}/><path d="M84 30 L84 14 L73 24Z" fill="#ffb0c0"/>`);
  if (spec.accessory === 11) parts.push(`<path d="M48 24 Q46 10 36 6 M72 24 Q74 10 84 6" stroke="${accD}" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="36" cy="6" r="4.5" fill="${acc}" ${line}/><circle cx="84" cy="6" r="4.5" fill="${acc}" ${line}/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX[crop]}">${defs}${parts.join('')}</svg>`;
}

export function avatarDataUrl(spec: AvatarSpec, crop: AvatarCrop = 'completo'): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(spec, crop))}`;
}
