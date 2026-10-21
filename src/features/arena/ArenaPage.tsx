import { routeHref } from '../../app/useHashRoute';
import { tr } from '../../i18n';
import { BrandOrb } from '../../ui/Brand';
import { ProgressCard } from '../royale/BattleResult';
import '../royale/royale.css';
import './arena.css';

interface ModeCard {
  id: string;
  href: string;
  title: string;
  tag: string;
  text: string;
  facts: string[];
  tone: 'orbes' | 'blob' | 'paint';
}

/** aero arena: un solo lugar para todos los modos de batalla, con el mismo rango, medallas y misiones. */
export function ArenaPage() {
  const modes: ModeCard[] = [
    { id: 'paintball', href: '#/paintball', title: 'paintball royale', tag: tr('primera persona', 'first person'), tone: 'paint', text: tr('ocho jugadores en una isla que se cierra. dispara pintura, ponte a cubierto y sé el último en pie.', 'eight players on a closing island. shoot paint, take cover and be the last one standing.'), facts: [tr('8 jugadores', '8 players'), tr('en línea con amigos', 'online with friends'), tr('móvil y teclado', 'mobile and keyboard')] },
    { id: 'royale', href: '#/royale', title: 'aero royale', tag: tr('vista aérea', 'top-down'), tone: 'orbes', text: tr('doce orbes de cristal revientan burbujas. combos, frenesí y una opacidad gris que avanza.', 'twelve glass orbs pop bubbles. combos, frenzy and a gray haze closing in.'), facts: [tr('12 jugadores', '12 players'), tr('en línea con amigos', 'online with friends'), tr('combos y premios', 'combos and prizes')] },
    { id: 'blob', href: '#/blob', title: 'aero blob', tag: tr('come y crece', 'eat and grow'), tone: 'blob', text: tr('come, crece y usa poderes. evita a los más grandes y a la bruma mientras el mundo se encoge.', 'eat, grow and use powers. avoid the bigger ones and the haze as the world shrinks.'), facts: [tr('salas en línea', 'online rooms'), tr('poderes', 'powers'), tr('con medusas', 'with jellies')] },
  ];
  return (
    <main className="royale royale--menu arena">
      <div className="arena__wrap">
        <header className="arena__head">
          <BrandOrb size={64} />
          <div>
            <p className="royale__kicker">frutiger aero</p>
            <h1>aero arena</h1>
            <p className="royale__lead">{tr('elige cómo jugar. todos los modos suman al mismo rango, medallas y misiones diarias.', 'pick how to play. every mode adds to the same rank, medals and daily missions.')}</p>
          </div>
        </header>
        <div className="arena__grid">
          {modes.map((m) => (
            <a key={m.id} className={`arena__card arena__card--${m.tone}`} href={m.href}>
              <span className="arena__art" aria-hidden="true"><i /><i /><i /></span>
              <small className="arena__tag">{m.tag}</small>
              <strong>{m.title}</strong>
              <p>{m.text}</p>
              <ul>{m.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              <span className="arena__go">{tr('jugar', 'play')} ›</span>
            </a>
          ))}
        </div>
        <ProgressCard />
        <p className="arena__foot"><a className="landing__text-link" href={routeHref('mundo')}>{tr('‹ volver al mundo', '‹ back to the world')}</a></p>
      </div>
    </main>
  );
}
