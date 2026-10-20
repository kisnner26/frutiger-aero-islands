import { useState } from 'react';
import { REPORT_REASONS, reportUser, type ReportReason } from '../../persistence/safety';
import { readableSupabaseError } from '../../persistence/supabase';
import { AeroWindow } from '../../ui/AeroWindow';
import './legal.css';

/** botón "reportar" para la isla de otra persona: nombre ofensivo, contenido inapropiado, acoso o spam. */
export function ReportButton({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('contenido');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await reportUser(username, reason, note);
      setMsg({ text: 'gracias, recibimos tu reporte y lo revisaremos.' });
      setNote('');
    } catch (error) {
      setMsg({ text: readableSupabaseError(error, 'no se pudo enviar el reporte.'), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="report-btn" onClick={() => { setOpen(true); setMsg(null); }}>reportar</button>
      {open && (
        <AeroWindow className="win-report" title={`reportar a @${username}`} icon={<span className="mini-orb" />} onClose={() => setOpen(false)}>
          <form className="report" onSubmit={send}>
            <label>
              motivo
              <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                {REPORT_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label>
              nota (opcional)
              <textarea maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="cuéntanos qué pasó" />
            </label>
            {msg && <p className={`report__msg${msg.error ? ' is-error' : ''}`} role={msg.error ? 'alert' : 'status'}>{msg.text}</p>}
            <div className="report__actions">
              <button type="button" className="vista-button" onClick={() => setOpen(false)}>cerrar</button>
              <button className="vista-button vista-button--primary" disabled={busy}>{busy ? 'enviando...' : 'enviar reporte'}</button>
            </div>
          </form>
        </AeroWindow>
      )}
    </>
  );
}
