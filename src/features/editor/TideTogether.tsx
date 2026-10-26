import { useEffect, useState } from 'react';
import { RoyaleNet, netAvailable, type Member } from '../royale/net';
import { SharedTide, type TideState } from './sharedTide';
import { tr } from '../../i18n';

type Msg = { k: 'pop'; n: number };

const listeners = new Set<() => void>();
/** el editor avisa aquí cada vez que revienta una burbuja. */
export const tideBus = { pop: () => listeners.forEach((l) => l()) };

const myId = Math.random().toString(36).slice(2, 10);

/** marea compartida: un medidor que llenan juntas las personas conectadas; al llenarse todas cobran. */
export function TideTogether({ name, onFill }: { name: string; onFill: (reward: number) => void }) {
  const [state, setState] = useState<TideState>({ pops: 0, mine: 0, goal: 30, filled: 0 });
  const [people, setPeople] = useState(1);

  useEffect(() => {
    if (!netAvailable()) return undefined;
    const tide = new SharedTide((reward) => onFill(reward));
    const sync = () => setState(tide.state());
    const me: Member = { id: myId, name, hue: 0, spec: null, host: false };
    const net = new RoyaleNet<Msg>(
      'MUNDO',
      me,
      {
        members: (m) => {
          tide.setPlayers(m.length);
          setPeople(m.length);
          sync();
        },
        msg: (m) => {
          if (m.k === 'pop') {
            tide.add(Math.min(5, Math.max(0, Math.floor(m.n))), false);
            sync();
          }
        },
        error: () => undefined,
      },
      'marea',
    );
    net.join().catch(() => undefined);
    const mine = () => {
      tide.add(1, true);
      sync();
      net.send({ k: 'pop', n: 1 });
    };
    listeners.add(mine);
    return () => {
      listeners.delete(mine);
      void net.close();
    };
    // onFill cambia de identidad en cada render del editor; la sala no debe reconectarse por eso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (!netAvailable()) return null;
  return (
    <div className="tide-together" role="status" aria-label={tr('marea compartida', 'shared tide')}>
      <span>{tr('marea compartida', 'shared tide')} · {people} {people === 1 ? tr('persona', 'person') : tr('personas', 'people')}</span>
      <i aria-hidden="true"><b style={{ width: `${Math.min(100, (state.pops / state.goal) * 100)}%` }} /></i>
      <small>{state.pops}/{state.goal}</small>
    </div>
  );
}
