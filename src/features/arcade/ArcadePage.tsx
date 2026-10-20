import { useEffect, useMemo, useState } from 'react';
import { clearMatches, emptyGrid, type Fish, fishReward, initialRacer, type RacerState, racerReward, rotateCrystal, settleCrystal, steerRacer, tickRacer, type Crystal } from './arcade';
import './arcade.css';

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
    <header className="arcade__top"><button type="button" onClick={onExit}>← volver</button><p>arcade de islas</p><output>{game === 'menu' ? '3 juegos disponibles' : `soles: ${result}`}</output></header>
    {game === 'menu' && <section className="arcade-menu"><div><p className="arcade__eyebrow">desafíos de hoy</p><h1 id="arcade-title">juega. gana soles.<br />haz crecer tu isla.</h1><p>partidas cortas para desbloquear rutas, decoraciones y espacio nuevo.</p></div><div className="arcade-cards"><button type="button" className="arcade-card arcade-card--racer" onClick={startRacer}><b>aqua racer</b><span>25 segundos · derrapa entre olas</span><i>▶</i></button><button type="button" className="arcade-card arcade-card--crystal" onClick={startCrystals}><b>crystal drop</b><span>combina 3 · haz llover brillos</span><i>◆</i></button><button type="button" className="arcade-card arcade-card--fish" onClick={startFish}><b>pez fuera del agua</b><span>rescata peces · persigue raros</span><i>◒</i></button></div></section>}
    {game === 'racer' && <section className="arcade-play arcade-racer"><div className="arcade-play__heading"><div><p>aqua racer · ruta {racer.route}</p><h1>{finished ? (racer.distance >= 1000 ? 'ruta completada' : 'regresa a intentarlo') : 'surca las olas'}</h1></div><strong>{racer.remaining}s</strong></div><div className="racer-track" style={{ '--lane': racer.lane } as React.CSSProperties}><div className="racer-track__wake" /><div className="racer-track__rider">▰</div><span className="racer-track__dolphin">◒</span><span className="racer-track__sun">☀</span></div><div className="racer-meter"><i style={{ width: `${racer.distance / 10}%` }} /></div>{!finished ? <div className="arcade-controls"><button type="button" onClick={() => setRacer((value) => steerRacer(value, -1))}>←</button><span>carril {racer.lane + 1} / 3</span><button type="button" onClick={() => setRacer((value) => steerRacer(value, 1))}>→</button></div> : <button type="button" className="arcade-claim" onClick={award}>reclamar {result} soles</button>}</section>}
    {game === 'crystals' && <section className="arcade-play arcade-crystal"><div className="arcade-play__heading"><div><p>crystal drop</p><h1>hazlos encajar</h1></div><strong>{crystalScore} soles</strong></div><div className="crystal-board">{grid.map((row, y) => row.map((cell, x) => <span key={`${x}-${y}`} className={`crystal-cell${cell ? ` crystal-cell--${cell}` : ''}`} />))}</div><div className="crystal-next">{crystal.map((item, index) => <i className={`crystal-cell crystal-cell--${item}${index === 0 ? ' is-active' : ''}`} key={`${item}-${index}`} />)}</div><div className="arcade-controls"><button type="button" onClick={() => setColumn((value) => Math.max(0, value - 1))}>←</button><span>columna {column + 1}</span><button type="button" onClick={() => setColumn((value) => Math.min(5, value + 1))}>→</button><button type="button" onClick={() => setCrystal((value) => rotateCrystal(value))}>rotar</button><button type="button" onClick={drop}>soltar</button></div><button type="button" className="arcade-claim" onClick={award}>salir con {crystalScore} soles</button></section>}
    {game === 'fish' && <section className="arcade-play arcade-fish"><div className="arcade-play__heading"><div><p>pez fuera del agua</p><h1>{finished ? 'el agua los salvó' : 'devuélvelos al mar'}</h1></div><strong>{time}s</strong></div><div className="fish-pond">{fish.map((item) => <button type="button" key={item.id} className={`fish fish--${item.species}${item.caught ? ' is-caught' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setFish((all) => all.map((entry) => entry.id === item.id ? { ...entry, caught: true } : entry))} aria-label={`rescatar pez ${item.species}`}>◒</button>)}</div>{finished ? <button type="button" className="arcade-claim" onClick={award}>reclamar {result} soles</button> : <p className="arcade-tip">los peces dorados dan más soles.</p>}</section>}
  </main>;
}
