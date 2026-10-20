# historia, hitos y misiones

**motivo del juego**: el planeta perdió el color por "la opacidad" (una bruma gris de cemento, pantallas planas y silencio). tu isla es un faro aero que todavía brilla. las zonas grises del mapa se restauran entre varias personas y, cada vez que el planeta recupera color, todos desbloquean regalos nuevos. aero, el espíritu del agua, guía al jugador.

## cómo se muestra
- **prólogo** (`src/story/Prologue.tsx`): cuatro pantallas la primera vez que se abre la isla propia. se puede saltar.
- **misiones del faro** (`src/story/missions.ts`, `MissionsPanel.tsx`): 8 misiones calculadas desde la isla (objetos, tipos, agua, nivel, país, visita al mundo). la siguiente aparece como pista en la parte superior del editor.
- **hitos comunitarios** (`src/story/lore.ts`): al 2%, 5%, 10%, 25%, 50% y 100% de planeta restaurado. los regalos de decoración (nube de algodón, árbol de cristal, ballena azul, orbe del aero) se desbloquean para todos cuando el porcentaje global lo alcanza. el porcentaje sale de `restoration_summary()` y se guarda en caché local (`src/world/restorationStore.ts`).
- **mundo**: el planeta empieza dañado (zonas grises con objetos feos: chimeneas, ruinas, árboles secos, basura y charcos). al restaurar, esos objetos desaparecen y aparecen flores. ver docs/CONQUISTA.md.

## contenido
catálogo de 39 decoraciones frutiger aero (`tools/gen_art_extra.py` y `gen_art_extra2.py`), con categorías y niveles de desbloqueo. la migración `202610200014_decorations_2.sql` amplía la lista que acepta el servidor al guardar.

## límites conocidos
- el bloqueo por hito de planeta se aplica en el cliente; el servidor solo valida que la decoración exista. alguien con conocimientos podría guardar una decoración bloqueada.
- las misiones y el prólogo se guardan en este navegador (no en la cuenta).
