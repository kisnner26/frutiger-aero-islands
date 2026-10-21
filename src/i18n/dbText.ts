import { lang } from './index';

/** textos que vienen sembrados en español desde la base de datos; en inglés se traducen aquí por su texto original. */
const EN: Record<string, string> = {
  // expediciones
  'enciende el faro azul': 'light the blue lighthouse', 'restaura el arrecife de cristal': 'restore the glass reef', 'eleva la isla de las nubes': 'raise the island of clouds',
  atlántico: 'atlantic', pacífico: 'pacific', 'cielo central': 'central sky',
  'baliza oceánica': 'ocean beacon', 'coral iridiscente': 'iridescent coral', 'muelle flotante': 'floating pier',
  // gadgets
  'cámara aero': 'aero camera', 'fotografía recuerdos de tu isla': 'take photos of your island memories',
  'reproductor wave': 'wave player', 'cambia la música y el ambiente': 'change the music and the ambience',
  'mira planos y visitas': 'see maps and visits', 'recibe retos rápidos': 'get quick challenges', 'abre cámara, radio y minijuegos': 'opens camera, radio and minigames',
  // laboratorio
  'farol de burbuja': 'bubble lantern', 'una luz acuática para las noches de isla': 'a watery light for island nights',
  'terrario de arrecife': 'reef terrarium', 'un micro arrecife de cristal vivo': 'a tiny living glass reef',
  'postal de nube': 'cloud postcard', 'recuerdo coleccionable de una ruta aérea': 'a collectible souvenir of an aerial route',
  'batería wave': 'wave battery', 'carga especial para tus gadgets aero': 'a special charge for your aero gadgets',
  // retos semanales
  'expansión semanal': 'weekly expansion', 'reclama 8 parcelas libres esta semana': 'claim 8 free plots this week', 'insignia de explorador': 'explorer badge',
  conquistador: 'conqueror', 'captura 3 parcelas a otros exploradores': 'capture 3 plots from other explorers', 'insignia de conquistador': 'conqueror badge',
  restaurador: 'restorer', 'restaura 10 zonas dañadas del planeta esta semana': 'restore 10 damaged zones of the planet this week', 'insignia de restaurador': 'restorer badge',
  constancia: 'consistency', 'haz 15 movimientos en el mapa esta semana': 'make 15 moves on the map this week', 'insignia de constancia': 'consistency badge',
  // zonas dañadas
  'el campo seco': 'the dry field', 'el mar turbio': 'the murky sea', 'el puerto de ceniza': 'the ash harbor', 'el valle opaco': 'the opaque valley',
  'la antena apagada': 'the dead antenna', 'el lago de aceite': 'the oil lake',
  'el río gris': 'the gray river', 'la torre apagada': 'the dark tower', 'el jardín marchito': 'the withered garden', 'la plaza vacía': 'the empty square',
  'el faro sin luz': 'the unlit lighthouse', 'la estación fría': 'the cold station', 'el bosque de humo': 'the smoke forest', 'la bahía opaca': 'the opaque bay', 'la ciudad plana': 'the flat city', 'la fábrica muda': 'the silent factory',
};

/** devuelve la versión en inglés de un texto de la base de datos si la conocemos. */
export function db(text: string): string {
  return lang === 'en' ? EN[text] ?? text : text;
}
