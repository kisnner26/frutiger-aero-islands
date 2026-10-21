# aero arena y paintball royale

`#/arena` reúne todos los modos de batalla en un solo lugar (como los modos de un juego grande): **paintball royale** (primera persona), **aero royale** (vista aérea con orbes) y **aero blob**. los tres comparten rango, experiencia, medallas y misiones diarias (`src/features/royale/progress.ts`) y la misma pantalla de resultados.

## paintball royale (`#/paintball`)
- 8 jugadores en una arena circular con árboles y rocas como cobertura; la opacidad gris cierra la zona segura en 6 fases y fuera de ella se pierde vida.
- 3 manchas y quedas fuera, 12 bolas por cargador (recarga 1,5 s), disparo con alcance y bloqueo por obstáculos.
- controles: w a s d, ratón (clic para capturarlo), clic o espacio para disparar, r recarga; en móvil, joystick a la izquierda, arrastrar a la derecha para mirar y botón de disparo.
- partidas: práctica contra 7 bots, o salas por código en línea (supabase realtime, mismo sistema que aero royale). cada máquina manda sobre su jugador; quien crea la sala manda sobre los bots. no hay validación en el servidor: es una sala entre amigos, no un modo competitivo.
- código: `sim.ts` (simulación pura con pruebas en `tests/paintball.test.ts`), `render.ts` (primera persona), `net.ts`, `PaintballPage.tsx`.

## límites conocidos
- realtime de supabase en el plan gratuito limita los mensajes por segundo de todo el proyecto: con muchas salas a la vez puede ir lento.
- las partidas en línea no se han probado con varias personas reales todavía.
