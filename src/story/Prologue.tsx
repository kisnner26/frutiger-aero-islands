import { useState } from 'react';
import { PROLOGUE } from './lore';
import './story.css';
import { tr } from '../i18n';

const KEY = 'frutiger-aero-islands:prologo';
export const prologueSeen = () => {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
};

/** historia de bienvenida: cuatro pantallas con el motivo del juego; se muestra una sola vez. */
export function Prologue({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const slide = PROLOGUE[i];
  const last = i === PROLOGUE.length - 1;
  const finish = () => {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
    onDone();
  };
  return (
    <div className="prologue" role="dialog" aria-modal="true" aria-labelledby="prologue-title">
      <div className={`prologue__card prologue__card--${slide.tone}`} key={i}>
        <div className="prologue__art" aria-hidden="true">
          <span className="prologue__orb" />
          <span className="prologue__smog" />
          <span className="prologue__spark prologue__spark--a" />
          <span className="prologue__spark prologue__spark--b" />
        </div>
        <p className="prologue__step">aero · {i + 1} de {PROLOGUE.length}</p>
        <h2 id="prologue-title">{slide.title}</h2>
        <p className="prologue__text">{slide.text}</p>
        <div className="prologue__actions">
          <button type="button" className="prologue__skip" onClick={finish}>{tr('saltar', 'skip')}</button>
          <button type="button" className="vista-button vista-button--primary" onClick={() => (last ? finish() : setI(i + 1))}>
            {last ? tr('encender mi faro', 'light my beacon') : tr('siguiente', 'next')}
          </button>
        </div>
        <div className="prologue__dots" aria-hidden="true">
          {PROLOGUE.map((_, k) => (
            <i key={k} className={k === i ? 'is-on' : ''} />
          ))}
        </div>
      </div>
    </div>
  );
}
