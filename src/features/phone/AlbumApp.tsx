import { useCallback, useEffect, useMemo, useState } from 'react';
import { KIND_LABEL, MEMORY_LIMITS, formatBytes, formatTime, groupByDay, memoryFileName, type Memory } from '../../memories/logic';
import { listMemories, removeMemory, subscribeMemories, usageOf } from '../../memories/store';
import { tr, lang } from '../../i18n';

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
      setError(tr('no se pudo abrir el álbum en este navegador.', 'the album could not be opened in this browser.'));
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
      setMsg(tr('tu navegador no permite compartir imágenes. usa descargar.', 'your browser cannot share images. use download.'));
      return;
    }
    try {
      await navigator.share({ files: [file], title: tr('mi isla en frutiger aero islands', 'my island in frutiger aero islands') });
      setMsg(null);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setMsg(tr('no se pudo compartir la imagen.', 'the image could not be shared.'));
    }
  };

  const remove = async (m: Memory) => {
    try {
      await removeMemory(m.id);
      setOpenId(null);
      setConfirm(false);
      setMsg(null);
    } catch {
      setMsg(tr('no se pudo eliminar el recuerdo.', 'the memory could not be deleted.'));
    }
  };

  if (error) return <div className="appscreen"><p role="alert">{error}</p></div>;
  if (!items) return <div className="appscreen"><p role="status">{tr('abriendo el álbum...', 'opening the album...')}</p></div>;

  if (open) {
    const url = urls.get(open.id);
    return (
      <div className="appscreen">
        <button type="button" className="album__back" onClick={() => { setOpenId(null); setConfirm(false); setMsg(null); }}>
          ‹ {tr('álbum', 'album')}
        </button>
        {url && <img className="album__big" src={url} alt={`${KIND_LABEL[open.kind]} ${tr('del', 'from')} ${new Date(open.at).toLocaleDateString(lang)}`} />}
        <p className="album__cap">
          <strong>{KIND_LABEL[open.kind]}</strong>
          <span>
            {new Date(open.at).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}, {formatTime(open.at)}
          </span>
          <span>{open.text}</span>
          <span className="album__origin">{tr('guardado solo en este dispositivo', 'saved only on this device')} · {formatBytes(open.bytes)}</span>
        </p>
        <div className="album__actions">
          {open.photo && (
            <>
              <button type="button" className="vista-button" onClick={() => download(open)}>
                {tr('descargar', 'download')}
              </button>
              <button type="button" className="vista-button" onClick={() => void share(open)}>
                {tr('compartir', 'share')}
              </button>
            </>
          )}
          {!confirm ? (
            <button type="button" className="vista-button" onClick={() => setConfirm(true)}>
              {tr('eliminar', 'delete')}
            </button>
          ) : (
            <div className="album__confirm" role="alertdialog" aria-label={tr('confirmar eliminación', 'confirm deletion')}>
              <span>{tr('¿eliminar este recuerdo? no se puede deshacer.', 'delete this memory? this cannot be undone.')}</span>
              <button type="button" className="vista-button vista-button--primary" onClick={() => void remove(open)}>
                {tr('sí, eliminar', 'yes, delete')}
              </button>
              <button type="button" className="vista-button" onClick={() => setConfirm(false)}>
                {tr('cancelar', 'cancel')}
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
      <h3>{tr('álbum', 'album')}</h3>
      <p className="album__usage">
        {usage.count} {tr('de', 'of')} {MEMORY_LIMITS.count} {tr('recuerdos', 'memories')} · {formatBytes(usage.bytes)} {tr('de', 'of')} {formatBytes(MEMORY_LIMITS.bytes)} · {tr('solo en este dispositivo', 'only on this device')}
      </p>
      {items.length === 0 ? (
        <p>{tr('todavía no hay recuerdos. toma una fotografía con la cámara; la creación de tu isla se registra sola la primera vez.', 'there are no memories yet. take a photo with the camera; the creation of your island is recorded by itself the first time.')}</p>
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
