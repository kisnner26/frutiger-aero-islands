import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { tr } from '../../i18n';
import { BrandOrb } from '../../ui/Brand';
import { MEDALS, levelOf, loadProgress, missionDef, type Outcome } from './progress';
import './battle-result.css';

/** copa de cristal con corona: el símbolo de la victoria. */
function Trophy({ won, place }: { won: boolean; place: number }) {
  if (!won) {
    return (
      <div className="br-orb" aria-hidden="true">
        <BrandOrb size={96} />
        <b>{place}</b>
      </div>
    );
  }
  return (
    <svg className="br-trophy" viewBox="0 0 160 190" width="168" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="trc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7c2" /><stop offset=".45" stopColor="#ffd23a" /><stop offset="1" stopColor="#d88a00" /></linearGradient>
        <linearGradient id="trg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".85" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <clipPath id="trclip"><path d="M36 44 H124 C124 96 108 124 80 124 C52 124 36 96 36 44 Z M44 150 H116 L110 174 H50 Z M70 124 H90 V152 H70 Z M52 38 L60 14 L72 30 L80 8 L88 30 L100 14 L108 38 Z" /></clipPath>
        <radialGradient id="trb" cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#f2ffff" /><stop offset=".5" stopColor="#6fd6ff" /><stop offset="1" stopColor="#0a4a98" /></radialGradient>
      </defs>
      <path d="M44 150 H116 L110 174 H50 Z" fill="url(#trc)" stroke="#a86a00" strokeWidth="2" />
      <rect x="70" y="124" width="20" height="28" rx="4" fill="url(#trc)" stroke="#a86a00" strokeWidth="2" />
      <path d="M36 44 H124 C124 96 108 124 80 124 C52 124 36 96 36 44 Z" fill="url(#trc)" stroke="#a86a00" strokeWidth="3" />
      <path d="M36 56 C8 56 8 92 40 98 M124 56 C152 56 152 92 120 98" fill="none" stroke="url(#trc)" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="62" cy="62" rx="14" ry="30" fill="url(#trg)" transform="rotate(14 62 62)" />
      <circle cx="80" cy="76" r="19" fill="url(#trb)" stroke="#fff" strokeWidth="2.5" />
      <path d="M80 62 l5 10 11 1.6 -8 7.6 2 11 -10 -5.4 -10 5.4 2 -11 -8 -7.6 11 -1.6z" fill="#fff" opacity=".95" />
      <path d="M52 38 L60 14 L72 30 L80 8 L88 30 L100 14 L108 38 Z" fill="url(#trc)" stroke="#a86a00" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="80" cy="10" r="4.5" fill="#fff" stroke="#a86a00" strokeWidth="1.5" />
      <g clipPath="url(#trclip)"><rect className="br-sheen" x="-40" y="0" width="16" height="190" fill="rgba(255,255,255,.55)" transform="skewX(-20)" /></g>
    </svg>
  );
}

