import { tr } from '../../i18n';
interface Props {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFlip: () => void;
  onSmaller: () => void;
  onBigger: () => void;
  onDelete: () => void;
}

/** deshacer y rehacer siempre; las acciones del objeto solo aparecen con uno seleccionado. */
export function EditorToolbar(p: Props) {
  return (
    <div className="toolbar" role="toolbar" aria-label={tr('herramientas', 'tools')}>
      <button type="button" className="tool" aria-label={tr('deshacer', 'undo')} title={tr('deshacer', 'undo')} disabled={!p.canUndo} onClick={p.onUndo}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />
        </svg>
      </button>
      <button type="button" className="tool" aria-label={tr('rehacer', 'redo')} title={tr('rehacer', 'redo')} disabled={!p.canRedo} onClick={p.onRedo}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />
        </svg>
      </button>
      {p.hasSelection && (
        <div className="toolbar__object" role="group" aria-label={tr('objeto seleccionado', 'selected object')}>
          <button type="button" className="chipbtn" onClick={p.onFlip}>
            {tr('girar', 'flip')}
          </button>
          <button type="button" className="chipbtn" onClick={p.onSmaller} aria-label={tr('reducir escala', 'decrease scale')}>
            {tr('menos', 'smaller')}
          </button>
          <button type="button" className="chipbtn" onClick={p.onBigger} aria-label={tr('aumentar escala', 'increase scale')}>
            {tr('más', 'bigger')}
          </button>
          <button type="button" className="chipbtn chipbtn--danger" onClick={p.onDelete}>
            {tr('quitar', 'remove')}
          </button>
        </div>
      )}
    </div>
  );
}
