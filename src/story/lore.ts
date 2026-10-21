import { tr } from '../i18n';
/** la historia del juego y los hitos que desbloquea la comunidad. */
export interface Slide {
  title: string;
  text: string;
  tone: 'brillo' | 'gris' | 'faro' | 'juntos';
}

export const PROLOGUE: readonly Slide[] = [
  { tone: 'brillo', title: tr('había un planeta que brillaba', 'there was a planet that shone'), text: tr('agua de cristal, cielos de burbujas y islas que cantaban cuando las visitabas. era la era aero, y todo era limpio, claro y amable.', 'glass water, skies full of bubbles and islands that sang when you visited them. it was the aero era, and everything was clean, bright and kind.') },
  { tone: 'gris', title: tr('hasta que llegó la opacidad', 'until the opacity came'), text: tr('una bruma gris apagó los colores. las pantallas se volvieron planas, el cemento cubrió el mar y las islas se quedaron dormidas, una por una.', 'a gray haze put out the colors. screens went flat, concrete covered the sea and the islands fell asleep, one by one.') },
  { tone: 'faro', title: tr('pero tu isla todavía brilla', 'but your island still shines'), text: tr('eres un faro aero. cada cosa bonita que pones en tu isla enciende una luz, y las luces se ven desde muy lejos.', 'you are an aero beacon. every beautiful thing you put on your island lights a lamp, and the lights can be seen from very far away.') },
  { tone: 'juntos', title: tr('solos no podemos, juntos sí', 'alone we cannot, together we can'), text: tr('las zonas grises del mundo se restauran entre varias personas. cada vez que el planeta recupera color, todos desbloquean regalos nuevos. aero, el espíritu del agua, te guiará.', 'the gray zones of the world are restored by many people together. every time the planet regains color, everyone unlocks new gifts. aero, the spirit of the water, will guide you.') },
];

export interface Milestone {
  percent: number;
  title: string;
  text: string;
  reward: string;
}

/** hitos comunitarios: se alcanzan entre todos y los regalos son para todos. */
export const MILESTONES: readonly Milestone[] = [
  { percent: 2, title: tr('la primera chispa', 'the first spark'), text: tr('el planeta responde: aparece la primera nube de algodón.', 'the planet answers: the first cotton cloud appears.'), reward: tr('nube de algodón', 'cotton cloud') },
  { percent: 5, title: tr('el bosque de cristal', 'the glass forest'), text: tr('la luz atraviesa la bruma y nace un árbol de cristal.', 'light cuts through the haze and a glass tree is born.'), reward: tr('árbol de cristal', 'glass tree') },
  { percent: 10, title: tr('las ballenas vuelven', 'the whales return'), text: tr('el mar se aclara lo suficiente para que regresen los gigantes azules.', 'the sea clears enough for the blue giants to return.'), reward: tr('ballena azul', 'blue whale') },
  { percent: 25, title: tr('el corazón del aero', 'the heart of aero'), text: tr('el orbe del aero despierta y muestra los recuerdos del planeta.', 'the aero orb wakes up and shows the memories of the planet.'), reward: tr('orbe del aero', 'aero orb') },
  { percent: 50, title: tr('cielos nuevos', 'new skies'), text: tr('mitad del planeta ya brilla. el cielo del mundo se vuelve más claro para todos.', 'half of the planet already shines. the sky of the world gets brighter for everyone.'), reward: tr('cielo aero en el mundo', 'aero sky in the world') },
  { percent: 100, title: tr('el planeta brilla otra vez', 'the planet shines again'), text: tr('la opacidad se ha ido. la era aero vuelve y cada isla es parte de ella.', 'the opacity is gone. the aero era is back and every island is part of it.'), reward: tr('el final de la historia', 'the end of the story') },
];

export function reachedMilestones(percent: number): Milestone[] {
  return MILESTONES.filter((m) => percent >= m.percent);
}

export function nextMilestone(percent: number): Milestone | null {
  return MILESTONES.find((m) => percent < m.percent) ?? null;
}
