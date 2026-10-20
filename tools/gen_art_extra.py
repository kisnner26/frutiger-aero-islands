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


def girasol():
    r = random.Random(1)
    o = [sh(64, 118, 28, 5)]
    for x, h, s in ((40, 52, .8), (64, 34, 1), (90, 58, .75)):
        o.append(f'<path d="M{x} 118 Q{x + 3} {(118 + h) / 2:.0f} {x} {h + 8}" stroke="#3f8a2c" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M{x} 96 q-14 -4 -16 -14 q12 0 16 14z" fill="#5fae38" stroke="#2f6a24" stroke-width=".8"/>')
        for k in range(14):
            a = k * math.pi * 2 / 14
            px, py = x + math.cos(a) * 15 * s, h + math.sin(a) * 15 * s
            o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{8 * s:.1f}" ry="{3.6 * s:.1f}" fill="#ffd21a" stroke="#c98a00" stroke-width=".7" transform="rotate({math.degrees(a):.0f} {px:.1f} {py:.1f})"/>')
        o.append(f'<circle cx="{x}" cy="{h}" r="{9 * s:.1f}" fill="url(#c)" stroke="#4a2c10" stroke-width="1"/>' + gloss(x - 3, h - 3, 4 * s, 2 * s))
    o.append(grass(r, 64, 118, 90, 22))
    save('girasol', ''.join(o), rg('c', '#a8723a', '#4a2c10'))


def arbusto():
    r = random.Random(2)
    o = [sh(64, 116, 44, 7)]
    for cx, cy, rr in ((38, 90, 26), (90, 92, 24), (64, 76, 32), (64, 100, 30)):
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="url(#g)" stroke="#245a1c" stroke-width="1.2"/>')
    for _ in range(26):
        x, y = r.uniform(26, 102), r.uniform(62, 108)
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r.uniform(2, 3.4):.1f}" fill="{r.choice(["#ff7aa8", "#fff", "#ffb4d0", "#ffe27a"])}" stroke="#a03a60" stroke-width=".4"/>')
    o.append(gloss(48, 70, 16, 6))
    o.append(grass(r, 64, 118, 100, 20))
    save('arbusto', ''.join(o), rg('g', '#9ad45a', '#2f7a28'))


def banco():
    o = [sh(64, 116, 46, 6, .26)]
    o.append('<path d="M20 70 L108 70 L112 82 L16 82Z" fill="url(#w)" stroke="#5a3a1a" stroke-width="1.2"/>')
    o.append('<path d="M18 52 L110 52 L108 64 L20 64Z" fill="url(#w)" stroke="#5a3a1a" stroke-width="1.2"/><path d="M20 40 L108 40 L110 50 L18 50Z" fill="url(#w)" stroke="#5a3a1a" stroke-width="1.2"/>')
    o.append('<path d="M24 82 L30 114 M98 82 L104 114" stroke="#e8f4f8" stroke-width="5" stroke-linecap="round"/><path d="M24 64 L24 82 M104 64 L104 82" stroke="#cfe2ea" stroke-width="4"/>')
    o.append('<path d="M22 72 L106 72" stroke="#fff" stroke-width="1.6" opacity=".7"/>')
    save('banco', ''.join(o), lg('w', '#e8b878', '#9a6a34'))


def farol():
    o = [sh(64, 118, 22, 4)]
    o.append('<path d="M60 112 L61 44 L67 44 L68 112Z" fill="url(#p)" stroke="#2a4a52" stroke-width="1.2"/><path d="M52 118 L76 118 L72 108 L56 108Z" fill="#7aa0ac" stroke="#2a4a52" stroke-width="1"/>')
    o.append('<path d="M46 44 L82 44 L76 32 L52 32Z" fill="#7aa0ac" stroke="#2a4a52" stroke-width="1.2"/>')
    o.append('<circle cx="64" cy="20" r="17" fill="url(#o)" stroke="#2a8ab0" stroke-width="1.4"/><circle cx="64" cy="20" r="26" fill="#fff6a8" opacity=".2"/>' + gloss(57, 13, 7, 3.4, -35, .85))
    o.append('<path d="M50 6 Q64 -4 78 6" stroke="#2a4a52" stroke-width="2" fill="none"/>')
    save('farol', ''.join(o), lg('p', '#d6edf4', '#6a98a8', None, False) + rg('o', '#ffffff', '#ffe27a'))


