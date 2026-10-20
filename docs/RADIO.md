# radio y teléfono aero

## qué es

la radio es una aplicación del teléfono aero (botón del teléfono en la bandeja de la barra de tareas, disponible en todas las vistas). es el único reproductor de música del juego: el menú de inicio y el botón de altavoz de la bandeja controlan el mismo motor (`src/audio/music.ts` es solo una fachada de `src/audio/radio/engine.ts`).

## música: generativa y original

no se incluye ninguna canción grabada. la música se genera en el navegador con web audio (`src/audio/radio/generator.ts`): cada pieza es una semilla determinista (misma semilla, misma música) con tempo, escala, acordes y densidad propios. hay tres emisoras con tres piezas cada una (9 en total):

| emisora | piezas |
| --- | --- |
| acuático | marea de cristal, burbujas lentas, lago al amanecer |
| jardín | paseo de pétalos, invernadero, sendero de luz |
| noche | luciérnagas, luna en el lago, agua quieta |

autor mostrado: "frutiger aero islands, música generativa". es música sintetizada simple (colchones, notas pulsadas, campanas, graves, pulso suave), no una grabación de estudio; no sustituye a un compositor.

para añadir una pieza basta una entrada en `STATIONS` (src/audio/radio/stations.ts); el motor y la interfaz no cambian.

## ambientes

lluvia, olas, aves y burbujas se sintetizan (ruido filtrado, oscilación lenta, trinos y burbujas aleatorias) y se mezclan con la música mediante cuatro conmutadores y un nivel común. se recuerdan.

## comportamiento

- sin audio hasta que la persona pulsa reproducir. la primera vez nunca suena sola.
- si la dejó encendida la última vez, se reanuda con su primer gesto en la visita siguiente (consentimiento previo guardado). al pausar, ese consentimiento se borra.
- cambiar de emisora o pieza hace un fundido cruzado de 1,3 s; pausar y reanudar también hacen fundido.
- la música continúa al cambiar de vista porque el motor vive fuera de las pantallas.
- interrupciones: si el navegador suspende el audio, el estado pasa a "interrumpida" y reproducir lo reanuda. si el navegador no admite web audio, la radio lo dice y no afecta al juego.
- recuerda emisora, pieza de cada emisora, volumen, ambientes, nivel de ambiente y consentimiento (localStorage, clave `frutiger-aero-islands:radio`).
- carga bajo demanda: el panel del teléfono se carga al abrirlo y no se descarga ningún archivo de audio para la música generativa.

## pista personal (opcional, no publicable)

si existe `public/audio/soundtrack.mp3` aparece una emisora "personal" que la reproduce por el mismo motor (se descarga solo al elegirla, 48 mb):

- el autor del juego decidió publicarla (commit "publish authorized island soundtrack"), así que va en el repositorio y en el sitio;
- con `VITE_EXCLUIR_AUDIO_PERSONAL=1` `vite build` la retira del artefacto (`dist/audio`);
- se muestra como emisora "personal" con el autor "autor no indicado". **este proyecto no ha verificado los derechos de la pista** (viene de una descarga de youtube): si su titular reclama, habrá que retirarla.

## teléfono aero

cuerpo retro propio (silueta, teclado físico decorativo y pantalla táctil grande; los controles reales tienen al menos 44 px). aloja hoy una sola aplicación, la radio. no se anuncian aplicaciones inexistentes. el personaje que saca el teléfono no existe todavía.

## verificado

en chrome real con viewport emulado (escritorio y móvil): no se crea contexto de audio antes de un gesto; reproducir pone el contexto en `running` y el analizador mide señal; los ambientes se activan; cambiar de emisora y de pieza funciona; recargar no suena sin gesto; con consentimiento previo suena con el primer gesto; tras pausar no se reanuda. 9 pruebas unitarias (catálogo, determinismo del generador, rango de notas, preferencias).

## límites

- no se comprobó a oído ni con altavoces reales: solo que hay señal y que los nodos funcionan.
- safari/ios: el audio solo arranca con un gesto y puede suspenderse en segundo plano; no se probó en dispositivos reales.
- la calidad musical es la de un sintetizador generativo básico.
