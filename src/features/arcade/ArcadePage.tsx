import { useEffect, useMemo, useState } from 'react';
import { clearMatches, emptyGrid, type Fish, fishReward, initialRacer, type RacerState, racerReward, rotateCrystal, settleCrystal, steerRacer, tickRacer, type Crystal } from './arcade';
import './arcade.css';
import { tr } from '../../i18n';

const FISH: Fish[] = [
  { id: 1, species: 'blue', x: 18, y: 50, caught: false }, { id: 2, species: 'clown', x: 43, y: 20, caught: false },
  { id: 3, species: 'gold', x: 67, y: 45, caught: false }, { id: 4, species: 'blue', x: 82, y: 26, caught: false },
  { id: 5, species: 'clown', x: 32, y: 70, caught: false }, { id: 6, species: 'blue', x: 72, y: 73, caught: false },
];

interface Props { onExit?: () => void; onReward?: (suns: number) => void; }

export function ArcadePage({ onExit, onReward }: Props) {
  const [game, setGame] = useState<'menu' | 'racer' | 'crystals' | 'fish'>('menu');
  const [racer, setRacer] = useState<RacerState>(() => initialRacer());
  const [grid, setGrid] = useState(emptyGrid);
  const [crystal, setCrystal] = useState<Crystal[]>(['cyan', 'pink', 'gold']);
  const [column, setColumn] = useState(2);
  const [crystalScore, setCrystalScore] = useState(0);
  const [fish, setFish] = useState(FISH);
  const [time, setTime] = useState(30);
  const finished = game === 'racer' ? racer.remaining <= 0 || racer.distance >= 1000 || racer.damage >= 3 : game === 'fish' ? time <= 0 : false;

  useEffect(() => {
    if (game !== 'racer' || finished) return;
    const timer = window.setInterval(() => setRacer((value) => tickRacer(value)), 1000);
    return () => window.clearInterval(timer);
  }, [game, finished]);
  useEffect(() => {
    if (game !== 'fish' || finished) return;
    const timer = window.setInterval(() => setTime((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [game, finished]);

  const result = useMemo(() => game === 'racer' ? racerReward(racer) : game === 'fish' ? fishReward(fish) : crystalScore, [game, racer, fish, crystalScore]);
  const award = () => { onReward?.(result); setGame('menu'); };
  const startRacer = () => { setRacer(initialRacer()); setGame('racer'); };
  const startCrystals = () => { setGrid(emptyGrid()); setCrystal(['cyan', 'pink', 'gold']); setColumn(2); setCrystalScore(0); setGame('crystals'); };
  const startFish = () => { setFish(FISH); setTime(30); setGame('fish'); };
  const drop = () => {
    const settled = settleCrystal(grid, column, crystal[0]);
    const cleared = clearMatches(settled);
    setGrid(cleared.grid); setCrystalScore((value) => value + cleared.cleared * 5); setCrystal((value) => rotateCrystal(value));
  };

  return <main className="arcade" aria-labelledby="arcade-title">
    <header className="arcade__top"><button type="button" onClick={onExit}>← {tr('volver', 'back')}</button><p>{tr('arcade de islas', 'island arcade')}</p><output>{game === 'menu' ? tr('3 juegos disponibles', '3 games available') : `${tr('soles', 'suns')}: ${result}`}</output></header>
    {game === 'menu' && <section className="arcade-menu"><div><p className="arcade__eyebrow">{tr('desafíos de hoy', "today's challenges")}</p><h1 id="arcade-title">{tr('juega. gana soles.', 'play. earn suns.')}<br />{tr('haz crecer tu isla.', 'grow your island.')}</h1><p>{tr('partidas cortas para desbloquear rutas, decoraciones y espacio nuevo.', 'short games to unlock routes, decorations and new space.')}</p></div><div className="arcade-cards"><button type="button" className="arcade-card arcade-card--racer" onClick={startRacer}><b>aqua racer</b><span>{tr('25 segundos · derrapa entre olas', '25 seconds · drift between waves')}</span><i>▶</i></button><button type="button" className="arcade-card arcade-card--crystal" onClick={startCrystals}><b>crystal drop</b><span>{tr('combina 3 · haz llover brillos', 'match 3 · make sparkles rain')}</span><i>◆</i></button><button type="button" className="arcade-card arcade-card--fish" onClick={startFish}><b>{tr('pez fuera del agua', 'fish out of water')}</b><span>{tr('rescata peces · persigue raros', 'rescue fish · chase rare ones')}</span><i>◒</i></button></div></section>}
    {game === 'racer' && <section className="arcade-play arcade-racer"><div className="arcade-play__heading"><div><p>aqua racer · {tr('ruta', 'route')} {racer.route}</p><h1>{finished ? (racer.distance >= 1000 ? tr('ruta completada', 'route complete') : tr('regresa a intentarlo', 'come back and try again')) : tr('surca las olas', 'ride the waves')}</h1></div><strong>{racer.remaining}s</strong></div><div className="racer-track" style={{ '--lane': racer.lane } as React.CSSProperties}><div className="racer-track__wake" /><div className="racer-track__rider">▰</div><span className="racer-track__dolphin">◒</span><span className="racer-track__sun">☀</span></div><div className="racer-meter"><i style={{ width: `${racer.distance / 10}%` }} /></div>{!finished ? <div className="arcade-controls"><button type="button" onClick={() => setRacer((value) => steerRacer(value, -1))}>←</button><span>{tr('carril', 'lane')} {racer.lane + 1} / 3</span><button type="button" onClick={() => setRacer((value) => steerRacer(value, 1))}>→</button></div> : <button type="button" className="arcade-claim" onClick={award}>{tr('reclamar', 'claim')} {result} {tr('soles', 'suns')}</button>}</section>}
    {game === 'crystals' && <section className="arcade-play arcade-crystal"><div className="arcade-play__heading"><div><p>crystal drop</p><h1>{tr('hazlos encajar', 'make them fit')}</h1></div><strong>{crystalScore} {tr('soles', 'suns')}</strong></div><div className="crystal-board">{grid.map((row, y) => row.map((cell, x) => <span key={`${x}-${y}`} className={`crystal-cell${cell ? ` crystal-cell--${cell}` : ''}`} />))}</div><div className="crystal-next">{crystal.map((item, index) => <i className={`crystal-cell crystal-cell--${item}${index === 0 ? ' is-active' : ''}`} key={`${item}-${index}`} />)}</div><div className="arcade-controls"><button type="button" onClick={() => setColumn((value) => Math.max(0, value - 1))}>←</button><span>{tr('columna', 'column')} {column + 1}</span><button type="button" onClick={() => setColumn((value) => Math.min(5, value + 1))}>→</button><button type="button" onClick={() => setCrystal((value) => rotateCrystal(value))}>{tr('rotar', 'rotate')}</button><button type="button" onClick={drop}>{tr('soltar', 'drop')}</button></div><button type="button" className="arcade-claim" onClick={award}>{tr('salir con', 'leave with')} {crystalScore} {tr('soles', 'suns')}</button></section>}
    {game === 'fish' && <section className="arcade-play arcade-fish"><div className="arcade-play__heading"><div><p>{tr('pez fuera del agua', 'fish out of water')}</p><h1>{finished ? tr('el agua los salvó', 'the water saved them') : tr('devuélvelos al mar', 'put them back in the sea')}</h1></div><strong>{time}s</strong></div><div className="fish-pond">{fish.map((item) => <button type="button" key={item.id} className={`fish fish--${item.species}${item.caught ? ' is-caught' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setFish((all) => all.map((entry) => entry.id === item.id ? { ...entry, caught: true } : entry))} aria-label={`${tr('rescatar pez', 'rescue fish')} ${item.species}`}>◒</button>)}</div>{finished ? <button type="button" className="arcade-claim" onClick={award}>{tr('reclamar', 'claim')} {result} {tr('soles', 'suns')}</button> : <p className="arcade-tip">{tr('los peces dorados dan más soles.', 'golden fish give more suns.')}</p>}</section>}
  </main>;
}