def globo():
    o = [sh(64, 119, 24, 4, .22)]
    o.append('<path d="M64 8 C20 8 14 56 44 84 L84 84 C114 56 108 8 64 8Z" fill="url(#b)" stroke="#2a4a7a" stroke-width="1.4"/>')
    for k in (-26, -8, 8, 26):
        o.append(f'<path d="M64 8 Q{64 + k * 2.2:.0f} 46 {64 + k * .6:.0f} 84" fill="none" stroke="#fff" stroke-width="2.2" opacity=".75"/>')
    o.append('<path d="M20 38 Q64 52 108 38" stroke="#ffd21a" stroke-width="5" fill="none"/>')
    o.append('<path d="M46 84 L52 100 M82 84 L76 100" stroke="#5a3a1a" stroke-width="1.6"/><rect x="50" y="100" width="28" height="16" rx="2" fill="url(#w)" stroke="#5a3a1a" stroke-width="1.2"/>' + gloss(42, 28, 14, 7, -45, .55))
    save('globo', ''.join(o), rg('b', '#8fe6ff', '#2a7ad0') + lg('w', '#e8b878', '#9a6a34'))


def burbuja():
    o = [sh(64, 118, 36, 6, .2)]
    o.append('<circle cx="64" cy="66" r="48" fill="url(#bb)" stroke="#6ac8e8" stroke-width="1.6"/>')
    o.append('<path d="M30 66 A34 34 0 0 0 98 66" fill="none" stroke="#8be86a" stroke-width="3" opacity=".6"/><ellipse cx="64" cy="94" rx="30" ry="8" fill="#fff" opacity=".28"/>' + gloss(44, 40, 14, 7, -40, .9) + '<circle cx="86" cy="86" r="4" fill="#fff" opacity=".7"/>')
    save('burbuja', ''.join(o), '<radialGradient id="bb" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".75" stop-color="#9ae0f6" stop-opacity=".35"/><stop offset="1" stop-color="#3aa0d8" stop-opacity=".65"/></radialGradient>')


def columpio():
    o = [sh(64, 118, 46, 6, .26)]
    o.append('<path d="M18 116 L30 18 M110 116 L98 18" stroke="#e8f4f8" stroke-width="6" stroke-linecap="round"/><path d="M26 22 L102 22" stroke="#cfe2ea" stroke-width="7" stroke-linecap="round"/>')
    o.append('<path d="M48 24 L46 90 M80 24 L82 90" stroke="#7a5a2a" stroke-width="1.8"/><rect x="40" y="88" width="48" height="8" rx="3" fill="url(#w)" stroke="#5a3a1a" stroke-width="1.2"/>' + gloss(60, 90, 12, 1.6, 0, .6))
    save('columpio', ''.join(o), lg('w', '#ff9ab8', '#d9487a'))


def hongos():
    r = random.Random(3)
    o = [sh(64, 118, 40, 6)]
    for x, y, s, col in ((40, 100, 1, '#ff6a8a'), (82, 106, .75, '#8ad8ff'), (62, 88, .6, '#ffd24a')):
        o.append(f'<path d="M{x - 7 * s:.1f} {y + 14 * s:.1f} Q{x:.1f} {y + 4 * s:.1f} {x + 7 * s:.1f} {y + 14 * s:.1f} L{x + 5 * s:.1f} {y - 2 * s:.1f} L{x - 5 * s:.1f} {y - 2 * s:.1f}Z" fill="#fff6e8" stroke="{INK}" stroke-width="1"/>')
        o.append(f'<path d="M{x - 28 * s:.1f} {y:.1f} Q{x:.1f} {y - 44 * s:.1f} {x + 28 * s:.1f} {y:.1f} Q{x:.1f} {y + 6 * s:.1f} {x - 28 * s:.1f} {y:.1f}Z" fill="{col}" stroke="{INK}" stroke-width="1.2"/>')
        for dx, dy in ((-10, -12), (6, -18), (14, -7)):
            o.append(f'<circle cx="{x + dx * s:.1f}" cy="{y + dy * s:.1f}" r="{3.2 * s:.1f}" fill="#fff" opacity=".9"/>')
        o.append(gloss(x - 9 * s, y - 20 * s, 8 * s, 3 * s, -30, .5))
    o.append(grass(r, 64, 118, 90, 20))
    save('hongos', ''.join(o))


