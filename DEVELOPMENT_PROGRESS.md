# progreso

fecha: 2026-10-19.
fase actual: paquetes 01, 02 y 03 implementados en modo local (por indicación directa del usuario de continuar el juego); pendientes de revisión del orquestador. paquetes 04 a 08 sin iniciar.

## sistema comunitario: integración en progreso

- añadido cliente de supabase, rutas `#/auth`, `#/explorar` y `#/island/usuario`.
- añadida migración `supabase/migrations/202610200001_community.sql`: perfiles, una isla por usuario, rls de lectura pública y rpc para alta idempotente y guardado por revisión.
- añadidos formularios de registro, acceso y recuperación; isla propia remota, explorador y vista pública sin paneles de edición.
- el editor conserva copia local y guarda en la nube mediante debounce cuando existe sesión e isla remota.
- pendiente: aplicar migración en supabase y verificar el flujo con dos cuentas reales; no hay credenciales de proyecto configuradas en esta carpeta.

## terminado

- directorio inspeccionado: vacío, sin repositorio git ni código previo.
- brief leído y referencia visual inspeccionada en fuente y navegador.
- arquitectura, modelo relacional, contratos, criterios y paquetes redactados.
- usuario eligió implementación por sonnet externo; no se delegó a un modelo distinto.

## paquete 01: base e identidad visual (entregado, pendiente de revisión)

