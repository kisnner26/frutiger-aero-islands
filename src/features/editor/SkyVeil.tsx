import { useEffect, useState } from 'react';
import { lightAt } from './lightCurve';

const now = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

/** velo suave que cambia con la hora real de quien juega: amanece, atardece y anochece sobre la isla. */
export function SkyVeil() {
  const [hour, setHour] = useState(now);
  useEffect(() => {
    const t = window.setInterval(() => setHour(now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const { rgb, alpha } = lightAt(hour);
  if (alpha < 0.01) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        background: `radial-gradient(ellipse at 50% 45%, rgba(${rgb.join(',')},${(alpha * 0.55).toFixed(3)}), rgba(${rgb.join(',')},${alpha.toFixed(3)}))`,
        mixBlendMode: 'multiply',
        transition: 'background 2s linear',
      }}
    />
  );
}
