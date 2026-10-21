import { useEffect, useState } from 'react';
import type { PublicIsland } from '../../persistence/supabase';
import './social.css';
import { tr } from '../../i18n';

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
        <p>{tr('bienvenido a la isla de', 'welcome to the island of')}</p>
        <strong>{island.displayName}</strong>
        <small>@{island.username} · {tr('nivel', 'level')} {island.layout.maxLevel} · {island.layout.objects.length} {tr('objetos', 'objects')}</small>
      </div>
      <button type="button" aria-label={tr('cerrar', 'close')} onClick={() => setOpen(false)}>×</button>
    </div>
  );
}
