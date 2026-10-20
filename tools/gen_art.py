"""genera las ilustraciones svg originales (sin recursos externos) de public/assets.
uso: python3 tools/gen_art.py"""
import math, random, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')


def hexmix(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(round(a[i] + (b[i] - a[i]) * max(0, min(1, t))) for i in range(3))


def svg(body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs>{defs}</defs>{body}</svg>'


def write(path, content):
    p = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w').write(content)


def shadow(cx=64, cy=118, rx=34, ry=6, op=.3):
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#16301f" opacity="{op}"/>'
            f'<ellipse cx="{cx}" cy="{cy - .5}" rx="{rx * .6}" ry="{ry * .6}" fill="#0f2418" opacity="{op * .8}"/>')


def bez(p0, p1, p2, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def bez_tan(p0, p1, p2, t):
    return (2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]))


def tufts(r, cx, y, width, n, hmin=5, hmax=13):
    """briznas de hierba en la base para que el objeto se integre con el suelo."""
    out = []
    for _ in range(n):
        x = cx + r.uniform(-width / 2, width / 2)
        h = r.uniform(hmin, hmax)
        lean = r.uniform(-4, 4)
        col = hexmix('#2c6a24', '#a6dc5a', r.random())
        out.append(f'<path d="M{x - 1:.1f} {y + r.uniform(-1, 2):.1f} Q{x + lean * .4:.1f} {y - h * .6:.1f} {x + lean:.1f} {y - h:.1f} Q{x + lean * .3 + 1:.1f} {y - h * .5:.1f} {x + 1:.1f} {y + 1:.1f}Z" fill="{col}" opacity=".95"/>')
    return ''.join(out)


# ---------------- palmera ----------------
def palmera():
    r = random.Random(11)
    out = [shadow(60, 118, 32, 6)]
    top = (60, 40)
    N = 30
    pts = [bez((62, 118), (75, 84), top, t / N) for t in range(N + 1)]
    wid = lambda i: 6.8 - 3.2 * (i / N)
    left = [(x - wid(i), y) for i, (x, y) in enumerate(pts)]
    right = [(x + wid(i), y) for i, (x, y) in enumerate(pts)]
    poly = ' '.join(f'{x:.1f},{y:.1f}' for x, y in left + right[::-1])
    out.append(f'<polygon points="{poly}" fill="url(#tr)"/>')
    for i in range(0, N, 1):
        (lx, ly), (rx, ry) = left[i], right[i]
        out.append(f'<path d="M{lx:.1f} {ly:.1f} Q{(lx + rx) / 2:.1f} {ly + 2.6:.1f} {rx:.1f} {ry:.1f}" fill="none" stroke="#4a2c12" stroke-width="{.9 if i % 2 else .6}" opacity=".7"/>')
    for _ in range(40):
        i = r.randrange(0, N)
        t = r.random()
        x = left[i][0] + (right[i][0] - left[i][0]) * t
        out.append(f'<path d="M{x:.1f} {left[i][1]:.1f} l{r.uniform(-.6, .6):.1f} {r.uniform(2, 4):.1f}" stroke="{"#e0b078" if t < .4 else "#3a2210"}" stroke-width=".6" opacity=".6"/>')
    out.append(f'<polyline points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in left)}" fill="none" stroke="#e8c088" stroke-width="1.2" opacity=".5"/>')
    # frondas colgantes secas
    for ang in (-150, -30):
        a = math.radians(ang)
        out.append(f'<path d="M{top[0]} {top[1] + 3} Q{top[0] + math.cos(a) * 18:.1f} {top[1] + 6:.1f} {top[0] + math.cos(a) * 20:.1f} {top[1] + 24:.1f}" fill="none" stroke="#8a6a2a" stroke-width="2.4" stroke-linecap="round"/>')
    fronds = [(-188, 40), (-160, 46), (-130, 44), (-100, 42), (-74, 40), (-48, 46), (-20, 44), (8, 40), (30, 34)]
    for idx, (ang, L) in enumerate(fronds):
        a = math.radians(ang)
        p0 = top
        end = (top[0] + math.cos(a) * L, top[1] + math.sin(a) * L * .55 + 18 + abs(math.cos(a)) * 6)
        ctrl = (top[0] + math.cos(a) * L * .55, top[1] + math.sin(a) * L * .9 - 12)
        back = idx % 2 == 0
        for t in [i / 22 for i in range(2, 23)]:
            px, py = bez(p0, ctrl, end, t)
            tx, ty = bez_tan(p0, ctrl, end, t)
            n = math.hypot(tx, ty) or 1
            tx, ty = tx / n, ty / n
            for side in (-1, 1):
                ll = (L * .27) * (1 - .6 * t) + r.uniform(-1.2, 1.2)
                nx, ny = -ty * side, tx * side
                ex, ey = px + nx * ll + tx * ll * .5, py + ny * ll + ty * ll * .5 + ll * .45
                base = '#1f5e22' if back else '#2f7a2a'
                light = '#7fc040' if back else '#b4e868'
                col = hexmix(base, light, r.uniform(.1, .7) * (1 - t * .25) + (.28 if ny < 0 else 0))
                out.append(f'<path d="M{px:.1f} {py:.1f} Q{(px + ex) / 2 + 1:.1f} {(py + ey) / 2 - 1.2:.1f} {ex:.1f} {ey:.1f} Q{(px + ex) / 2:.1f} {(py + ey) / 2 + 1.4:.1f} {px + tx * 2.6:.1f} {py + ty * 2.6:.1f}Z" fill="{col}"/>')
        rib = ' '.join(f'{bez(p0, ctrl, end, t / 16)[0]:.1f},{bez(p0, ctrl, end, t / 16)[1]:.1f}' for t in range(17))
        out.append(f'<polyline points="{rib}" fill="none" stroke="{"#2e6a28" if back else "#4a8a30"}" stroke-width="1.2" stroke-linecap="round"/>')
    for dx, dy in [(-5, 5), (3, 7), (-1, 11), (6, 4)]:
        out.append(f'<circle cx="{top[0] + dx}" cy="{top[1] + dy}" r="4" fill="url(#co)"/><ellipse cx="{top[0] + dx - 1}" cy="{top[1] + dy - 1.4}" rx="1.4" ry="1" fill="#f4dca8" opacity=".8"/>')
    out.append(tufts(r, 62, 118, 28, 18))
    defs = ('<linearGradient id="tr" x1="0" x2="1"><stop offset="0" stop-color="#d09a5a"/><stop offset=".45" stop-color="#9a6a34"/><stop offset="1" stop-color="#4e3016"/></linearGradient>'
            '<radialGradient id="co" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#c8a060"/><stop offset="1" stop-color="#4a3018"/></radialGradient>')
    write('decorations/palmera.svg', svg(''.join(out), defs))


