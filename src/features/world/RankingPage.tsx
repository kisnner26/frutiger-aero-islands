import { AeroWindow } from '../../ui/AeroWindow';
import { LeaderboardPanel } from './LeaderboardPanel';

/** el ranking como página propia (con la barra de tareas), accesible desde el menú de inicio. */
export function RankingPage() {
  return (
    <AeroWindow className="win-ranking-page" title="ranking · top 100" icon={<span className="mini-orb" />}>
      <LeaderboardPanel />
    </AeroWindow>
  );
}
