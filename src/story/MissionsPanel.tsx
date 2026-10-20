import { MILESTONES, nextMilestone } from './lore';
import { missionStatus, type MissionContext } from './missions';
import { useRestoration } from '../world/restorationStore';
import './story.css';

/** aero te guía: misiones del faro y progreso comunitario del planeta. */
export function MissionsPanel({ ctx }: { ctx: MissionContext }) {
  const percent = useRestoration();
  const list = missionStatus(ctx);
  const done = list.filter((s) => s.done).length;
  const next = nextMilestone(percent);
  return (
    <div className="missions">
      <header className="missions__guide">
        <span className="missions__orb" aria-hidden="true" />
        <p>
          {done === list.length
            ? 'tu faro brilla con fuerza. ahora ayuda a restaurar el planeta con la gente de la comunidad.'
            : 'soy aero. si enciendes tu faro paso a paso, el planeta lo notará.'}
        </p>
      </header>
      <ul className="missions__list">
        {list.map(({ mission, value, done: ok }) => (
          <li key={mission.id} className={ok ? 'is-done' : ''}>
            <span className="missions__check" aria-hidden="true">{ok ? '✓' : ''}</span>
            <div>
              <strong>{mission.title}</strong>
              <small>{mission.text}</small>
              {!ok && mission.goal > 1 && <i aria-hidden="true"><b style={{ width: `${(value / mission.goal) * 100}%` }} /></i>}
            </div>
            <em>{value}/{mission.goal}</em>
          </li>
        ))}
      </ul>
      <section className="missions__world" aria-label="progreso del planeta">
        <strong>planeta restaurado · {percent.toFixed(percent < 10 ? 1 : 0)}%</strong>
        <small>{next ? `próximo regalo para todos a ${next.percent}%: ${next.reward}` : 'el planeta brilla otra vez'}</small>
        <ol>
          {MILESTONES.map((m) => (
            <li key={m.percent} className={percent >= m.percent ? 'is-done' : ''}>
              <b>{m.percent}%</b> {m.title}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