# ---------------- arbol ----------------
def arbol():
    r = random.Random(5)
    out = [shadow(64, 118, 38, 7)]
    # raíces y tronco
    out.append('<path d="M50 118 Q56 108 57 94 L58 72 L70 72 L71 94 Q73 108 80 118 Q66 113 50 118Z" fill="url(#tr)"/>')
    for k in range(16):
        x = 55 + k * 1.2
        out.append(f'<path d="M{x:.1f} 116 Q{x + r.uniform(-1, 1):.1f} 96 {x + r.uniform(-.5, .5):.1f} 74" fill="none" stroke="{"#3a2210" if k % 3 else "#d8a468"}" stroke-width=".7" opacity=".55"/>')
    out.append('<path d="M62 84 Q48 74 40 58 M67 82 Q82 72 92 56 M64 80 Q62 62 58 46" fill="none" stroke="#5a3a1c" stroke-width="3.6" stroke-linecap="round"/>')
    lobes = [(64, 40, 24), (38, 52, 20), (90, 52, 20), (52, 26, 18), (78, 28, 18), (64, 60, 18)]
    light = (-.6, -.8)
    blobs = []
    for lx, ly, lr in lobes:
        for _ in range(34):
            a = r.uniform(0, math.tau)
            d = math.sqrt(r.uniform(0, 1))
            x = lx + math.cos(a) * d * lr * 1.15
            y = ly + math.sin(a) * d * lr * .95
            nx, ny = (x - lx) / lr, (y - ly) / lr
            lit = (nx * light[0] + ny * light[1]) * .5 + .5
            blobs.append((y, x, r.uniform(5.5, 10), lit))
    for y, x, rad, lit in sorted(blobs, key=lambda b: b[0], reverse=True):
        h = 1 - (y - 10) / 70
        col = hexmix('#1e5420', '#92d04e', lit * .62 + h * .32 + r.uniform(-.1, .1))
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rad:.1f}" fill="{col}" opacity=".98"/>')
    for _ in range(300):
        lx, ly, lr = r.choice(lobes)
        a = r.uniform(0, math.tau)
        d = math.sqrt(r.uniform(0, 1))
        x, y = lx + math.cos(a) * d * lr * 1.1, ly + math.sin(a) * d * lr * .9
        nx, ny = (x - lx) / lr, (y - ly) / lr
        lit = (nx * light[0] + ny * light[1]) * .5 + .5
        col = hexmix('#17441a', '#d0ee7c', lit * .9 + r.uniform(-.2, .2))
        out.append(f'<path d="M{x:.1f} {y:.1f} q{r.uniform(-3, 3):.1f} {r.uniform(-4, -1):.1f} {r.uniform(-4, 4):.1f} {r.uniform(-6, -2):.1f}" stroke="{col}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".85"/>')
    for _ in range(14):
        lx, ly, lr = r.choice(lobes)
        a = r.uniform(math.pi * 1.1, math.pi * 1.8)
        d = r.uniform(.3, .9)
        out.append(f'<circle cx="{lx + math.cos(a) * d * lr:.1f}" cy="{ly + math.sin(a) * d * lr * .8:.1f}" r="{r.uniform(1.4, 3):.1f}" fill="#f6ffc0" opacity=".7"/>')
    for _ in range(9):
        out.append(f'<circle cx="{r.uniform(40, 90):.1f}" cy="{r.uniform(50, 66):.1f}" r="{r.uniform(1, 2):.1f}" fill="#0f2a12" opacity=".55"/>')
    out.append(tufts(r, 64, 118, 40, 22))
    defs = '<linearGradient id="tr" x1="0" x2="1"><stop offset="0" stop-color="#c58a4c"/><stop offset=".5" stop-color="#7a4e24"/><stop offset="1" stop-color="#3e2810"/></linearGradient>'
    write('decorations/arbol.svg', svg(''.join(out), defs))


