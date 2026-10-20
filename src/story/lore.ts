/** la historia del juego y los hitos que desbloquea la comunidad. */
export interface Slide {
  title: string;
  text: string;
  tone: 'brillo' | 'gris' | 'faro' | 'juntos';
}

export const PROLOGUE: readonly Slide[] = [
  { tone: 'brillo', title: 'había un planeta que brillaba', text: 'agua de cristal, cielos de burbujas y islas que cantaban cuando las visitabas. era la era aero, y todo era limpio, claro y amable.' },
  { tone: 'gris', title: 'hasta que llegó la opacidad', text: 'una bruma gris apagó los colores. las pantallas se volvieron planas, el cemento cubrió el mar y las islas se quedaron dormidas, una por una.' },
  { tone: 'faro', title: 'pero tu isla todavía brilla', text: 'eres un faro aero. cada cosa bonita que pones en tu isla enciende una luz, y las luces se ven desde muy lejos.' },
  { tone: 'juntos', title: 'solos no podemos, juntos sí', text: 'las zonas grises del mundo se restauran entre varias personas. cada vez que el planeta recupera color, todos desbloquean regalos nuevos. aero, el espíritu del agua, te guiará.' },
];

export interface Milestone {
  percent: number;
  title: string;
  text: string;
  reward: string;
}

/** hitos comunitarios: se alcanzan entre todos y los regalos son para todos. */
export const MILESTONES: readonly Milestone[] = [
  { percent: 2, title: 'la primera chispa', text: 'el planeta responde: aparece la primera nube de algodón.', reward: 'nube de algodón' },
  { percent: 5, title: 'el bosque de cristal', text: 'la luz atraviesa la bruma y nace un árbol de cristal.', reward: 'árbol de cristal' },
  { percent: 10, title: 'las ballenas vuelven', text: 'el mar se aclara lo suficiente para que regresen los gigantes azules.', reward: 'ballena azul' },
  { percent: 25, title: 'el corazón del aero', text: 'el orbe del aero despierta y muestra los recuerdos del planeta.', reward: 'orbe del aero' },
  { percent: 50, title: 'cielos nuevos', text: 'mitad del planeta ya brilla. el cielo del mundo se vuelve más claro para todos.', reward: 'cielo aero en el mundo' },
  { percent: 100, title: 'el planeta brilla otra vez', text: 'la opacidad se ha ido. la era aero vuelve y cada isla es parte de ella.', reward: 'el final de la historia' },
];

export function reachedMilestones(percent: number): Milestone[] {
  return MILESTONES.filter((m) => percent >= m.percent);
}

export function nextMilestone(percent: number): Milestone | null {
  return MILESTONES.find((m) => percent < m.percent) ?? null;
}
