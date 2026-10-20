# boceto: mundo de vidrio

estado: propuesta visual; no integrada al juego.

boceto generado: [mundo-de-vidrio-v1.png](concepts/mundo-de-vidrio-v1.png).

## composición

una esfera terrestre de vidrio, con continentes verdes reconocibles sobre su envolvente y un océano interior. las islas de los jugadores están dentro de ese océano, a distintas profundidades; no orbitan fuera del planeta. una cara translúcida permite ver el archipiélago sin perder la silueta terrestre.

mantener las islas ovaladas, arena, palmeras, flores, fuentes y pabellones del juego. combinar su acabado de lápiz con los reflejos blancos, agua brillante y burbujas de las referencias. las islas del boceto son ilustrativas, no usuarios reales.

## revisión del código actual

- src/art/pencil.ts: grano, trazos y conversión de svg a textura de lápiz.
- src/art/scenery.ts: suelo, mar, cielo y composición de portada procedurales.
- src/scene/Backdrop.tsx: fondo rasterizado al iniciar y redimensionar; no es un globo animado.
- src/engine/IslandScene.ts: ticker pixijs para peces, hojas, mariposa y burbujas. ya existe una base de movimiento ambiental reutilizable.

esta revisión fue de código y de las capturas aportadas; no es una validación nueva de ejecución o rendimiento.

## movimiento propuesto para implementación posterior

- reflejo lento sobre la esfera y desplazamiento leve de nubes.
- burbujas ascendentes y ondas discretas dentro del océano.
- selección de isla con halo y acercamiento de cámara hasta entrar al editor existente.
- volver al mundo restaura encuadre y selección.
- reduced-motion conserva una composición estática y permite seleccionar islas mediante controles html.

para una primera versión basta una vista 2.5d por capas en pixijs. una rotación terrestre libre necesitaría definir oclusión y coordenadas esféricas; no está implementada ni debe prometerse a partir de este boceto.

## generación del boceto

herramienta: imagegen integrada. imagen conceptual estática, no gif ni recurso interactivo. no se cambió el motor, editor, catálogo o persistencia.

prompt de dirección: crear una ilustración horizontal original de un mundo terrestre transparente con continentes verdes en su envolvente, océano interior y siete islas decoradas a distintas profundidades. preservar lápiz de colores, grano de papel y contornos del juego; añadir vidrio glossy, reflejos blancos y agua turquesa frutiger aero. isla cercana con arena, palmeras, flores, cristales y pabellón. cielo claro y horizonte acuático. sin texto, marcas ni interfaz. las islas deben estar dentro del globo, no orbitando fuera.