# ---------------- flores ----------------
def daisy(cx, cy, rad, r):
    s = []
    n = 11
    rot = r.uniform(0, 30)
    for i in range(n):
        a = rot + i * 360 / n
        s.append(f'<ellipse cx="{cx}" cy="{cy - rad:.1f}" rx="{rad * .26:.1f}" ry="{rad:.1f}" transform="rotate({a:.0f} {cx} {cy})" fill="{"#ffffff" if i % 2 else "#eaf4ff"}" stroke="#9ab8d0" stroke-width=".4"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{rad * .38:.1f}" fill="#ffc01f" stroke="#a8700a" stroke-width=".5"/>')
    return ''.join(s)


def tulip(cx, cy, w, col, dark):
    return (f'<path d="M{cx - w} {cy - 2} Q{cx - w} {cy + w * 1.6} {cx} {cy + w * 1.7} Q{cx + w} {cy + w * 1.6} {cx + w} {cy - 2} L{cx + w * .5} {cy - w * .7} L{cx} {cy - 2} L{cx - w * .5} {cy - w * .7}Z" fill="{col}" stroke="{dark}" stroke-width=".6"/>'
            f'<path d="M{cx} {cy - 2} Q{cx - 1} {cy + w} {cx} {cy + w * 1.6}" stroke="{dark}" stroke-width=".5" fill="none" opacity=".7"/>')


def bell(cx, cy, w, col):
    return (f'<path d="M{cx - w} {cy + w * 1.4} Q{cx - w} {cy - w * .2} {cx} {cy - w * .2} Q{cx + w} {cy - w * .2} {cx + w} {cy + w * 1.4} Q{cx} {cy + w * 1.1} {cx - w} {cy + w * 1.4}Z" fill="{col}" stroke="#3a2a7a" stroke-width=".5"/>'
            f'<ellipse cx="{cx - w * .3}" cy="{cy + w * .4}" rx="{w * .25}" ry="{w * .5}" fill="#fff" opacity=".5"/>')


def flores():
    r = random.Random(3)
    out = [shadow(64, 117, 46, 7, .22)]
    for x in range(8, 122, 2):
        h = r.uniform(16, 46) * (1 - abs(x - 64) / 110)
        lean = r.uniform(-9, 9)
        out.append(f'<path d="M{x} 118 Q{x + lean * .4:.1f} {118 - h * .6:.1f} {x + lean:.1f} {118 - h:.1f}" fill="none" stroke="{hexmix("#1f5e22", "#a6dc5a", r.random())}" stroke-width="{r.uniform(1.1, 2):.1f}" stroke-linecap="round"/>')
    stems = [(24, 76, 'daisy', 8), (48, 56, 'tulip', 6), (66, 70, 'daisy', 10), (86, 52, 'bell', 5), (104, 78, 'tulip', 6), (38, 92, 'daisy', 6), (80, 94, 'bell', 4), (58, 100, 'tulip', 4)]
    cols = [('#ff5a7a', '#a0203a'), ('#ffb62b', '#a06a0a'), ('#ff7aa8', '#a02a5a')]
    for cx, cy, kind, size in stems:
        out.append(f'<path d="M{cx} {cy + 4} Q{cx + r.uniform(-4, 4):.1f} {cy + (118 - cy) * .5:.1f} {cx + r.uniform(-3, 3):.1f} 118" fill="none" stroke="#2c6a24" stroke-width="1.8" stroke-linecap="round"/>')
        out.append(f'<path d="M{cx} {cy + (118 - cy) * .55:.1f} q6 -4 9 -10 q-7 2 -9 10Z" fill="#4a9a34" stroke="#2a6a24" stroke-width=".4"/>')
        if kind == 'daisy':
            out.append(daisy(cx, cy, size, r))
        elif kind == 'tulip':
            c = r.choice(cols)
            out.append(tulip(cx, cy, size, c[0], c[1]))
        else:
            for k in range(3):
                out.append(bell(cx + (k - 1) * size * 1.5, cy + abs(k - 1) * size, size * .8, '#7a8cff' if k != 1 else '#9aaaff'))
    for x, y in ((14, 112), (112, 111), (30, 114)):
        out.append(f'<g fill="#3f8a2c" stroke="#245a1c" stroke-width=".4"><circle cx="{x}" cy="{y}" r="3"/><circle cx="{x + 4}" cy="{y + 1}" r="3"/><circle cx="{x + 2}" cy="{y - 3}" r="3"/></g>')
    out.append(tufts(r, 64, 119, 100, 26, 4, 10))
    write('decorations/flores.svg', svg(''.join(out)))