def casita():
    o = [sh(64, 118, 52, 7)]
    o.append('<rect x="22" y="62" width="84" height="52" fill="url(#w)" stroke="#5a3a1a" stroke-width="1.4"/>')
    for x in range(30, 106, 14):
        o.append(f'<path d="M{x} 62 L{x} 114" stroke="#7a5026" stroke-width=".8" opacity=".6"/>')
    o.append('<path d="M12 66 L64 22 L116 66Z" fill="url(#r)" stroke="#1a6a8a" stroke-width="1.6"/><path d="M64 22 L64 66" stroke="#fff" stroke-width="1.4" opacity=".6"/>' + gloss(48, 44, 16, 5, -35, .6))
    o.append('<rect x="52" y="82" width="22" height="32" rx="3" fill="#8be0ff" stroke="#1a6a8a" stroke-width="1.2" opacity=".92"/><path d="M52 98 L74 98" stroke="#fff" stroke-width="1"/>' + '<rect x="30" y="76" width="16" height="16" rx="2" fill="#bff0ff" stroke="#5a3a1a" stroke-width="1.1"/><rect x="84" y="76" width="16" height="16" rx="2" fill="#bff0ff" stroke="#5a3a1a" stroke-width="1.1"/>')
    o.append('<circle cx="64" cy="46" r="5" fill="#fff6c8" stroke="#1a6a8a" stroke-width="1"/>')
    save('casita', ''.join(o), lg('w', '#f0cc90', '#b88444') + lg('r', '#6ad8f0', '#1a8ab8'))


def molino():
    o = [sh(64, 118, 28, 5)]
    o.append('<path d="M46 116 L52 54 L76 54 L82 116Z" fill="url(#w)" stroke="#6a7a82" stroke-width="1.4"/><path d="M48 50 L80 50 L64 36Z" fill="#ff8aa8" stroke="#a03a60" stroke-width="1.2"/>')
    o.append('<rect x="58" y="92" width="12" height="24" rx="6" fill="#8be0ff" stroke="#3a6a82" stroke-width="1"/>')
    for k in range(4):
        a = k * 90 + 20
        o.append(f'<g transform="rotate({a} 64 44)"><path d="M62 44 L62 4 L74 6 L66 44Z" fill="#fff" stroke="#6a7a82" stroke-width="1.2" opacity=".95"/><path d="M63 12 L63 40" stroke="#8be0ff" stroke-width="2" opacity=".6"/></g>')
    o.append('<circle cx="64" cy="44" r="5" fill="#ffd21a" stroke="#a07a00" stroke-width="1"/>')
    save('molino', ''.join(o), lg('w', '#f4f8f8', '#b4c4cc', None, False))


def picnic():
    o = [sh(64, 118, 50, 6, .26)]
    o.append('<path d="M12 78 L116 78 L108 90 L20 90Z" fill="url(#c)" stroke="#a03a4a" stroke-width="1.2"/>')
    for x in range(20, 112, 16):
        o.append(f'<path d="M{x} 78 L{x - 4} 90" stroke="#fff" stroke-width="5" opacity=".85"/>')
    o.append('<path d="M30 90 L24 116 M98 90 L104 116" stroke="#7a5a2a" stroke-width="4" stroke-linecap="round"/>')
    o.append('<circle cx="46" cy="72" r="6" fill="#ffd27a" stroke="#c4561a" stroke-width="1"/><rect x="74" y="64" width="14" height="14" rx="3" fill="#bff0ff" stroke="#3a7a92" stroke-width="1"/>')
    o.append('<path d="M64 78 L64 6" stroke="#7a5a2a" stroke-width="3"/><path d="M20 30 Q64 -8 108 30Z" fill="url(#c)" stroke="#a03a4a" stroke-width="1.4"/>' + gloss(48, 18, 14, 4, -20, .55))
    save('picnic', ''.join(o), lg('c', '#ff8aa4', '#e04a6a', None, False))


