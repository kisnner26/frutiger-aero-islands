import { useEffect, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { claimDailyTide, getDailyTide, type DailyTideStatus } from '../../persistence/dailyTide';
import { readableSupabaseError } from '../../persistence/supabase';
import './daily-tide.css';

export function DailyTide() {
  const [state, setState] = useState<DailyTideStatus | null>(null);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let live = true;
    void getDailyTide().then((next) => { if (live) setState(next); }).catch(() => { if (live) setMessage('no se pudo leer la marea de hoy.'); });
    return () => { live = false; };
  }, []);

  const claim = async () => {
    setWorking(true); setMessage('');
    try {
      const result = await claimDailyTide();
      setState(result);
      sfx.levelUp();
      setMessage(`marea recibida: +${result.reward.water} agua, +${result.reward.crystals} cristales y +${result.reward.leaves} hojas.`);
    } catch (error) {
      sfx.error();
      setMessage(readableSupabaseError(error, 'no se pudo recoger la marea.'));
    } finally {
      setWorking(false);
    }
  };

  const streak = state?.streak ?? 0;
  return (
    <section className="daily-tide" aria-labelledby="daily-tide-title" aria-busy={state === null && !message}>
      <header className="daily-tide__head">
        <div><p>señal del archipiélago</p><h2 id="daily-tide-title">marea diaria</h2></div>
        <strong>{streak} {streak === 1 ? 'día' : 'días'}</strong>
      </header>
      <p className="daily-tide__intro">vuelve cada día para cargar la corriente de tu isla. al séptimo día, la señal llega a su punto máximo.</p>
      <ol className="daily-tide__days" aria-label={`racha actual: ${streak} días`}>
        {Array.from({ length: 7 }, (_, index) => <li key={index} className={index < streak ? 'is-done' : index === streak && state?.canClaim ? 'is-today' : ''}><span>{index + 1}</span><small>{index === 6 ? 'pulso' : 'ola'}</small></li>)}
      </ol>
      <div className="daily-tide__reward"><span aria-hidden="true" /><p><strong>{state?.canClaim ? 'la marea está lista' : 'vuelve con la próxima marea'}</strong><small>agua, cristales y hojas para el laboratorio. la entrega la valida el servidor.</small></p><button type="button" className="vista-button vista-button--primary" disabled={!state?.canClaim || working} onClick={() => void claim()}>{working ? 'recogiendo...' : state?.canClaim ? 'recoger' : 'recogida'}</button></div>
      {message && <p className="daily-tide__message" role="status">{message}</p>}
    </section>
  );
}