# ---------------- roca ----------------
def roca():
    r = random.Random(8)
    out = [shadow(62, 117, 48, 8, .34)]
    facets = [
        ('18,112 16,78 36,62 50,86 40,112', '#7f98a6'),
        ('36,62 62,46 84,60 70,84 50,86', '#e9f1f4'),
        ('62,46 90,52 106,78 84,60', '#c2d2da'),
        ('84,60 106,78 110,112 92,112 70,84', '#5c7886'),
        ('50,86 70,84 92,112 40,112', '#9db2be'),
    ]
    for pts, col in facets:
        out.append(f'<polygon points="{pts}" fill="{col}" stroke="#3a4f5a" stroke-width=".8" stroke-linejoin="round"/>')
    for _ in range(46):
        x, y = r.uniform(20, 104), r.uniform(50, 112)
        out.append(f'<path d="M{x:.1f} {y:.1f} l{r.uniform(-5, 5):.1f} {r.uniform(1, 5):.1f}" stroke="#30444f" stroke-width=".5" opacity=".5"/>')
    out.append('<path d="M62 46 L56 66 L66 80 M84 60 L78 76 M36 62 L42 80" stroke="#26363f" stroke-width=".9" fill="none" opacity=".7"/>')
    out.append('<path d="M30 72 Q40 60 56 66 Q50 74 44 82 Q34 82 30 72Z" fill="#6aa83e" opacity=".9"/><path d="M34 70 Q42 64 52 67" stroke="#c4ec7a" stroke-width="1.4" fill="none" opacity=".8"/>')
    out.append('<ellipse cx="102" cy="114" rx="8" ry="5" fill="#a8bcc6" stroke="#4a5f6a" stroke-width=".7"/><ellipse cx="14" cy="115" rx="6" ry="4" fill="#9aaeba" stroke="#4a5f6a" stroke-width=".7"/>')
    out.append(tufts(r, 62, 117, 96, 20, 4, 10))
    write('decorations/roca.svg', svg(''.join(out)))


# ---------------- cristal ----------------
def cristal():
    r = random.Random(2)
    out = ['<ellipse cx="64" cy="114" rx="50" ry="12" fill="#7fe8ff" opacity=".35"/>', shadow(64, 118, 44, 7)]

    def prism(x0, x1, top, tip, base):
        mid = (x0 + x1) / 2
        w = x1 - x0
        out.append(f'<polygon points="{x0},{base} {x0 + 2},{top + 12} {mid - w * .2},{tip + 6} {mid},{tip} {mid + w * .2},{tip + 6} {x1 - 2},{top + 12} {x1},{base}" fill="#5cc8ec" stroke="#1e6a96" stroke-width="1.1" stroke-linejoin="round"/>')
        out.append(f'<polygon points="{x0},{base} {x0 + 2},{top + 12} {mid - w * .2},{tip + 6} {mid},{tip} {mid - 1},{base}" fill="#c8f6ff" opacity=".95"/>')
        out.append(f'<polygon points="{mid - 1},{base} {mid},{tip} {mid + w * .2},{tip + 6} {x1 - 2},{top + 12} {x1},{base}" fill="#2a8fcf" opacity=".9"/>')
        out.append(f'<polygon points="{mid - w * .2},{tip + 6} {mid},{tip} {mid + w * .2},{tip + 6} {mid},{top + 20}" fill="#ffffff" opacity=".8"/>')
        for k in range(4):
            y = base - (k + 1) * (base - top) / 5
            out.append(f'<path d="M{x0 + 1} {y:.1f} L{x1 - 1} {y - 3:.1f}" stroke="#ffffff" stroke-width=".6" opacity=".35"/>')
        out.append(f'<path d="M{x0 + 4} {base - 4} L{x0 + 6} {top + 18}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>')

    prism(86, 112, 76, 62, 116)
    prism(20, 40, 70, 56, 116)
    prism(60, 92, 56, 40, 116)
    prism(34, 74, 28, 10, 116)
    for x, y, s in ((24, 44, 5), (96, 36, 4), (110, 66, 3), (50, 8, 4)):
        out.append(f'<path d="M{x} {y - s} Q{x + 1} {y - 1} {x + s} {y} Q{x + 1} {y + 1} {x} {y + s} Q{x - 1} {y + 1} {x - s} {y} Q{x - 1} {y - 1} {x} {y - s}Z" fill="#fff" opacity=".95"/>')
    out.append(tufts(r, 64, 118, 100, 14, 3, 8))
    write('decorations/cristal.svg', svg(''.join(out)))


