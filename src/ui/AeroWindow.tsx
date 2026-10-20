import type { ReactNode } from 'react';

interface Props {
  title: string;
  icon?: ReactNode;
  collapsed?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
  /** nombre accesible de la región. */
  label?: string;
}

/** ventana de cristal estilo windows vista: barra de título con brillo y botones de sistema. */
export function AeroWindow({ title, icon, collapsed = false, onMinimize, onClose, className = '', children, label }: Props) {
  return (
    <section className={`aero-window${collapsed ? ' is-collapsed' : ''} ${className}`.trim()} aria-label={label ?? title}>
      <header className="aero-window__bar">
        {icon && (
          <span className="aero-window__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 className="aero-window__title">{title}</h2>
        {(onMinimize || onClose) && (
          <div className="aero-window__caption">
            {onMinimize && (
              <button type="button" className="cap cap--min" aria-label={collapsed ? `restaurar ${title}` : `minimizar ${title}`} aria-expanded={!collapsed} onClick={onMinimize}>
                <span aria-hidden="true" />
              </button>
            )}
            {onClose && (
              <button type="button" className="cap cap--close" aria-label={`cerrar ${title}`} onClick={onClose}>
                <span aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </header>
      <div className="aero-window__body" hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
