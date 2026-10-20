# recursos y autoría

## ilustraciones

todas las ilustraciones son originales y se generan con código propio, sin imágenes ni recursos externos.

| recurso | origen | autoría y licencia |
| --- | --- | --- |
| decoraciones (palmera, árbol, flores, roca, cristal, fuente, pabellón, pez dorado) | public/assets/decorations/*.svg, generadas por tools/gen_art.py | código propio del proyecto |
| hoja, mariposa, burbujas | public/assets/ui/*.svg, generadas por tools/gen_art.py | código propio del proyecto |
| suelo de la isla, cielo, mar y pasto | src/art/scenery.ts, dibujados con trazos procedurales en canvas | código propio del proyecto |
| filtro de lápiz de colores (grano de papel, contorno tembloroso, rayado) | src/art/pencil.ts | código propio del proyecto |
| peces de ambiente (dorado, payaso, azul), mariposa, hoja | public/assets/ui y decorations, generadas por tools/gen_art.py | código propio |
| interfaz estilo windows vista (ventanas de cristal, barra de tareas, menú de inicio, globos) y fichas estilo wii u | src/ui/*, src/styles/aero.css | css y svg propios; se imita el estilo, no se usan logotipos, iconos ni recursos de microsoft o nintendo |
| efectos de sonido (pop, moneda, colocar, salpicadura, nivel) | src/audio/sfx.ts | sintetizados con webaudio |
| icono de pestaña | index.html (data uri) | esfera de gradiente propia |

estilo: decoraciones pintadas a mano con grano de lápiz (svg detallados → filtro src/art/pencil.ts) sobre un escenario frutiger aero procedural: cielo con nubes cúmulo, montañas, lago con reflejos, cáusticas, burbujas de cristal con paisaje invertido, juncos y destellos (src/art/aero.ts, src/art/scenery.ts, src/engine/aeroLife.ts). para regenerar los svg: `python3 tools/gen_art.py`.

tipografía: pila local (nunito si está instalada, segoe ui, frutiger, ui-rounded, system-ui); no se descarga ninguna fuente. la referencia usa nunito de google fonts; incorporarla requiere documentar su licencia (ofl).

referencias visuales (solo inspiración, nada copiado): https://kisnner26.github.io/kisnner26/, el boceto a lápiz y la pintura acrílica, las imágenes de burbujas de cristal sobre un lago y los collages de peces, juncos y salpicaduras aportados por el usuario; y la estética de windows vista y wii u. no se copió código, imágenes ni audio de ninguna referencia.

## banda sonora

pista local aportada por el usuario: `public/audio/soundtrack.mp3` ("a calm frutiger aero playlist", 33:55, 48,8 mb). el archivo viene de una descarga de youtube hecha con un conversor, por lo que **su licencia es desconocida**. por eso:

- está en .gitignore y no se versiona ni se publica con el repositorio.
- el juego funciona sin ella: si el archivo no existe, el control de música muestra "pista no disponible".
- antes de desplegar públicamente hay que sustituirla por música con licencia verificada (propia, libre de derechos o con permiso del autor), o excluirla del artefacto de despliegue. `vite build` copia public/ a dist/, así que dist/ contendría el mp3 mientras exista el archivo.