# ---------------- fuente ----------------
def fuente():
    r = random.Random(4)
    out = [shadow(64, 118, 54, 8)]
    stone = lambda x, y, w: f'<path d="M{x} {y} l{w} {r.uniform(-.8, .8):.1f}" stroke="#7a8a92" stroke-width=".6" opacity=".6"/>'
    out.append('<path d="M12 98 Q64 132 116 98 L110 114 Q64 134 18 114Z" fill="url(#pi)" stroke="#56666e" stroke-width="1"/>')
    for k in range(18):
        out.append(stone(18 + k * 5, 108 + 4 * math.sin(k / 3), 4))
    out.append('<ellipse cx="64" cy="98" rx="53" ry="16" fill="url(#pi)" stroke="#56666e" stroke-width="1"/>')
    out.append('<ellipse cx="64" cy="98" rx="44" ry="11" fill="url(#wa)" stroke="#3a8ab0" stroke-width=".8"/>')
    for k in range(5):
        out.append(f'<ellipse cx="{50 + k * 7}" cy="{99 + (k % 2) * 2}" rx="{6 - k % 3}" ry="1.6" fill="none" stroke="#fff" stroke-width=".9" opacity=".8"/>')
    out.append('<rect x="58" y="62" width="12" height="38" rx="4" fill="url(#pi)" stroke="#56666e" stroke-width="1"/>')
    out.append('<path d="M60 70 Q61 80 60 98" stroke="#fff" stroke-width="1.4" opacity=".6"/>')
    out.append('<ellipse cx="64" cy="64" rx="22" ry="7" fill="url(#pi)" stroke="#56666e" stroke-width="1"/>')
    out.append('<ellipse cx="64" cy="63" rx="17" ry="4.6" fill="url(#wa)"/>')
    for d in (-1, 1):
        for k, spread in enumerate((26, 18, 10)):
            out.append(f'<path d="M64 36 Q{64 + d * spread} {30 + k * 2} {64 + d * (spread + 8)} {82 - k * 6}" fill="none" stroke="#c8f4ff" stroke-width="{2.6 - k * .5:.1f}" stroke-linecap="round" opacity=".85"/>')
    out.append('<circle cx="64" cy="35" r="6.5" fill="#e6fbff" stroke="#5aa8c8" stroke-width="1"/><ellipse cx="62" cy="33" rx="2.4" ry="1.6" fill="#fff"/>')
    for _ in range(26):
        a = r.uniform(0, math.pi)
        d = r.uniform(18, 36)
        out.append(f'<circle cx="{64 + math.cos(a) * d * (1 if r.random() < .5 else -1):.1f}" cy="{40 + r.uniform(0, 40):.1f}" r="{r.uniform(.5, 1.4):.1f}" fill="#fff" opacity=".85"/>')
    out.append('<path d="M14 100 Q22 92 30 98 Q24 106 14 104Z" fill="#5aa03a" opacity=".85"/><path d="M96 104 Q106 96 114 101 Q108 108 98 107Z" fill="#5aa03a" opacity=".85"/>')
    out.append(tufts(r, 64, 119, 108, 22, 4, 9))
    defs = ('<linearGradient id="pi" x1="0" x2="1"><stop offset="0" stop-color="#f4f7f8"/><stop offset=".55" stop-color="#c3cfd4"/><stop offset="1" stop-color="#87979f"/></linearGradient>'
            '<linearGradient id="wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f6ff"/><stop offset="1" stop-color="#3cb8ea"/></linearGradient>')
    write('decorations/fuente.svg', svg(''.join(out), defs))


