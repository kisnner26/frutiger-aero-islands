# cámara y álbum de recuerdos (local)

## qué hace

- **cámara** (aplicación del teléfono): "abrir cámara" oculta toda la interfaz del juego para encuadrar; se puede arrastrar para mover la vista, acercar con el control de zoom (0,5–2,5) y ocultar los controles de la cámara. el obturador fotografía la escena real: el fondo del lago más las capas de pixi (isla, objetos, peces, burbujas, reflejos). los controles html, el catálogo, la barra de tareas y las marcas de selección no entran en la imagen. no se usa ninguna imagen prediseñada.
- la foto se muestra antes de guardarse. solo se conserva si la persona pulsa "conservar en el álbum"; "descartar" la elimina. no se guarda, publica ni comparte nada automáticamente.
- **álbum** (aplicación del teléfono): línea de tiempo por día, más reciente primero. cada recuerdo muestra tipo, hora, descripción y su origen ("guardado solo en este dispositivo"). abrir un recuerdo permite descargar el jpeg, compartirlo con la hoja de compartir del navegador (si no la admite, lo dice y sugiere descargar) y eliminarlo con confirmación explícita. el estado vacío explica cómo empezar.

## recuerdos que se registran hoy

| tipo | cuándo | captura |
| --- | --- | --- |
| creación de la isla | la primera vez que se abre la isla local sin borrador previo, una sola vez | una captura real automática de la isla recién creada |
| fotografía | cuando la persona decide conservarla | la captura tomada |

no se genera ningún recuerdo al mover objetos. **no se registran todavía** expansiones, mascotas ni concursos porque esos sistemas no existen; tampoco hay comparación antes/después. las fechas son las del reloj del dispositivo en el momento del registro; no se inventan fechas ni eventos.

## límites y almacenamiento

- 40 recuerdos como máximo, 14 mb en total y 900 kb por fotografía. las capturas se comprimen a jpeg (calidad 0,82, lado mayor 1280 px).
- al llegar a un límite se avisa con un mensaje accionable y no se guarda nada; el álbum nunca borra por su cuenta.
- almacenamiento: indexeddb del navegador (base `frutiger-aero-islands`, almacén `recuerdos`). si el navegador no lo permite, el álbum lo indica y el juego sigue.
- **todo es local**: borrar los datos del navegador borra el álbum. no hay recuerdos sincronizados ni cuenta asociada; compartir una foto no publica el resto del álbum. la sincronización futura necesitará almacenamiento remoto privado con cuota por usuario (véase INTEGRATION_PLAN.md).

## detalles técnicos

- `IslandScene.capture()` (src/engine/IslandScene.ts): oculta marcas y fantasma, renderiza, extrae las capas con `renderer.extract`, las compone sobre el canvas del fondo y devuelve un jpeg.
- `sceneBridge` registra la escena activa para que el teléfono no dependa del editor.
- lógica pura y probada en src/memories/logic.ts; almacén en src/memories/store.ts.