archivos creados: package.json, package-lock.json, index.html, tsconfig.json, vite.config.ts, .gitignore, .env.example, src/main.tsx, src/app/App.tsx, src/app/useHashRoute.ts, src/styles/tokens.css, src/styles/global.css, src/ui/GlassPanel.tsx, src/ui/GlossyButton.tsx, src/scene/Backdrop.tsx, src/scene/IslandIllustration.tsx, docs/ASSETS.md, docs/capturas/*.png, .claude/launch.json (config del preview); README.md actualizado.

comandos ejecutados:
- npm install (react 19, react-dom, vite 8, typescript 7, vitest 5, plugin react): sin vulnerabilidades.
- npm run typecheck: correcto.
- npm run build: correcto (js 230.9 kb, css 7.7 kb).
- npm test: sin archivos de prueba, sale con código 0 (--passWithNoTests); no hay lógica que probar aún.
- npm run dev: sirve la portada en localhost:5173.

verificación en navegador (viewport emulado por cdp, chrome headless y navegador del app):
- 390 × 844 y 1440 × 900, rutas #/ y #/introduccion: scrollWidth igual a innerWidth, sin scroll horizontal; ningún enlace con alto menor de 44 px.
- navegación hash: enlace, atrás, adelante y carga directa de #/introduccion funcionan; el foco pasa al título al cambiar de vista (no en la carga inicial); el título del documento cambia.
- texto de interfaz en español y minúsculas, sin emojis (comprobado sin mayúsculas en el texto visible).
- animaciones ambientales (flotar, nubes, burbujas, entrada) solo bajo prefers-reduced-motion: no-preference; el contenido es visible sin ellas. no se probó con la preferencia activada en el sistema, solo por lectura del css.
- capturas reales en docs/capturas: inicio y introduccion a 390x844 y 1440x900.

criterios no verificados: contraste medido con herramienta (texto tinta sobre vidrio ~80 % opaco, solo revisión visual); prueba en dispositivo táctil real; navegación con tab revisada por lectura (foco visible global), no recorrida manualmente.

ajuste de fidelidad visual (revisión de la referencia en modo diurno y nocturno): agua saturada con rayos de luz, título pesado con degradado y sombra blanca sobre la escena, boyas esféricas glossy con icono como navegación (inicio, introducción), burbujas grandes con brillo, franja de pasto al pie y etiquetas en mono. se mantiene la variante diurna; la nocturna de la referencia (medusas, luna) no se implementó. capturas regeneradas tras el ajuste; typecheck y build repetidos.

limitaciones: la escena es una ilustración svg, no el motor ni el editor. sin botones de sesión ni galería. supabase no se instancia.

## continuación: isla jugable, arte a lápiz, banda sonora (pendiente de revisión)

solicitud del usuario: seguir creando el juego, que sea entretenido y fácil de viciar, con su pista como banda sonora; después, arte tipo dibujo a lápiz de colores (bonito, realista, original), sin abusar de botones.

**qué existe ahora**
- motor pixi 8 (carga diferida, dpr <= 2, pausa con la pestaña oculta, destruye contexto y listeners al desmontar): src/engine/{IslandScene.ts, SceneView.tsx, camera.ts, projection.ts}. proyección afín fija 2.5d, profundidad por y con desempate por id, zoom 0.5–2.5, pan, pinza de dos dedos, rueda, doble clic para reiniciar, arrastre con cancelación.
- dominio: src/domain/{island,geometry,charm}.ts; catálogo de 8 decoraciones en src/catalog/catalog.ts; geometría de tierra/agua y límite de 150 objetos.
- editor y guardado local: src/features/editor/* (comandos con deshacer/rehacer de 50, validación, colocar/mover/girar/escalar/quitar, lista de objetos con campos numéricos accesibles), src/persistence/localDraft.ts (borrador versionado, json corrupto en cuarentena, cuota sin romper la sesión, interfaz IslandRepository).
- bucle de juego: burbujas y burbujas doradas con combo (ventana de 2,5 s), mariposa de bonificación, moneda "brillos", "encanto" por valor, variedad y armonía, 10 niveles que desbloquean decoraciones y dan brillos. todo local; no hay usuarios, votos ni rankings simulados.
- música: src/audio/music.ts y MusicControl.tsx; arranca en el primer gesto del usuario si la preferencia lo permite, volumen y estado recordados.
- arte: ilustraciones svg originales generadas por tools/gen_art.py y filtro de lápiz de colores (src/art/pencil.ts, scenery.ts). fondo, suelo e ilustración de portada dibujados con trazos procedurales. se retiraron los svg planos anteriores y las esferas de navegación.
- interfaz con menos botones: portada con un solo botón glossy ("jugar") y un enlace de texto; en el juego solo deshacer/rehacer, acciones contextuales del objeto seleccionado, el catálogo y la música.

**comandos ejecutados (resultados reales)**
- npm run typecheck: correcto.
- npm run build: correcto (chunk del editor y pixi aparte, ~278 kb sin comprimir).
- npm test: 2 archivos, 21 pruebas correctas (geometría de borde, ida y vuelta de proyección, cámara/zoom, comandos e historial de 50, objeto 151 rechazado, escala/zona inválidas, nivel que no baja, encanto, borrador: ida y vuelta, json corrupto, cuota).
- verificación en navegador (viewport emulado por cdp en chrome headless y navegador del app): 390 × 844 y 1440 × 900 en #/, #/introduccion y #/isla sin scroll horizontal, sin objetivos táctiles menores de 44 px fuera del catálogo (las tarjetas del catálogo no se midieron como objetivo), sin errores de consola. captura con prefers-reduced-motion activado: la isla se dibuja y las burbujas quedan estáticas.
- interacción comprobada en el navegador del app: elegir palmera y colocarla (descuenta brillos y sube de nivel con bonificación), colocación inválida rechazada con aviso, reventar burbuja dorada (+25), arrastre de objeto con eventos de puntero (posición guardada en el borrador), la música arranca y el botón pasa a pausar.
- 20 navegaciones #/ <-> #/isla: siempre 2 canvas (fondo + pixi) y sin avisos de contexto webgl duplicado.
- rendimiento medido: 150 objetos, 60 fps de rAF y ticker de pixi en ~63 fps, 1100 × 712 css px con dpr 2, apple m1, navegador chromium del app. es un portátil, no un móvil; no se afirma rendimiento móvil real. la generación del dibujo inicial (suelo ~440 ms, fondo ~120 ms, 8 texturas ~30 ms cada una) bloquea el hilo principal unos 0,8 s al abrir el juego por primera vez; el suelo se cachea después.

**no verificado / limitaciones**
- la pista suena en el navegador del app, pero no se evaluó volumen ni transiciones; su licencia es desconocida; el autor decidió publicarla y quedó en el repositorio (véase docs/ASSETS.md).
- no se probó tacto real ni gestos de dos dedos en dispositivo (solo código y emulación); no se recorrió todo con tab; contraste solo a ojo.
- el estilo lápiz es procedural (no ilustración a mano): se acerca al boceto de referencia pero no iguala su realismo; las decoraciones son pequeñas para el tamaño de la isla en móvil.
- no existen todavía: pruebas e2e, cuentas, guardado remoto, comunidad ni despliegue (paquetes 04 a 08). la nota "listo/pendiente" de la página de introducción lo refleja.
- la captura isla-*.png usa un borrador local de muestra con 14 objetos para fotografiar el juego.

## rediseño frutiger aero + interfaz windows vista / wii u (pendiente de revisión)

solicitud del usuario: llevar el juego "lo más frutiger aero posible" con las animaciones de sus referencias (burbujas de cristal, peces, agua, juncos), usar interfaz de windows vista y de la wii u, y hacerlo atractivo para que la gente quiera crear sus islas. el usuario lo publicará en un grupo de facebook donde ya es conocido.

**hecho**
- escenario: cielo con nubes cúmulo, montañas con neblina, lago con reflejo ondulado, cáusticas animadas, destellos, juncos que se mecen y burbujas de cristal con paisaje invertido (src/art/aero.ts, scenery.ts, src/engine/aeroLife.ts).
- vida ambiental: peces nadando (dorado, payaso, azul), un pez dorado que salta con salpicaduras (se puede atrapar para un bono), burbujas coleccionables de cristal, mariposa y hojas. con prefers-reduced-motion todo queda estático salvo la aparición de burbujas.
- interfaz windows vista: ventanas de cristal con barra de título brillante y botones minimizar/cerrar, barra de tareas con orbe de inicio, menú de inicio, bandeja con música y reloj real, globos de notificación, barra de progreso verde brillante (src/ui/AeroWindow.tsx, Taskbar.tsx, Balloon.tsx, src/styles/aero.css).
- interfaz wii u: fichas de canal brillantes para el catálogo y la portada, barra superior de cristal con avatar, brillos y nivel.
- sonido: efectos sintetizados (pop, moneda, colocar, salpicadura, subir de nivel, error) con opción de silenciarlos; la música sigue siendo la pista local.
- portada: ventana de bienvenida con dos canales (mi isla, cómo se juega) sobre el escenario y la isla dibujada.
- ilustraciones de decoración rehechas con más detalle (tools/gen_art.py) y filtro de lápiz; peces nuevos.

**verificado (resultados reales)**
- npm run typecheck, npm run build y npm test (21 pruebas) correctos.
- chrome headless con viewport emulado: 390 × 844 y 1440 × 900 en las tres rutas sin scroll horizontal ni errores de consola; sin objetivos táctiles menores de 44 px, salvo los botones de sistema de las ventanas (36 × 22 con puntero fino, como en vista; en pantallas táctiles pasan a 48 × 34) y las fichas del catálogo, que no se midieron. captura con reduced-motion activado.
- navegador del app (apple m1, dpr 2, 1440 × 900): 150 objetos con todas las capas aero, 60,1 fps de requestAnimationFrame, peor fotograma 18 ms, ticker de pixi 59,9 fps. no es un móvil; no se afirma rendimiento móvil.
- menú de inicio: abre, lista 3 enlaces y 2 conmutadores, cierra con escape.

**no verificado / limitaciones**
- sin pruebas en dispositivo táctil real, ni lectores de pantalla, ni recorrido completo con tab; contraste a ojo.
- el pez saltarín, la mariposa y los efectos de sonido se programaron pero no se capturaron en acción (son aleatorios); sonido no comprobado de oído.
- las decoraciones siguen siendo ilustración procedural con grano de lápiz; la palmera se ve algo densa.
- la pista mp3 no tiene licencia verificada por este proyecto; el autor decidió publicarla (commit de codex). si hay una reclamación, `VITE_EXCLUIR_AUDIO_PERSONAL=1` la retira del artefacto.

**para el lanzamiento en el grupo de facebook (decisiones del usuario necesarias)**
- hoy cada persona solo tiene su isla en su propio dispositivo: no hay cuentas, guardado en la nube, galería ni visitas. el usuario espera usuarios desde el primer día, así que los paquetes 04 a 08 (supabase, cuentas, comunidad, calidad, despliegue) son el camino crítico. hace falta que el usuario cree el proyecto de supabase (url y clave pública) y decida el nombre del repositorio de pages.
- contenido de usuarios: nombres de usuario y descripciones públicas necesitarán reglas de moderación y límites; ya están previstos en la arquitectura (nombres reservados, límites de texto) pero no implementados.

## vista mundo: prototipo de navegación mundo → archipiélago → isla (pendiente de revisión)

alcance: solo navegación visual; **no hay comunidad conectada** ni otros jugadores. no se cambió la economía, el catálogo ni el guardado.

**qué existe**
- ruta `#/mundo`, accesible desde la portada (canal "mundo"), el menú de inicio y la barra de tareas de la isla (botón "mundo").
- planeta lejano dibujado por código (src/art/planet.ts): esfera sombreada con continentes trazados a mano (norteamérica, sudamérica, europa y asia, áfrica, australia, groenlandia, antártida e islas), lápiz, borde de vidrio y un solo reflejo discreto. los contornos son simplificaciones propias, no datos externos; no hay imágenes de ia. el boceto generado por ia que existe en docs/concepts/ no se usa como recurso.
- transición breve (1,35 s) hacia el interior: el disco del planeta crece y revela la cuenca oceánica con costas verdes en el borde, cáusticas, peces, burbujas de cristal y marco de vidrio. con prefers-reduced-motion el cambio es inmediato y las capas ambientales quedan estáticas.
- archipiélago: mi isla (con mis objetos reales leídos del borrador local, bandera roja) y cinco islas de ejemplo del prototipo, rotuladas así en la interfaz. cámara con arrastre, rueda, pellizco, teclado (flechas, + y -) y lista accesible "islas del mundo" como alternativa.
- seleccionar mi isla abre una tarjeta con objetos y nivel y el enlace "entrar a mi isla" (editor actual). volver al mundo desde la isla (barra de tareas o menú) restaura el archipiélago con mi isla seleccionada; la vista (modo, cámara, selección) se guarda en sessionStorage.
- motor: pixijs 2.5d por capas (src/engine/WorldScene.ts, WorldView.tsx); reutiliza pencil.ts, scenery.ts (suelo y proyección), aeroLife.ts (texturas de cáusticas, peces, burbujas). sin motor 3d.

**verificado**
- typecheck, build y 30 pruebas correctas (nuevas en tests/world.test.ts: continentes en puntos conocidos, composiciones de ejemplo válidas en geometría, cámara, restauración de vista).
- chrome headless con viewport emulado, 1440 × 900 y 390 × 844: vista lejana, transición, archipiélago, tarjeta y selección; sin scroll horizontal ni errores de consola. flujo completo en escritorio: mundo → mi isla → editor muestra los 6 objetos del borrador → botón "mundo" → vuelve al archipiélago con la tarjeta de mi isla. captura con movimiento reducido.

**fallo corregido de paso**: al reventar una burbuja se leía la posición de un sprite ya destruido y la recompensa no se concedía (introducido en el rediseño aero). arreglado en IslandScene.ts.

**limitaciones**
- sin rotación libre del planeta ni oclusión esférica; la ilusión de "dentro del globo" es una cuenca con costas y marco de vidrio.
- la lista de islas, la selección y la tarjeta funcionan por teclado, pero no se probó con lector de pantalla ni en dispositivo táctil real.
- "mi isla" se lee del borrador local; cuando exista la isla remota habrá que alimentar el mundo desde el repositorio de la comunidad.
- coordinación: otra sesión está añadiendo comunidad (auth, explorar, visitas) en este mismo directorio. su `MyIslandPage` redirigía a `#/auth` sin supabase configurado; se restauró el modo local (una línea en src/features/community/IslandPages.tsx) porque el contrato del paquete 05 exige mantener el juego local sin variables. conviene que esa sesión lo confirme.

## radio y teléfono aero (primera entrega de los cinco sistemas)

alcance de esta entrega: **solo la radio** (con el teléfono mínimo que la aloja). recuerdos, concursos pequeños, rutas de mascotas y visitas con huella **no están implementados**: dependen de piezas que no existen (cámara, mascotas, expansiones, backend desplegado). la auditoría, dependencias, contratos y orden están en docs/INTEGRATION_PLAN.md.

**qué funciona**
- motor único de radio con web audio (src/audio/radio): 3 emisoras (acuático, jardín, noche) × 3 piezas generativas originales con título y autor, 4 ambientes (lluvia, olas, aves, burbujas), volumen, nivel de ambiente, fundido cruzado al cambiar, estado de interrupción y de error, preferencias recordadas.
- sin reproducción automática: la primera vez solo suena tras pulsar reproducir; con consentimiento previo se reanuda con el primer gesto; al pausar se retira el consentimiento. cambia de vista sin cortarse.
- `music.ts` ahora es una fachada del motor: el menú de inicio y el altavoz de la bandeja controlan el mismo reproductor (sin versiones paralelas). la pista personal mp3 sigue disponible como emisora opcional por el mismo motor y se elimina del artefacto de compilación.
- teléfono aero (botón en la bandeja): cuerpo retro propio, pantalla grande, controles de 44 px o más; hoy aloja solo la radio.

**verificado**
- typecheck, build y 39 pruebas correctas; `dist/` no contiene audio.
- chrome real, 1440 × 900, 390 × 844 y movimiento reducido: sin contexto de audio antes del gesto; reproducir deja el contexto en running y el analizador mide señal; ambientes, cambio de emisora y de pieza; recarga sin sonido; reanudación con consentimiento previo; pausa borra el consentimiento; sin scroll horizontal ni errores; ningún control del teléfono menor de 44 px (salvo deslizadores, cuya pista mide 44 px de alto).
- no se escuchó con altavoces reales; solo se midió señal. sin pruebas en safari/ios ni dispositivos táctiles.

**pendiente de esta línea**: aplicación cámara y álbum; el personaje que saca el teléfono (no existe).

## cámara y álbum local (siguiente entrega de los cinco sistemas)

**qué funciona**
- cámara (teléfono → cámara → abrir cámara): oculta la interfaz, permite encuadrar (arrastre) y acercar (0,5–2,5), muestra la fotografía antes de guardarla y solo la conserva si la persona lo decide. la captura es real: fondo del lago más capas de pixi, sin controles html ni marcas de edición (src/engine/IslandScene.ts `capture()`).
- álbum: línea de tiempo por día, tipo, hora, descripción y origen "solo en este dispositivo"; abrir, descargar, compartir (hoja del navegador con alternativa) y eliminar con confirmación. estado vacío útil. límites: 40 recuerdos, 14 mb, 900 kb por foto (jpeg 1280 px, calidad 0,82). indexeddb.
- recuerdo de creación de la isla: se registra al instante con la fecha real y, cuando la escena está lista, se le añade la captura; una sola vez (atómico, sin duplicados ni siquiera con el doble montaje de desarrollo). los recuerdos de expansión, mascota y concurso, y la comparación antes/después, **no existen** porque esos sistemas no existen.
- documentación: docs/CAMARA_ALBUM.md.

**verificado en chrome (escritorio y móvil, flujo completo)**: abrir cámara, interfaz oculta, zoom, vista previa 1280 × 800 (escritorio) y 390 × 844 (móvil), conservar, descartar (no guarda), salir, álbum con 2 recuerdos, recarga (persisten), confirmación, cancelar (no borra), eliminar; controles de la cámara de al menos 44 px; sin errores de consola. 8 pruebas del almacén y sus límites (fake-indexeddb). fallo encontrado y corregido: el recuerdo de creación se duplicaba y no recibía su foto con el doble montaje.

## país, zona en el mundo y banderas

véase docs/WORLD_COUNTRIES.md. selector de país con búsqueda y banderas (137 países), la isla se ubica en la zona de su país dentro del mundo (mapa interior con continentes), bandera ondeante plantada en la isla del juego, en cada isla del mundo y en el HUD. migración sql de país escrita **sin aplicar**; sincronización remota **sin verificar con backend real**. capacidad de la cuenca: decenas de islas (no escala a miles sin vista jerárquica).

## pulido de transiciones, menús y flujos

- velo de cristal al abrir la isla/mundo y al volver (burbuja de cristal, ondas y peces; mínimo 0,75 s, se retira cuando la escena está lista, máximo 9 s) y acercamiento suave de la cámara al entrar; entradas escalonadas de la interfaz; con movimiento reducido solo hay fundidos.
- menús: botones de cristal unificados (primarios azules), menú de inicio con cabecera (usuario, bandera), dos columnas, pie simétrico y página actual marcada; portada centrada con canales 3 + 2 simétricos y glifos con sentido (cuenta = persona, explorar = lupa); catálogo, barras y cabeceras centrados.
- flujos con lógica (docs/FLUJOS.md): con sesión, "cuenta" muestra la cuenta (usuario, país, ir a mi isla, ver el mundo, cerrar sesión) en vez de pedir entrar otra vez; portada y menú de inicio reflejan la sesión; con cuenta el mundo muestra la isla guardada en la nube; el país del perfil manda tras iniciar sesión.
- **no verificado con una cuenta real** (no hay credenciales de prueba): la comprobación se hizo con una sesión ficticia que solo existe en desarrollo (`localStorage dev-sesion`, excluida de las compilaciones de producción).

## coordinación con la otra sesión
el directorio lo comparte otra sesión que mantiene comunidad y cuentas (AuthPage, IslandPages, supabase). cambios míos en archivos suyos: IslandPages.tsx (modo local sin supabase), App.tsx (rutas, velo, canales) y un envoltorio `Cuenta` que decide entre el formulario y el panel; no toqué AuthPage.tsx ni supabase.ts.

## pendiente

- revisión de los paquetes 01 a 03 por el orquestador y del arte por el usuario.
- decidir la pista definitiva con licencia verificada antes de publicar.
- paquete 04: migraciones y autorización (supabase), no iniciado.
- pendiente opcional: variante nocturna con medusas como en la referencia, más decoraciones y más animaciones (más especies de peces, olas, medusas).

- implementar fases 2–8, migraciones, pruebas y despliegue.
- disponer de proyecto supabase, configuración pública, correo de auth y nombre real de repositorio remoto cuando corresponda.

## pruebas y errores conocidos

solo existe la base visual; typecheck y build correctos. no hay pruebas unitarias, migraciones ni funcionalidad del mvp validada. sin defectos conocidos abiertos del paquete 01.

## decisiones

react/typescript/vite, pixijs 2.5d, css propio, postgres normalizado, guardado atómico por revisión, rutas hash y recursos originales. véase docs/ARCHITECTURE.md.

## protocolo de actualización

por entrega registrar archivos modificados, comandos ejecutados con resultados, evidencia visual, defectos abiertos y siguiente tarea. no convertir un criterio pendiente en completado sin evidencia. separar verificado localmente, verificado en supabase y verificado en despliegue público.