# ---------------- pabellon ----------------
def pabellon():
    r = random.Random(6)
    out = [shadow(64, 119, 56, 8)]
    out.append('<path d="M8 112 L120 112 L116 118 L12 118Z" fill="#d9ccae" stroke="#7a6a4a" stroke-width=".9"/><path d="M12 106 L116 106 L120 112 L8 112Z" fill="#ebdfc2" stroke="#7a6a4a" stroke-width=".9"/>')
    out.append('<rect x="18" y="64" width="92" height="42" fill="#dff7ff" opacity=".6"/>')
    out.append('<path d="M24 70 L44 100 M52 66 L82 104 M88 70 L102 90" stroke="#fff" stroke-width="2.2" opacity=".55"/>')
    for x in (18, 40, 64, 88, 110):
        out.append(f'<rect x="{x - 2}" y="64" width="4" height="42" fill="#f4f8f8" stroke="#8aa0aa" stroke-width=".6"/><rect x="{x - 3}" y="102" width="6" height="4" fill="#e0e6e8" stroke="#8aa0aa" stroke-width=".5"/>')
    out.append('<path d="M8 68 A56 56 0 0 1 120 68Z" fill="url(#cu)" stroke="#4a88a8" stroke-width="1.2"/>')
    for k in (-40, -22, -8, 8, 22, 40):
        out.append(f'<path d="M{64 + k} 68 Q{64 + k * .75:.1f} 34 64 14" fill="none" stroke="#f4f8f8" stroke-width="1.8" opacity=".95"/>')
    for k in range(5):
        y = 62 - k * 10
        w = 54 - k * 9
        out.append(f'<path d="M{64 - w} {y} Q64 {y - 7} {64 + w} {y}" fill="none" stroke="#f4f8f8" stroke-width="1.2" opacity=".8"/>')
    out.append('<path d="M6 68 L122 68 L120 72 L8 72Z" fill="#f0f4f4" stroke="#7a8a92" stroke-width=".8"/>')
    out.append('<ellipse cx="40" cy="38" rx="17" ry="7" fill="#fff" opacity=".7" transform="rotate(-32 40 38)"/><ellipse cx="92" cy="48" rx="6" ry="3" fill="#fff" opacity=".5" transform="rotate(30 92 48)"/>')
    out.append('<rect x="63" y="2" width="2" height="12" fill="#c9a84a"/><circle cx="64" cy="12" r="4" fill="#fff6c8" stroke="#c9a84a" stroke-width="1"/><path d="M65 3 L76 6 L65 9Z" fill="#ff7a8a" stroke="#a02a3a" stroke-width=".5"/>')
    for bx in (12, 112):
        out.append(f'<ellipse cx="{bx}" cy="106" rx="9" ry="7" fill="#3f8a2c" stroke="#245a1c" stroke-width=".6"/>')
        for _ in range(5):
            out.append(f'<circle cx="{bx + r.uniform(-6, 6):.1f}" cy="{104 + r.uniform(-4, 4):.1f}" r="1.5" fill="{r.choice(["#ff7aa8", "#fff", "#ffc01f"])}"/>')
    out.append(tufts(r, 64, 118, 112, 24, 3, 8))
    defs = '<radialGradient id="cu" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#bfeaf6" stop-opacity=".75"/><stop offset="1" stop-color="#4fa8d0" stop-opacity=".72"/></radialGradient>'
    write('decorations/pabellon.svg', svg(''.join(out), defs))


# ---------------- pez dorado ----------------
def pez():
    r = random.Random(9)
    out = [shadow(60, 116, 30, 4, .16)]
    # cola de velo
    for k, (dy, op) in enumerate(((-18, .9), (4, .95), (24, .85))):
        out.append(f'<path d="M88 80 Q108 {70 + dy * .6:.1f} 124 {62 + dy:.1f} Q112 {82 + dy * .4:.1f} 122 {98 + dy * .5:.1f} Q104 {90 + dy * .3:.1f} 88 84Z" fill="url(#fi)" stroke="#c4561a" stroke-width=".9" opacity="{op}"/>')
    for k in range(9):
        a = -.5 + k * .12
        out.append(f'<path d="M90 82 L{122 - abs(k - 4) * 1.2:.1f} {64 + k * 4.2:.1f}" stroke="#ffd7a0" stroke-width=".5" opacity=".7"/>')
    out.append('<path d="M40 60 Q56 36 82 62 Q66 66 40 64Z" fill="#ff8a3a" stroke="#c4561a" stroke-width=".9" opacity=".92"/>')
    for k in range(7):
        out.append(f'<path d="M{46 + k * 5} 63 L{50 + k * 5.6:.1f} {46 + abs(k - 3) * 2.2:.1f}" stroke="#ffd7a0" stroke-width=".5" opacity=".75"/>')
    out.append('<ellipse cx="60" cy="82" rx="38" ry="23" fill="url(#bo)" stroke="#b44a14" stroke-width="1.2"/>')
    for row in range(5):
        for i in range(8):
            x, y = 34 + i * 7.4 + (row % 2) * 3.7, 66 + row * 7.4
            if ((x - 60) / 36) ** 2 + ((y - 82) / 21) ** 2 < .9:
                out.append(f'<path d="M{x:.1f} {y:.1f} q3.6 5.2 7.4 0" fill="none" stroke="#b44a14" stroke-width=".7" opacity=".6"/><path d="M{x + 1:.1f} {y + .6:.1f} q2.6 3 5.4 0" fill="none" stroke="#ffe0a8" stroke-width=".5" opacity=".6"/>')
    out.append('<path d="M40 70 Q36 82 42 94" fill="none" stroke="#b44a14" stroke-width="1.2"/>')
    out.append('<path d="M50 90 Q60 108 80 98 Q68 92 50 90Z" fill="#ff9a4a" stroke="#c4561a" stroke-width=".9" opacity=".95"/><path d="M56 94 L72 99 M60 96 L74 101" stroke="#ffd7a0" stroke-width=".5"/>')
    out.append('<ellipse cx="52" cy="72" rx="20" ry="6" fill="#fff3d0" opacity=".55"/>')
    out.append('<circle cx="40" cy="78" r="4.6" fill="#fff4cc" stroke="#8a3a10" stroke-width=".8"/><circle cx="39.4" cy="78" r="2.5" fill="#1a1a1a"/><circle cx="38.6" cy="77" r=".9" fill="#fff"/>')
    out.append('<circle cx="31" cy="86" r="2" fill="none" stroke="#fff" stroke-width=".7" opacity=".9"/><circle cx="27" cy="80" r="1.4" fill="none" stroke="#fff" stroke-width=".7" opacity=".9"/>')
    defs = ('<linearGradient id="bo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#ff9a3a"/><stop offset="1" stop-color="#e65a1a"/></linearGradient>'
            '<linearGradient id="fi" x1="0" x2="1"><stop offset="0" stop-color="#ff9a3a"/><stop offset="1" stop-color="#ffd8a0"/></linearGradient>')
    write('decorations/pez.svg', svg(''.join(out), defs))


