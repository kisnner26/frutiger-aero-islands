import { useEffect, useState } from 'react';
import type { PublicIsland } from '../../persistence/supabase';
import './social.css';

/** tarjeta de llegada: aparece al entrar en la isla de otra persona y se retira sola. */
export function VisitBanner({ island }: { island: PublicIsland }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), 5200);
    return () => window.clearTimeout(t);
  }, [island.id]);
  if (!open) return null;
  return (
    <div className="visit-banner" role="status" aria-live="polite">
      <span className="visit-banner__orb" aria-hidden="true" />
      <div>
        <p>bienvenido a la isla de</p>
        <strong>{island.displayName}</strong>
        <small>@{island.username} · nivel {island.layout.maxLevel} · {island.layout.objects.length} objetos</small>
      </div>
      <button type="button" aria-label="cerrar" onClick={() => setOpen(false)}>×</button>
    </div>
  );
}