def arcoiris():
    o = [sh(64, 118, 52, 5, .16)]
    cols = ['#ff6a6a', '#ffb04a', '#ffe85a', '#7ad86a', '#5ab8ff', '#9a7aff']
    for i, c in enumerate(cols):
        rr = 56 - i * 6
        o.append(f'<path d="M{64 - rr} 112 A{rr} {rr} 0 0 1 {64 + rr} 112" fill="none" stroke="{c}" stroke-width="6.4" opacity=".85"/>')
    o.append('<ellipse cx="14" cy="112" rx="14" ry="7" fill="#fff" opacity=".85"/><ellipse cx="114" cy="112" rx="14" ry="7" fill="#fff" opacity=".85"/><ellipse cx="22" cy="108" rx="10" ry="6" fill="#fff"/><ellipse cx="106" cy="108" rx="10" ry="6" fill="#fff"/>')
    save('arcoiris', ''.join(o))


def estatua():
    o = [sh(64, 118, 30, 5)]
    o.append('<path d="M38 116 L40 96 L88 96 L90 116Z" fill="url(#m)" stroke="#6a7a8a" stroke-width="1.2"/>')
    o.append('<path d="M64 12 C80 30 100 40 64 92 C28 40 48 30 64 12Z" fill="url(#c)" stroke="#2a7ab0" stroke-width="1.4"/><path d="M64 12 L64 92 M64 40 L44 50 M64 40 L84 50" stroke="#fff" stroke-width="1.2" opacity=".7"/>' + gloss(54, 40, 8, 16, -15, .7))
    save('estatua', ''.join(o), lg('m', '#f4f8fa', '#aebcc6') + rg('c', '#d6f6ff', '#3aa0d8'))


def nenufar():
    o = ['<ellipse cx="64" cy="84" rx="50" ry="14" fill="#1a5a7a" opacity=".22"/>']
    o.append('<path d="M64 80 L116 74 A52 18 0 1 1 64 62Z" fill="url(#l)" stroke="#245a1c" stroke-width="1.2"/>')
    o.append('<ellipse cx="64" cy="76" rx="50" ry="16" fill="none" stroke="#fff" stroke-width="1" opacity=".5"/>')
    for k in range(7):
        a = k * math.pi / 3.5 + .3
        o.append(f'<path d="M{64 + math.cos(a) * 12:.1f} {76 + math.sin(a) * 4:.1f}" />')
    for dx, dy, s in ((-8, -10, 1), (10, -8, .85), (0, -14, .8)):
        o.append(f'<path d="M{64 + dx} {76 + dy / 2} q-10 -14 0 -26 q10 12 0 26z" fill="#ffb4d0" stroke="#c04a80" stroke-width="1" transform="rotate({dx * 3} {64 + dx} {76})"/>')
    o.append('<circle cx="64" cy="64" r="4" fill="#ffe27a"/>' + gloss(44, 70, 10, 2.4, -10, .5))
    save('nenufar', ''.join(o), rg('l', '#9ae05a', '#2f7a28'))