# ---------------- ambiente ----------------
def hoja():
    out = ['<path d="M64 114 C26 98 14 54 64 12 C114 54 102 98 64 114Z" fill="url(#le)" stroke="#3a6a22" stroke-width="1.6"/>',
           '<path d="M64 114 C44 90 40 50 64 12 C74 50 80 90 64 114Z" fill="#fff" opacity=".12"/>',
           '<path d="M64 114 L64 18" stroke="#3a6a22" stroke-width="2.2" fill="none"/>']
    for y in range(32, 104, 11):
        out.append(f'<path d="M64 {y + 10} Q{64 - 14} {y + 2} {64 - 26 + (y - 32) * .14:.1f} {y - 4} M64 {y + 10} Q{64 + 14} {y + 2} {64 + 26 - (y - 32) * .14:.1f} {y - 4}" stroke="#3a6a22" stroke-width="1" fill="none" opacity=".75"/>')
    defs = '<linearGradient id="le" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8f07a"/><stop offset=".6" stop-color="#6aae38"/><stop offset="1" stop-color="#2f6a24"/></linearGradient>'
    write('ui/hoja.svg', svg(''.join(out), defs))


def mariposa():
    out = []

    def wing(s):
        g = [f'<g transform="translate(64 64) scale({s} 1)">',
             '<path d="M0 -4 C16 -52 60 -52 56 -14 C54 4 24 6 0 2Z" fill="url(#wi)" stroke="#1d4a8a" stroke-width="1.4"/>',
             '<path d="M0 6 C24 8 48 22 42 46 C34 60 10 42 0 12Z" fill="url(#w2)" stroke="#1d4a8a" stroke-width="1.4"/>']
        for k in range(6):
            g.append(f'<path d="M2 -2 Q{14 + k * 7} {-34 + k * 7} {50 - k * 2} {-16 + k * 4}" stroke="#1d4a8a" stroke-width=".7" fill="none" opacity=".6"/>')
        g.append('<path d="M3 8 Q22 18 36 40" stroke="#1d4a8a" stroke-width=".7" fill="none" opacity=".6"/><path d="M3 10 Q20 26 20 46" stroke="#1d4a8a" stroke-width=".7" fill="none" opacity=".6"/>')
        g.append('<ellipse cx="34" cy="-22" rx="9" ry="6" fill="#fff" opacity=".75"/><circle cx="46" cy="-10" r="3" fill="#fff" opacity=".7"/><circle cx="30" cy="30" r="5" fill="#fff" opacity=".6"/><circle cx="22" cy="42" r="2.4" fill="#fff" opacity=".6"/>')
        g.append('</g>')
        return ''.join(g)

    out.append(wing(1) + wing(-1))
    out.append('<ellipse cx="64" cy="66" rx="3.6" ry="21" fill="#2a2a3a"/><path d="M62 46 Q56 30 46 26 M66 46 Q72 30 82 26" stroke="#2a2a3a" stroke-width="1.4" fill="none"/><circle cx="46" cy="26" r="1.6" fill="#2a2a3a"/><circle cx="82" cy="26" r="1.6" fill="#2a2a3a"/>')
    defs = ('<radialGradient id="wi" cx=".2" cy=".5" r=".9"><stop offset="0" stop-color="#d8f0ff"/><stop offset=".55" stop-color="#6aaef4"/><stop offset="1" stop-color="#2a5cc4"/></radialGradient>'
            '<radialGradient id="w2" cx=".2" cy=".3" r=".9"><stop offset="0" stop-color="#c8e8ff"/><stop offset="1" stop-color="#3a7ad8"/></radialGradient>')
    write('ui/mariposa.svg', svg(''.join(out), defs))


