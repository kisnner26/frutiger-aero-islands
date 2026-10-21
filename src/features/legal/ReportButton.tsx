import { useState } from 'react';
import { REPORT_REASONS, reportUser, type ReportReason } from '../../persistence/safety';
import { readableSupabaseError } from '../../persistence/supabase';
import { AeroWindow } from '../../ui/AeroWindow';
import './legal.css';
import { tr } from '../../i18n';

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
      setMsg({ text: tr('gracias, recibimos tu reporte y lo revisaremos.', 'thank you, we received your report and will review it.') });
      setNote('');
    } catch (error) {
      setMsg({ text: readableSupabaseError(error, tr('no se pudo enviar el reporte.', 'the report could not be sent.')), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="report-btn" onClick={() => { setOpen(true); setMsg(null); }}>{tr('reportar', 'report')}</button>
      {open && (
        <AeroWindow className="win-report" title={`${tr('reportar a', 'report')} @${username}`} icon={<span className="mini-orb" />} onClose={() => setOpen(false)}>
          <form className="report" onSubmit={send}>
            <label>
              {tr('motivo', 'reason')}
              <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                {REPORT_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label>
              {tr('nota (opcional)', 'note (optional)')}
              <textarea maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('cuéntanos qué pasó', 'tell us what happened')} />
            </label>
            {msg && <p className={`report__msg${msg.error ? ' is-error' : ''}`} role={msg.error ? 'alert' : 'status'}>{msg.text}</p>}
            <div className="report__actions">
              <button type="button" className="vista-button" onClick={() => setOpen(false)}>{tr('cerrar', 'close')}</button>
              <button className="vista-button vista-button--primary" disabled={busy}>{busy ? tr('enviando...', 'sending...') : tr('enviar reporte', 'send report')}</button>
            </div>
          </form>
        </AeroWindow>
      )}
    </>
  );
}
