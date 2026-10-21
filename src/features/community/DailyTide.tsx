import { useEffect, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { claimDailyTide, getDailyTide, type DailyTideStatus } from '../../persistence/dailyTide';
import { readableSupabaseError } from '../../persistence/supabase';
import './daily-tide.css';
import { tr } from '../../i18n';

export function DailyTide() {
  const [state, setState] = useState<DailyTideStatus | null>(null);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let live = true;
    void getDailyTide().then((next) => { if (live) setState(next); }).catch(() => { if (live) setMessage(tr('no se pudo leer la marea de hoy.', "could not read today's tide.")); });
    return () => { live = false; };
  }, []);

  const claim = async () => {
    setWorking(true); setMessage('');
    try {
      const result = await claimDailyTide();
      setState(result);
      sfx.levelUp();
      setMessage(tr(`marea recibida: +${result.reward.water} agua, +${result.reward.crystals} cristales y +${result.reward.leaves} hojas.`, `tide received: +${result.reward.water} water, +${result.reward.crystals} crystals and +${result.reward.leaves} leaves.`));
    } catch (error) {
      sfx.error();
      setMessage(readableSupabaseError(error, tr('no se pudo recoger la marea.', 'could not collect the tide.')));
    } finally {
      setWorking(false);
    }
  };

  const streak = state?.streak ?? 0;
  return (
    <section className="daily-tide" aria-labelledby="daily-tide-title" aria-busy={state === null && !message}>
      <header className="daily-tide__head">
        <div><p>{tr('señal del archipiélago', 'archipelago signal')}</p><h2 id="daily-tide-title">{tr('marea diaria', 'daily tide')}</h2></div>
        <strong>{streak} {streak === 1 ? tr('día', 'day') : tr('días', 'days')}</strong>
      </header>
      <p className="daily-tide__intro">{tr('vuelve cada día para cargar la corriente de tu isla. al séptimo día, la señal llega a su punto máximo.', 'come back every day to charge the current of your island. on the seventh day, the signal peaks.')}</p>
      <ol className="daily-tide__days" aria-label={`${tr('racha actual', 'current streak')}: ${streak} ${tr('días', 'days')}`}>
        {Array.from({ length: 7 }, (_, index) => <li key={index} className={index < streak ? 'is-done' : index === streak && state?.canClaim ? 'is-today' : ''}><span>{index + 1}</span><small>{index === 6 ? tr('pulso', 'pulse') : tr('ola', 'wave')}</small></li>)}
      </ol>
      <div className="daily-tide__reward"><span aria-hidden="true" /><p><strong>{state?.canClaim ? tr('la marea está lista', 'the tide is ready') : tr('vuelve con la próxima marea', 'come back with the next tide')}</strong><small>{tr('agua, cristales y hojas para el laboratorio. la entrega la valida el servidor.', 'water, crystals and leaves for the lab. the server validates the delivery.')}</small></p><button type="button" className="vista-button vista-button--primary" disabled={!state?.canClaim || working} onClick={() => void claim()}>{working ? tr('recogiendo...', 'collecting...') : state?.canClaim ? tr('recoger', 'collect') : tr('recogida', 'collected')}</button></div>
      {message && <p className="daily-tide__message" role="status">{message}</p>}
    </section>
  );
}