def burbujas():
    for name, c in (('burbuja', ('#d8fbff', '#5cc8ff', '#2a8fcf', '#ffb0f0', '#a8ffd0')), ('burbuja-dorada', ('#fff3a8', '#ffc83a', '#d8841a', '#ffd0a0', '#fff0a0'))):
        s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="b" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="{c[0]}" stop-opacity=".04"/><stop offset=".88" stop-color="{c[1]}" stop-opacity=".35"/><stop offset="1" stop-color="{c[2]}" stop-opacity=".7"/></radialGradient>'
             f'<linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c[3]}"/><stop offset=".5" stop-color="{c[4]}"/><stop offset="1" stop-color="{c[1]}"/></linearGradient></defs>'
             '<circle cx="32" cy="32" r="29" fill="url(#b)"/>'
             '<circle cx="32" cy="32" r="28" fill="none" stroke="url(#rb)" stroke-width="2.4" opacity=".85"/>'
             '<circle cx="32" cy="32" r="29.5" fill="none" stroke="#fff" stroke-width="1.2"/>'
             '<path d="M12 28 Q14 14 28 8" stroke="#fff" stroke-width="4.5" stroke-linecap="round" fill="none" opacity=".95"/>'
             '<path d="M40 54 Q50 50 55 40" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".6"/>'
             '<ellipse cx="46" cy="18" rx="3" ry="1.6" fill="#fff" opacity=".8" transform="rotate(-40 46 18)"/></svg>')
        write(f'ui/{name}.svg', s)


for f in (palmera, arbol, flores, roca, cristal, fuente, pabellon, pez, hoja, mariposa, burbujas):
    f()


# ---------------- peces de ambiente (miran a la izquierda) ----------------
def pez_payaso():
    out = []
    out.append('<path d="M92 64 Q116 44 122 54 Q116 64 122 76 Q114 86 92 66Z" fill="#ff7a1a" stroke="#1a1a1a" stroke-width="1.4"/>')
    out.append('<path d="M36 44 Q58 20 84 46 Q60 52 36 46Z" fill="#ff7a1a" stroke="#1a1a1a" stroke-width="1.2"/>')
    out.append('<ellipse cx="62" cy="66" rx="40" ry="24" fill="url(#c1)" stroke="#1a1a1a" stroke-width="1.4"/>')
    for x, w in ((46, 9), (70, 8), (90, 5)):
        out.append(f'<path d="M{x} 43 Q{x - 4} 66 {x} 89 L{x + w} 88 Q{x + w + 4} 66 {x + w} 44Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.2" opacity=".96"/>')
    out.append('<path d="M46 86 Q56 104 76 94 Q64 88 46 86Z" fill="#ff9a3a" stroke="#1a1a1a" stroke-width="1"/>')
    out.append('<ellipse cx="54" cy="54" rx="22" ry="6" fill="#fff" opacity=".45"/>')
    out.append('<circle cx="34" cy="62" r="4.6" fill="#fff6d8" stroke="#1a1a1a" stroke-width="1"/><circle cx="33.4" cy="62" r="2.6" fill="#111"/><circle cx="32.6" cy="61" r=".9" fill="#fff"/>')
    defs = '<linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb24a"/><stop offset=".5" stop-color="#ff7a1a"/><stop offset="1" stop-color="#d9480a"/></linearGradient>'
    write('ui/pez-payaso.svg', svg(''.join(out), defs))


def pez_azul():
    out = []
    out.append('<path d="M94 64 Q118 40 124 52 Q118 64 124 78 Q114 88 94 66Z" fill="#ffd21a" stroke="#14306a" stroke-width="1.2"/>')
    out.append('<path d="M30 44 Q60 14 96 50 Q66 54 30 48Z" fill="#2a6aff" stroke="#14306a" stroke-width="1.2"/>')
    out.append('<path d="M40 88 Q64 112 96 82 Q70 84 40 88Z" fill="#2a6aff" stroke="#14306a" stroke-width="1.2"/>')
    out.append('<ellipse cx="62" cy="66" rx="42" ry="26" fill="url(#c2)" stroke="#14306a" stroke-width="1.4"/>')
    out.append('<path d="M44 52 Q70 44 92 60 Q76 62 70 72 Q62 58 44 56Z" fill="#0e1e55" opacity=".9"/><path d="M48 70 Q62 64 82 76 Q66 84 48 78Z" fill="#0e1e55" opacity=".8"/>')
    out.append('<ellipse cx="52" cy="54" rx="24" ry="6" fill="#fff" opacity=".4"/>')
    out.append('<circle cx="32" cy="62" r="4.2" fill="#fff6d8" stroke="#14306a" stroke-width="1"/><circle cx="31.5" cy="62" r="2.4" fill="#111"/><circle cx="30.8" cy="61" r=".8" fill="#fff"/>')
    defs = '<linearGradient id="c2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ab4ff"/><stop offset=".5" stop-color="#2a6aff"/><stop offset="1" stop-color="#1a3aa8"/></linearGradient>'
    write('ui/pez-azul.svg', svg(''.join(out), defs))


pez_payaso()
pez_azul()

print('ok')
