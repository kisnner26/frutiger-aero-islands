import { useEffect, useState } from 'react';
import { islandHref, routeHref } from '../../app/useHashRoute';
import { loadTop100 } from '../../persistence/leaderboard';
import { isSupabaseConfigured } from '../../persistence/supabase';
import { MILESTONES, nextMilestone } from '../../story/lore';
import { useRestoration } from '../../world/restorationStore';

const KEY = 'frutiger-aero-islands:barra-lateral';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  const hand = (deg: number, len: number, w: number, color: string) => (
    <line x1="50" y1="50" x2={50 + Math.sin((deg * Math.PI) / 180) * len} y2={50 - Math.cos((deg * Math.PI) / 180) * len} stroke={color} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <svg viewBox="0 0 100 100" className="vsb__clock" role="img" aria-label={`reloj, ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`}>
      <defs>
        <radialGradient id="vsb-face" cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#bfe4f6" /></radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#vsb-face)" stroke="#5aa8d0" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={50 + Math.sin((i * 30 * Math.PI) / 180) * 38} y1={50 - Math.cos((i * 30 * Math.PI) / 180) * 38} x2={50 + Math.sin((i * 30 * Math.PI) / 180) * 43} y2={50 - Math.cos((i * 30 * Math.PI) / 180) * 43} stroke="#2a6a98" strokeWidth={i % 3 === 0 ? 3 : 1.4} />
      ))}
      {hand(h * 30, 22, 4, '#0a4a78')}
      {hand(m * 6, 32, 3, '#0a4a78')}
      {hand(s * 6, 36, 1.4, '#e0503a')}
      <circle cx="50" cy="50" r="3" fill="#0a4a78" />
      <ellipse cx="38" cy="30" rx="16" ry="7" fill="#fff" opacity=".55" transform="rotate(-30 38 30)" />
    </svg>
  );
}

/** barra lateral al estilo windows vista: reloj, estado del planeta, tu misión y los mejores de la semana. */
export function VistaSidebar({ mission }: { mission: string | null }) {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) !== '0';
    } catch {
      return true;
    }
  });
  const planet = useRestoration();
  const [top, setTop] = useState<Array<{ username: string; score: number }>>([]);
  useEffect(() => {
    if (!open || !isSupabaseConfigured) return;
    let alive = true;
    void loadTop100('semana').then((r) => alive && setTop(r.slice(0, 3))).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open]);
  const toggle = () => {
    setOpen((v) => {
      try {
        window.localStorage.setItem(KEY, v ? '0' : '1');
      } catch {
        /* sin almacenamiento */
      }
      return !v;
    });
  };
  const next = nextMilestone(planet);
  const prev = [...MILESTONES].reverse().find((m) => planet >= m.percent)?.percent ?? 0;
  const span = (next?.percent ?? 100) - prev;
  const ratio = next ? Math.min(1, (planet - prev) / span) : 1;
  return (
    <aside className={`vsb${open ? '' : ' is-closed'}`} aria-label="barra lateral">
      <button type="button" className="vsb__tab" onClick={toggle} aria-expanded={open} aria-label={open ? 'ocultar la barra lateral' : 'mostrar la barra lateral'}>
        {open ? '›' : '‹'}
      </button>
      {open && (
        <div className="vsb__body">
          <section className="vsb__gadget">
            <Clock />
          </section>
          <section className="vsb__gadget">
            <h3>planeta</h3>
            <strong>{planet.toFixed(planet < 10 ? 1 : 0)}% restaurado</strong>
            <i className="vsb__bar" aria-hidden="true"><b style={{ width: `${ratio * 100}%` }} /></i>
            <small>{next ? `próximo regalo a ${next.percent}%: ${next.reward}` : 'el planeta brilla otra vez'}</small>
            <a href={routeHref('mundo')}>ir a restaurar</a>
          </section>
          {mission && (
            <section className="vsb__gadget">
              <h3>tu misión</h3>
              <small>{mission}</small>
            </section>
          )}
          {isSupabaseConfigured && (
            <section className="vsb__gadget">
              <h3>mejores de la semana</h3>
              {top.length === 0 ? (
                <small>todavía nadie suma puntos</small>
              ) : (
                <ol>
                  {top.map((t) => (
                    <li key={t.username}>
                      <a href={islandHref(t.username)}>@{t.username}</a>
                      <b>{t.score}</b>
                    </li>
                  ))}
                </ol>
              )}
              <a href={routeHref('ranking')}>ver el top 100</a>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
