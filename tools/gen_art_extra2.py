"""decoraciones adicionales (originales, svg sin recursos externos). uso: python3 tools/gen_art_extra.py"""
import math, os, random

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'decorations')
INK = '#2a4a46'


def svg(body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs>{defs}</defs>{body}</svg>'


def lg(i, a, b, c=None, v=True):
    mid = f'<stop offset=".5" stop-color="{c}"/>' if c else ''
    d = 'x1="0" y1="0" x2="0" y2="1"' if v else 'x1="0" y1="0" x2="1" y2="0"'
    return f'<linearGradient id="{i}" {d}><stop offset="0" stop-color="{a}"/>{mid}<stop offset="1" stop-color="{b}"/></linearGradient>'


def rg(i, a, b):
    return f'<radialGradient id="{i}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></radialGradient>'


def sh(cx=64, cy=118, rx=34, ry=6, op=.3):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#16301f" opacity="{op}"/><ellipse cx="{cx}" cy="{cy - .5}" rx="{rx * .6}" ry="{ry * .6}" fill="#0f2418" opacity="{op * .8}"/>'


def grass(r, cx, y, w, n):
    o = []
    for _ in range(n):
        x = cx + r.uniform(-w / 2, w / 2)
        h = r.uniform(3, 8)
        o.append(f'<path d="M{x - 1:.1f} {y + 1:.1f} Q{x:.1f} {y - h * .6:.1f} {x + r.uniform(-3, 3):.1f} {y - h:.1f} Q{x + 1:.1f} {y - h * .5:.1f} {x + 1:.1f} {y + 1:.1f}Z" fill="{r.choice(["#3f8a2c", "#6fbe3e", "#a6dc5a"])}"/>')
    return ''.join(o)


def gloss(cx, cy, rx, ry, rot=-30, op=.6):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" opacity="{op}" transform="rotate({rot} {cx} {cy})"/>'


def save(name, body, defs=''):
    open(os.path.join(OUT, name + '.svg'), 'w').write(svg(body, defs))



def maceta():
    o = [sh(64, 118, 30, 5)]
    o.append('<path d="M38 80 L90 80 L84 116 L44 116Z" fill="url(#p)" stroke="#a03a4a" stroke-width="1.4"/><path d="M36 76 L92 76 L92 84 L36 84Z" fill="#ff9ab4" stroke="#a03a4a" stroke-width="1.2"/>')
    for a, h in ((-30, 52), (-12, 36), (6, 28), (24, 40), (40, 56)):
        o.append(f'<path d="M64 78 Q{64 + a * .5:.0f} {78 - h * .6:.0f} {64 + a:.0f} {78 - h}" stroke="#3f8a2c" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="{64 + a}" cy="{78 - h}" rx="9" ry="14" fill="url(#g)" stroke="#245a1c" stroke-width="1" transform="rotate({a * .8:.0f} {64 + a} {78 - h})"/>')
    o.append(gloss(48, 96, 4, 14, 8, .6))
    save('maceta', ''.join(o), lg('p', '#ffd0dc', '#e0587a', None, False) + rg('g', '#b8ee78', '#2f8a2a'))


def pecera():
    o = [sh(64, 118, 36, 6)]
    o.append('<circle cx="64" cy="70" r="44" fill="url(#w)" stroke="#5aa8d0" stroke-width="2"/><path d="M26 74 A40 40 0 0 0 102 74Z" fill="#6ac4ee" opacity=".55"/>')
    o.append('<path d="M40 112 Q64 120 88 112 L84 104 L44 104Z" fill="#e8d6a8" stroke="#a08a58" stroke-width="1"/>')
    o.append('<ellipse cx="54" cy="84" rx="12" ry="7" fill="#ff8a3a" stroke="#b44a14" stroke-width="1"/><path d="M66 84 L78 76 L78 92Z" fill="#ff8a3a" stroke="#b44a14" stroke-width="1"/><circle cx="48" cy="82" r="1.8" fill="#222"/>')
    o.append('<ellipse cx="82" cy="62" rx="8" ry="5" fill="#ffd21a" stroke="#a07a00" stroke-width="1"/><path d="M90 62 L98 57 L98 67Z" fill="#ffd21a" stroke="#a07a00" stroke-width="1"/>')
    o.append('<circle cx="70" cy="50" r="3" fill="none" stroke="#fff" stroke-width="1.2"/><circle cx="66" cy="40" r="2" fill="none" stroke="#fff" stroke-width="1.2"/>' + gloss(44, 44, 14, 6, -40, .8))
    save('pecera', ''.join(o), rg('w', '#f4fdff', '#a4dcf4'))


def cd():
    o = [sh(64, 118, 34, 5)]
    o.append('<path d="M40 116 L88 116 L80 104 L48 104Z" fill="#cfe2ea" stroke="#6a8a96" stroke-width="1.2"/>')
    o.append('<circle cx="64" cy="58" r="46" fill="url(#c)" stroke="#6a6aa0" stroke-width="1.6"/><circle cx="64" cy="58" r="12" fill="#e8f4fc" stroke="#6a6aa0" stroke-width="1.2"/><circle cx="64" cy="58" r="5" fill="#9ac4e0"/>')
    o.append('<path d="M64 58 L100 30 A46 46 0 0 1 108 58Z" fill="#7affc8" opacity=".35"/><path d="M64 58 L20 40 A46 46 0 0 1 36 22Z" fill="#ff8aff" opacity=".3"/>' + gloss(46, 36, 22, 6, -35, .7))
    save('cd', ''.join(o), '<radialGradient id="c" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfe4f8"/><stop offset="1" stop-color="#8ab4de"/></radialGradient>')


def monitor():
    o = [sh(64, 118, 34, 5)]
    o.append('<path d="M46 116 L82 116 L78 100 L50 100Z" fill="#cfd8de" stroke="#6a7a86" stroke-width="1.2"/><rect x="58" y="88" width="12" height="14" fill="#b8c4cc" stroke="#6a7a86" stroke-width="1"/>')
    o.append('<rect x="12" y="14" width="104" height="76" rx="8" fill="url(#f)" stroke="#6a7a86" stroke-width="1.6"/><rect x="20" y="22" width="88" height="60" rx="3" fill="url(#s)" stroke="#3a5a76" stroke-width="1"/>')
    o.append('<path d="M20 66 Q40 52 64 62 T108 56 L108 82 L20 82Z" fill="#7ad04a"/><path d="M20 68 Q44 58 70 66 T108 62 L108 82 L20 82Z" fill="#4aa83a" opacity=".6"/><circle cx="84" cy="36" r="8" fill="#fff6b0" opacity=".9"/>' + gloss(40, 30, 24, 5, -20, .6))
    o.append('<circle cx="64" cy="87" r="1.6" fill="#7aff9a"/>')
    save('monitor', ''.join(o), lg('f', '#f4f8fa', '#aebcc6') + lg('s', '#7ad0ff', '#d8f4ff'))


def cascada():
    o = [sh(64, 118, 48, 6)]
    o.append('<path d="M18 116 L28 56 L50 30 L78 24 L100 48 L110 116Z" fill="url(#r)" stroke="#5a5a5a" stroke-width="1.6"/>')
    o.append('<path d="M60 28 Q56 60 62 90 L74 90 Q70 60 72 28Z" fill="url(#a)" opacity=".92"/><path d="M62 40 L63 88 M68 34 L69 90" stroke="#fff" stroke-width="1.4" opacity=".8"/>')
    o.append('<ellipse cx="68" cy="108" rx="38" ry="9" fill="#7ad4f4" stroke="#2a8ab8" stroke-width="1.2" opacity=".95"/><ellipse cx="60" cy="106" rx="14" ry="3" fill="#fff" opacity=".7"/>')
    for x, y in ((30, 64), (88, 70), (36, 92)):
        o.append(f'<ellipse cx="{x}" cy="{y}" rx="8" ry="5" fill="#6fbe3e" stroke="#2f7a28" stroke-width=".8"/>')
    save('cascada', ''.join(o), lg('r', '#b8bcc0', '#6a6e72', None, False) + lg('a', '#e8fbff', '#6ac8ee'))


def puente():
    o = [sh(64, 116, 56, 6, .2)]
    o.append('<path d="M6 96 Q64 40 122 96 L122 106 Q64 56 6 106Z" fill="url(#g)" stroke="#4a88a8" stroke-width="1.6" opacity=".92"/>')
    o.append('<path d="M6 96 Q64 40 122 96" fill="none" stroke="#fff" stroke-width="2.4" opacity=".9"/>')
    for k in range(8):
        t = (k + 1) / 9
        x = 6 + 116 * t
        y = 96 - 46 * math.sin(math.pi * t)
        o.append(f'<path d="M{x:.1f} {y:.1f} L{x:.1f} {y - 16:.1f}" stroke="#e8f4f8" stroke-width="2.4"/>')
    o.append('<path d="M4 108 L22 108 L22 118 L4 118Z M106 108 L124 108 L124 118 L106 118Z" fill="#cfe2ea" stroke="#6a8a96" stroke-width="1.2"/>' + gloss(40, 74, 22, 3, -28, .8))
    save('puente', ''.join(o), lg('g', '#e8fbff', '#7ad0f0', None, False))


def antena():
    o = [sh(64, 118, 24, 4)]
    o.append('<path d="M58 116 L64 36 L70 116Z" fill="url(#p)" stroke="#5a6a76" stroke-width="1.2"/><path d="M60 100 L68 100 M61 84 L67 84 M62 68 L66 68 M63 52 L65 52" stroke="#fff" stroke-width="1.6"/>')
    for r, op in ((14, 1), (26, .8), (38, .6)):
        o.append(f'<path d="M{64 - r} {30 - r * .2:.0f} A{r} {r} 0 0 1 {64 + r} {30 - r * .2:.0f}" fill="none" stroke="#3ac8ff" stroke-width="3.2" stroke-linecap="round" opacity="{op}"/>')
    o.append('<circle cx="64" cy="34" r="6" fill="url(#o)" stroke="#2a8ab0" stroke-width="1.2"/>' + gloss(62, 31, 2.4, 1.6, 0, .9))
    save('antena', ''.join(o), lg('p', '#f2f8fa', '#aebcc6', None, False) + rg('o', '#ffffff', '#5ad8ff'))


def gota():
    o = [sh(64, 118, 30, 5)]
    o.append('<path d="M40 116 L88 116 L82 106 L46 106Z" fill="#cfe2ea" stroke="#6a8a96" stroke-width="1.2"/>')
    o.append('<path d="M64 8 C64 8 22 52 22 78 C22 100 40 108 64 108 C88 108 106 100 106 78 C106 52 64 8 64 8Z" fill="url(#d)" stroke="#2a8ab8" stroke-width="1.8"/>')
    o.append('<path d="M34 80 Q40 98 60 102" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>' + gloss(50, 52, 8, 22, 22, .85))
    save('gota', ''.join(o), '<radialGradient id="d" cx=".4" cy=".6" r=".75"><stop offset="0" stop-color="#e8fbff" stop-opacity=".95"/><stop offset=".6" stop-color="#6ac8ee" stop-opacity=".85"/><stop offset="1" stop-color="#1a78c0"/></radialGradient>')


def nube():
    o = ['<ellipse cx="64" cy="112" rx="40" ry="6" fill="#16301f" opacity=".16"/>']
    for cx, cy, r in ((38, 74, 22), (62, 60, 30), (90, 72, 24), (64, 84, 28)):
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#c)" stroke="#9ac4e0" stroke-width="1"/>')
    o.append(gloss(54, 50, 16, 7, -30, .9))
    save('nube', ''.join(o), rg('c', '#ffffff', '#cfe6f8'))


def arbol_cristal():
    o = [sh(64, 118, 32, 5)]
    o.append('<path d="M58 116 Q60 80 54 54 L74 54 Q68 80 70 116Z" fill="url(#t)" stroke="#6a8aa0" stroke-width="1.2"/>')
    for cx, cy, r in ((40, 48, 22), (88, 46, 24), (64, 28, 28), (64, 54, 26)):
        o.append(f'<path d="M{cx} {cy - r} L{cx + r * .9:.0f} {cy - r * .2:.0f} L{cx + r * .6:.0f} {cy + r * .8:.0f} L{cx - r * .6:.0f} {cy + r * .8:.0f} L{cx - r * .9:.0f} {cy - r * .2:.0f}Z" fill="url(#l)" stroke="#2a9ac0" stroke-width="1.2" opacity=".92"/>')
    o.append('<path d="M64 6 L58 40 M40 28 L50 54 M88 26 L76 54" stroke="#fff" stroke-width="1.4" opacity=".85"/>' + gloss(52, 24, 12, 4, -40, .85))
    save('arbol_cristal', ''.join(o), lg('t', '#d6eef8', '#7aa8c0', None, False) + rg('l', '#e8fff4', '#4ad8b8'))


def ballena():
    o = ['<ellipse cx="64" cy="108" rx="48" ry="6" fill="#1a5a7a" opacity=".22"/>']
    o.append('<path d="M6 80 Q10 44 52 40 Q96 38 112 66 Q118 56 124 40 Q124 66 116 80 Q122 94 112 102 Q104 86 96 84 Q60 108 24 96 Q8 92 6 80Z" fill="url(#b)" stroke="#2a5a8a" stroke-width="1.6"/>')
    o.append('<path d="M10 82 Q50 100 96 84 Q60 104 24 94Z" fill="#fff" opacity=".85"/><path d="M52 48 Q60 22 72 18 Q70 38 68 48Z" fill="#4a90d0" stroke="#2a5a8a" stroke-width="1.2" opacity="0"/>')
    o.append('<circle cx="26" cy="72" r="2.8" fill="#fff"/><circle cx="25.5" cy="72" r="1.5" fill="#111"/><path d="M46 30 Q50 14 44 6 M52 30 Q58 12 66 8" stroke="#bfeaff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>' + gloss(54, 54, 22, 4, -8, .55))
    o.append('<path d="M6 108 q10 -5 20 0 t20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="2.4" opacity=".85"/>')
    save('ballena', ''.join(o), lg('b', '#6ab4f0', '#2a60b0'))


def tortuga():
    o = ['<ellipse cx="64" cy="108" rx="40" ry="6" fill="#1a5a7a" opacity=".22"/>']
    o.append('<ellipse cx="64" cy="76" rx="40" ry="26" fill="url(#s)" stroke="#2a6a38" stroke-width="1.6"/>')
    for x, y in ((50, 66), (78, 66), (64, 78), (46, 86), (82, 86)):
        o.append(f'<path d="M{x - 9} {y} L{x - 4} {y - 8} L{x + 4} {y - 8} L{x + 9} {y} L{x + 4} {y + 8} L{x - 4} {y + 8}Z" fill="#7ad06a" stroke="#2a6a38" stroke-width="1" opacity=".9"/>')
    o.append('<ellipse cx="24" cy="74" rx="12" ry="9" fill="#9ae07a" stroke="#2a6a38" stroke-width="1.2"/><circle cx="20" cy="72" r="1.8" fill="#111"/><ellipse cx="42" cy="96" rx="12" ry="5" fill="#9ae07a" stroke="#2a6a38" stroke-width="1" transform="rotate(25 42 96)"/><ellipse cx="88" cy="96" rx="12" ry="5" fill="#9ae07a" stroke="#2a6a38" stroke-width="1" transform="rotate(-25 88 96)"/>' + gloss(52, 62, 16, 4, -12, .6))
    o.append('<path d="M16 108 q10 -5 20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="2.4" opacity=".85"/>')
    save('tortuga', ''.join(o), rg('s', '#a6e88a', '#2f8a4a'))


def orbe():
    o = [sh(64, 118, 30, 5)]
    o.append('<path d="M42 116 L86 116 L78 98 L50 98Z" fill="url(#m)" stroke="#6a7a8a" stroke-width="1.2"/>')
    o.append('<circle cx="64" cy="58" r="40" fill="#9af0ff" opacity=".25"/><circle cx="64" cy="58" r="32" fill="url(#o)" stroke="#2a9ac0" stroke-width="1.6"/>')
    o.append('<path d="M44 62 Q54 46 64 60 T84 54" fill="none" stroke="#fff" stroke-width="2.4" opacity=".8"/>' + gloss(52, 44, 12, 6, -35, .95) + '<circle cx="76" cy="72" r="3" fill="#fff" opacity=".8"/>')
    save('orbe', ''.join(o), lg('m', '#f4f8fa', '#aebcc6') + rg('o', '#ffffff', '#35c8ff'))


for f in (maceta, pecera, cd, monitor, cascada, puente, antena, gota, nube, arbol_cristal, ballena, tortuga, orbe):
    f()
print('ok')