def velero():
    o = ['<ellipse cx="64" cy="104" rx="46" ry="8" fill="#1a5a7a" opacity=".25"/>']
    o.append('<path d="M20 90 L108 90 L96 106 L32 106Z" fill="url(#h)" stroke="#a03a4a" stroke-width="1.4"/><path d="M64 90 L64 14" stroke="#7a5a2a" stroke-width="3"/>')
    o.append('<path d="M68 18 Q106 50 100 86 L68 86Z" fill="#fff" stroke="#4a7a92" stroke-width="1.2"/><path d="M60 26 Q30 52 28 86 L60 86Z" fill="#bff0ff" stroke="#4a7a92" stroke-width="1.2"/><path d="M64 14 L82 20 L64 26Z" fill="#ff7a8a" stroke="#a02a3a" stroke-width=".8"/>')
    o.append('<path d="M24 108 q10 -5 20 0 t20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="2.4" opacity=".85"/>')
    save('velero', ''.join(o), lg('h', '#ff8aa4', '#d9486a'))


def medusa():
    o = ['<ellipse cx="64" cy="108" rx="30" ry="6" fill="#1a5a7a" opacity=".2"/>']
    o.append('<path d="M24 66 C24 24 104 24 104 66 Q96 72 88 66 Q80 74 72 66 Q64 74 56 66 Q48 74 40 66 Q32 72 24 66Z" fill="url(#m)" stroke="#7a4ac0" stroke-width="1.4" opacity=".92"/>')
    for x in (38, 52, 64, 76, 90):
        o.append(f'<path d="M{x} 68 q-5 12 0 22 t0 20" fill="none" stroke="#c9a0ff" stroke-width="2.2" opacity=".8" stroke-linecap="round"/>')
    o.append(gloss(48, 42, 14, 6, -30, .7) + '<circle cx="64" cy="48" r="9" fill="#fff" opacity=".25"/>')
    save('medusa', ''.join(o), rg('m', '#f4e4ff', '#a070f0'))


def delfin():
    o = ['<ellipse cx="64" cy="108" rx="40" ry="6" fill="#1a5a7a" opacity=".22"/>']
    o.append('<path d="M10 84 Q30 40 76 50 Q104 54 118 38 Q114 66 96 78 Q112 84 118 100 Q96 92 70 92 Q40 100 10 84Z" fill="url(#d)" stroke="#2a5a8a" stroke-width="1.4"/>')
    o.append('<path d="M52 52 Q60 26 78 22 Q74 40 70 54Z" fill="#4a90d0" stroke="#2a5a8a" stroke-width="1.2"/><path d="M14 84 Q40 96 76 90 Q54 100 14 84Z" fill="#fff" opacity=".85"/>')
    o.append('<circle cx="26" cy="74" r="3" fill="#fff"/><circle cx="25.4" cy="74" r="1.6" fill="#111"/>' + gloss(52, 60, 16, 4, -12, .5))
    o.append('<path d="M6 100 q10 -5 20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="2.4" opacity=".85"/>')
    save('delfin', ''.join(o), lg('d', '#9ad8ff', '#3a80c8'))


def boya():
    o = ['<ellipse cx="64" cy="104" rx="30" ry="6" fill="#1a5a7a" opacity=".25"/>']
    o.append('<path d="M40 100 L44 56 L84 56 L88 100Z" fill="url(#b)" stroke="#a02a3a" stroke-width="1.4"/><path d="M42 80 L86 80 L87 90 L41 90Z" fill="#fff" opacity=".9"/><path d="M44 56 Q64 40 84 56Z" fill="#ffe27a" stroke="#a07a00" stroke-width="1.2"/>')
    o.append('<path d="M64 40 L64 20" stroke="#4a5a62" stroke-width="3"/><circle cx="64" cy="16" r="6" fill="#ff6a6a" stroke="#a02a3a" stroke-width="1"/><circle cx="64" cy="16" r="12" fill="#ff6a6a" opacity=".18"/>' + gloss(52, 66, 4, 9, 8, .55))
    o.append('<path d="M30 104 q9 -5 17 0 t17 0 t17 0 t17 0" fill="none" stroke="#fff" stroke-width="2.4" opacity=".85"/>')
    save('boya', ''.join(o), lg('b', '#ff8a8a', '#d9484a', None, False))


for f in (girasol, arbusto, banco, farol, globo, burbuja, columpio, hongos, casita, molino, picnic, arcoiris, estatua, nenufar, velero, medusa, delfin, boya):
    f()
print('ok')