/** confeti y fuegos artificiales de burbujas de cristal. */
function Celebration({ strong }: { strong: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const size = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    interface P { x: number; y: number; vx: number; vy: number; r: number; hue: number; life: number; kind: 0 | 1 | 2; rot: number; vr: number; g: number }
    const parts: P[] = [];
    const burst = (cx: number, cy: number, n: number) => {
      const hue0 = Math.random() * 360;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const s = 140 + Math.random() * 260;
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 4 + Math.random() * 7, hue: (hue0 + Math.random() * 90) % 360, life: 1.6 + Math.random() * 0.8, kind: Math.random() < 0.3 ? 2 : 0, rot: 0, vr: 0, g: 160 });
      }
    };
    const rain = (n: number) => {
      for (let i = 0; i < n; i++) {
        parts.push({ x: Math.random() * w, y: -20 - Math.random() * h * 0.4, vx: (Math.random() - 0.5) * 60, vy: 70 + Math.random() * 120, r: 5 + Math.random() * 8, hue: Math.random() * 360, life: 6 + Math.random() * 3, kind: Math.random() < 0.55 ? 0 : 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, g: 10 });
      }
    };
    const rise = () => {
      parts.push({ x: Math.random() * w, y: h + 20, vx: (Math.random() - 0.5) * 20, vy: -(50 + Math.random() * 80), r: 6 + Math.random() * 16, hue: 195, life: 8, kind: 0, rot: 0, vr: 0, g: 0 });
    };
    const timers: number[] = [];
    if (strong) {
      rain(90);
      [0, 450, 900, 1500, 2300, 3200].forEach((t, i) => timers.push(window.setTimeout(() => burst(w * (0.2 + 0.6 * ((i * 0.37) % 1)), h * (0.22 + 0.2 * ((i * 0.53) % 1)), 46), t)));
      timers.push(window.setInterval(() => rain(6), 900));
    }
    const iv = window.setInterval(rise, strong ? 420 : 300);
    timers.push(iv);
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0 || p.y > h + 40 || p.y < -80) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.g > 100 ? 0.985 : 1;
        p.rot += p.vr * dt;
        ctx.globalAlpha = Math.min(1, p.life * 1.2);
        if (p.kind === 0) {
          const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.35, 0.5, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(255,255,255,.95)');
          g.addColorStop(0.5, `hsla(${p.hue},90%,75%,.55)`);
          g.addColorStop(1, `hsla(${p.hue},90%,60%,.35)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (p.kind === 1) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `hsl(${p.hue} 90% 62%)`;
          ctx.fillRect(-p.r, -p.r * 0.35, p.r * 2, p.r * 0.7);
          ctx.restore();
        } else {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            const rr = k % 2 ? p.r * 0.35 : p.r * 1.3;
            ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      timers.forEach((t) => {
        window.clearTimeout(t);
        window.clearInterval(t);
      });
    };
  }, [strong]);
  return <canvas ref={ref} className="br-celebration" aria-hidden="true" />;
}

function useCountUp(target: number, delayMs: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [target, delayMs, ms]);
  return v;
}

/** pantalla final: victoria con trofeo y fuegos de burbujas, o resumen suave si no ganaste; luego experiencia, premios, medallas y misiones. */
export function BattleResult({ outcome, onAgain, onMenu }: { outcome: Outcome; onAgain: () => void; onMenu: () => void }) {
  const { summary: s, won, xpGained, before, after, leveledUp, newMedals, lines, soles } = outcome;
  const total = useCountUp(soles, 1900);
  const [bar, setBar] = useState(before.level === after.level ? before.into / before.need : 0);
  useEffect(() => {
    const t = window.setTimeout(() => setBar(after.into / after.need), 1500);
    if (won) sfx.levelUp();
    else sfx.coin();
    if (leveledUp) window.setTimeout(() => sfx.levelUp(), 2200);
    return () => window.clearTimeout(t);
  }, [after.into, after.need, won, leveledUp]);
  const mm = String(Math.floor(s.seconds / 60)).padStart(1, '0');
  const ss = String(Math.round(s.seconds % 60)).padStart(2, '0');
  const missions = loadProgress().missions;
  return (
    <main className={`br${won ? ' br--win' : ''}`} role="dialog" aria-label={won ? tr('victoria', 'victory') : tr('resultado', 'result')}>
      <div className="br__rays" aria-hidden="true" />
      <Celebration strong={won} />
      <div className="br__scroll">
        <section className="br__hero">
          <Trophy won={won} place={s.placement} />
          <h1 className="br__title">{won ? tr('¡victoria!', 'victory!') : `${tr('puesto', 'place')} ${s.placement} ${tr('de', 'of')} ${s.players}`}</h1>
          <p className="br__sub">{won ? tr('campeón de la arena aero', 'champion of the aero arena') : s.placement <= 3 ? tr('¡al podio por poco!', 'so close to the top!') : tr('la próxima será tuya', 'next one is yours')}</p>
        </section>

        <ul className="br__chips">
          {s.mode === 'royale' ? <li><b>{s.kills}</b>{tr('bajas', 'pops')}</li> : <li><b>{s.mass}</b>{tr('masa', 'mass')}</li>}
          {s.mode === 'royale' ? <li><b>x{s.bestCombo}</b>{tr('mejor combo', 'best combo')}</li> : <li><b>{s.ate}</b>{tr('comidas', 'eaten')}</li>}
          <li><b>{mm}:{ss}</b>{tr('tiempo', 'time')}</li>
          <li><b>{s.powers}</b>{tr('poderes', 'pickups')}</li>
        </ul>

        <section className="br__card br__xp" style={{ ['--i' as string]: 1 }}>
          <div className="br__rank"><BrandOrb size={40} /><div><strong>{tr('rango', 'rank')} {after.name}</strong><small>{tr('nivel', 'level')} {after.level} · +{xpGained} xp</small></div></div>
          <div className="br__bar"><i style={{ width: `${Math.min(100, bar * 100)}%` }} /></div>
          {leveledUp && <div className="br__levelup">{tr('¡subiste de nivel!', 'level up!')} {tr('nivel', 'level')} {after.level} · {after.name}</div>}
        </section>

        <section className="br__card" style={{ ['--i' as string]: 2 }}>
          <h2>{tr('premios', 'rewards')}</h2>
          <ul className="br__lines">
            {lines.map((l, i) => <li key={i} style={{ ['--j' as string]: i }}><span>{l.label}</span><b>+{l.soles}</b></li>)}
          </ul>
          <div className="br__total"><span className="br__coin" aria-hidden="true" /><strong>+{total}</strong><small>{tr('soles para tu isla', 'suns for your island')}</small></div>
        </section>

        {newMedals.length > 0 && (
          <section className="br__card" style={{ ['--i' as string]: 3 }}>
            <h2>{tr('medallas nuevas', 'new medals')}</h2>
            <ul className="br__medals">
              {newMedals.map((m, i) => <li key={m.id} style={{ ['--j' as string]: i }}><i aria-hidden="true">★</i><strong>{m.name}</strong><small>{m.desc}</small></li>)}
            </ul>
          </section>
        )}

        <section className="br__card" style={{ ['--i' as string]: 4 }}>
          <h2>{tr('misiones de hoy', "today's missions")}</h2>
          <ul className="br__missions">
            {missions.map((ms) => {
              const def = missionDef(ms.id);
              return <li key={ms.id} className={ms.done ? 'is-done' : ''}><span>{ms.done ? '✓ ' : ''}{tr(def.text[0], def.text[1])}</span><em>{ms.done ? `+${def.reward}` : `${Math.min(ms.progress, def.goal)}/${def.goal}`}</em></li>;
            })}
          </ul>
        </section>

        <div className="br__actions">
          <button type="button" className="vista-button vista-button--primary" onClick={onAgain}>{tr('jugar otra vez', 'play again')}</button>
          <button type="button" className="vista-button" onClick={onMenu}>{tr('menú', 'menu')}</button>
        </div>
      </div>
    </main>
  );
}

/** rango, experiencia, medallas y misiones del día, para los menús. */
export function ProgressCard() {
  const p = loadProgress();
  const lv = levelOf(p.xp);
  return (
    <section className="pc" aria-label={tr('tu progreso', 'your progress')}>
      <div className="br__rank"><BrandOrb size={34} /><div><strong>{tr('rango', 'rank')} {lv.name}</strong><small>{tr('nivel', 'level')} {lv.level} · {lv.into}/{lv.need} xp</small></div></div>
      <div className="br__bar"><i style={{ width: `${Math.min(100, (lv.into / lv.need) * 100)}%` }} /></div>
      <p className="pc__stats">{tr('victorias', 'wins')} {p.wins} · {tr('partidas', 'matches')} {p.matches} · {tr('racha', 'streak')} {p.streak} · {tr('mejor combo', 'best combo')} x{p.bestCombo}</p>
      <ul className="pc__medals">
        {MEDALS.map((m) => <li key={m.id} className={p.medals.includes(m.id) ? 'is-on' : ''} title={`${m.name}: ${m.desc}`}>★</li>)}
      </ul>
      <ul className="br__missions">
        {p.missions.map((ms) => {
          const def = missionDef(ms.id);
          return <li key={ms.id} className={ms.done ? 'is-done' : ''}><span>{ms.done ? '✓ ' : ''}{tr(def.text[0], def.text[1])}</span><em>{ms.done ? `+${def.reward}` : `${Math.min(ms.progress, def.goal)}/${def.goal}`}</em></li>;
        })}
      </ul>
    </section>
  );
}
