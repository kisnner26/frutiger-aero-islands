import { useCallback, useEffect, useMemo, useState } from 'react';
import { KIND_LABEL, MEMORY_LIMITS, formatBytes, formatTime, groupByDay, memoryFileName, type Memory } from '../../memories/logic';
import { listMemories, removeMemory, subscribeMemories, usageOf } from '../../memories/store';

/** álbum local: línea de tiempo de recuerdos con descarga, compartir y borrado confirmado. */
export function AlbumApp() {
  const [items, setItems] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await listMemories());
      setError(null);
    } catch {
      setError('no se pudo abrir el álbum en este navegador.');
    }
  }, []);

  useEffect(() => {
    void reload();
    const off = subscribeMemories(() => void reload());
    return () => {
      off();
    };
  }, [reload]);

  const urls = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items ?? []) if (it.photo) m.set(it.id, URL.createObjectURL(it.photo));
    return m;
  }, [items]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const open = items?.find((m) => m.id === openId) ?? null;

  const download = (m: Memory) => {
    const url = urls.get(m.id);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = memoryFileName(m);
    a.click();
  };

  const share = async (m: Memory) => {
    if (!m.photo) return;
    const file = new File([m.photo], memoryFileName(m), { type: 'image/jpeg' });
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      setMsg('tu navegador no permite compartir imágenes. usa descargar.');
      return;
    }
    try {
      await navigator.share({ files: [file], title: 'mi isla en frutiger aero islands' });
      setMsg(null);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setMsg('no se pudo compartir la imagen.');
    }
  };

  const remove = async (m: Memory) => {
    try {
      await removeMemory(m.id);
      setOpenId(null);
      setConfirm(false);
      setMsg(null);
    } catch {
      setMsg('no se pudo eliminar el recuerdo.');
    }
  };

  if (error) return <div className="appscreen"><p role="alert">{error}</p></div>;
  if (!items) return <div className="appscreen"><p role="status">abriendo el álbum...</p></div>;

  if (open) {
    const url = urls.get(open.id);
    return (
      <div className="appscreen">
        <button type="button" className="album__back" onClick={() => { setOpenId(null); setConfirm(false); setMsg(null); }}>
          ‹ álbum
        </button>
        {url && <img className="album__big" src={url} alt={`${KIND_LABEL[open.kind]} del ${new Date(open.at).toLocaleDateString('es')}`} />}
        <p className="album__cap">
          <strong>{KIND_LABEL[open.kind]}</strong>
          <span>
            {new Date(open.at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}, {formatTime(open.at)}
          </span>
          <span>{open.text}</span>
          <span className="album__origin">guardado solo en este dispositivo · {formatBytes(open.bytes)}</span>
        </p>
        <div className="album__actions">
          {open.photo && (
            <>
              <button type="button" className="vista-button" onClick={() => download(open)}>
                descargar
              </button>
              <button type="button" className="vista-button" onClick={() => void share(open)}>
                compartir
              </button>
            </>
          )}
          {!confirm ? (
            <button type="button" className="vista-button" onClick={() => setConfirm(true)}>
              eliminar
            </button>
          ) : (
            <div className="album__confirm" role="alertdialog" aria-label="confirmar eliminación">
              <span>¿eliminar este recuerdo? no se puede deshacer.</span>
              <button type="button" className="vista-button vista-button--primary" onClick={() => void remove(open)}>
                sí, eliminar
              </button>
              <button type="button" className="vista-button" onClick={() => setConfirm(false)}>
                cancelar
              </button>
            </div>
          )}
        </div>
        {msg && <p role="status" className="album__msg">{msg}</p>}
      </div>
    );
  }

  const usage = usageOf(items);
  return (
    <div className="appscreen">
      <h3>álbum</h3>
      <p className="album__usage">
        {usage.count} de {MEMORY_LIMITS.count} recuerdos · {formatBytes(usage.bytes)} de {formatBytes(MEMORY_LIMITS.bytes)} · solo en este dispositivo
      </p>
      {items.length === 0 ? (
        <p>todavía no hay recuerdos. toma una fotografía con la cámara; la creación de tu isla se registra sola la primera vez.</p>
      ) : (
        groupByDay(items).map((g) => (
          <section key={g.day} className="album__day" aria-label={g.day}>
            <h4>{g.day}</h4>
            <ul className="album__list">
              {g.items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setOpenId(m.id)}>
                    {urls.get(m.id) ? <img src={urls.get(m.id)} alt="" /> : <span className="album__nophoto" aria-hidden="true" />}
                    <span>
                      <strong>{KIND_LABEL[m.kind]}</strong>
                      <small>{formatTime(m.at)} · {m.text}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
