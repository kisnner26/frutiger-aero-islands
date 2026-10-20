# paquetes de implementación para sonnet externo

ejecutar en orden. copiar el bloque común y el paquete correspondiente al agente sonnet 5.5, esfuerzo medio, con acceso a esta carpeta. adjuntar docs/ARCHITECTURE.md y DEVELOPMENT_PROGRESS.md si el agente no comparte filesystem. no basta enviar solo el número de paquete.

## instrucciones comunes para cada entrega

trabaja en /Users/kisito/Documents/frutiger-idea. implementa únicamente el paquete solicitado y sus dependencias ya aprobadas. inspecciona primero el estado actual, instrucciones locales y progreso. respeta docs/ARCHITECTURE.md como contrato. si una contradicción impide implementarlo, explica el problema antes de cambiar arquitectura.

todo texto de interfaz y documentación en español y minúsculas, sin emojis. identificadores técnicos conservan las mayúsculas que requieran sus herramientas. css propio; sin interfaces genéricas ni bibliotecas de componentes. recursos svg originales, no imágenes de licencia desconocida. no copiar música ni recursos del portfolio. no generar usuarios, votos o rankings falsos. no incluir secretos ni atribuciones de ia en commits, prs o documentación publicada.

no sobrescribas trabajo ajeno. usa versiones compatibles verificadas y lockfile. para cada funcionalidad implementa estados vacío, carga, error y éxito, con controles html accesibles y foco visible. no anuncies funcionalidad no operativa. sin backend configurado, identificar claramente el modo local y no simular autenticación o comunidad.

entrega código mantenible, pruebas de comportamiento pertinentes y evidencia de los comandos realmente ejecutados. si hay git, commits pequeños por cambio independiente: base, escena, editor, backend, comunidad y documentación por separado cuando corresponda; no commits vacíos ni publicación remota automática. no inicializar ni publicar un remoto con nombre supuesto.

al terminar actualiza DEVELOPMENT_PROGRESS.md con resultado de criterios, archivos, comandos, limitaciones y siguiente tarea. devuelve resumen de cambios, resultados de pruebas, capturas reales cuando haya interfaz y bloqueos. no avances al siguiente paquete sin revisión del orquestador. un comando preparado no equivale a una prueba ejecutada.

## paquete 01: base e identidad visual — fase 2

objetivo: aplicación local arrancable con portada aero y navegación operativa, lista para incorporar el motor.

leer arquitectura y referencia https://kisnner26.github.io/kisnner26/. crear package.json, lockfile, index.html, tsconfig, vite.config.ts, .gitignore, .env.example, src/main.tsx, src/app/App.tsx, src/styles/tokens.css, src/styles/global.css, src/ui/GlassPanel.tsx, src/ui/GlossyButton.tsx y docs/ASSETS.md. dividir archivos adicionales por responsabilidad si hace falta.

dependencias mínimas: react, react-dom y tipos, typescript, vite y plugin react, vitest para lógica posterior. no añadir servicios externos. scripts dev, build, preview, typecheck y test. .env.example define VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY y VITE_BASE_PATH sin valores secretos; no instanciar supabase aún.

portada: isla ilustrada original, agua y cielo, logotipo textual, explicación breve y navegación hash a una vista local de introducción. etiquetar explícitamente la escena de esta fase como ilustración; no fingir que el editor existe. no mostrar botones de sesión o galería operativos hasta implementar sus destinos. componentes glass con bordes blancos y reflejos; interfaz compacta sobre paisaje. no dedicar la pantalla a tarjetas de marketing.

entregables visuales: tamaños 390 × 844 y 1440 × 900, sin scroll horizontal, texto legible, objetivos táctiles 44 px, foco y reduced-motion. no interceptar tab. animación ambiental css sutil; respetar preferencia de movimiento. contenido esencial visible si las animaciones se desactivan.

aceptación: npm install inicial, npm run typecheck y npm run build terminan correctamente; npm run dev sirve portada; rutas introducción/inicio funcionan con atrás/adelante y recarga. comprobar ambos tamaños en navegador. conservar capturas reales y añadir al readme. no marcar editor completo.

## paquete 02: motor y escena local — fase 3

dependencia: paquete 01 revisado. objetivo: sustituir ilustración por una isla renderizada e interactiva, usando datos locales declarados.

crear src/domain/island.ts, src/domain/geometry.ts, src/catalog/catalog.ts, src/engine/IslandScene.ts, src/engine/camera.ts, src/engine/projection.ts, src/engine/SceneView.tsx, public/assets/decorations/*.svg y tests/geometry.test.ts. instalar pixijs 8 compatible con el entorno y actualizar lockfile. evitar un motor dependiente del ciclo de render de react.

catálogo inicial: palmera, árbol redondeado, flores, roca, cristal, fuente, pabellón de vidrio y pez decorativo. cada elemento con id estable, categoría, ruta, anclaje, radio, rango de escala y orientaciones válidas. pez en zona water, demás en land. documentar autoría. terreno y playa con formas suaves, sombras, gradientes y agua turquesa; sin pixel art.

implementar proyección/inversa, sprites anclados, profundidad por y proyectada y desempate por id, selección técnica para futura edición, pan y zoom 0.5–2.5, reset, touch y resize. camera no altera posiciones. carga diferida, dpr <= 2, pausa por visibilitychange, reduced-motion y limpieza al desmontar. manejar fallo de carga de textura con mensaje y reintento.

aceptación: demo local funciona sin supabase; pruebas de ida/vuelta de coordenadas, límites de cámara y geometría de borde; no listeners o contextos duplicados al navegar 20 veces. comprobar orden de objetos superpuestos, resize, rueda y tacto. typecheck/build aprobados. informar fps medidos con 150 objetos, navegador y hardware; no inventar cifras ni afirmar móvil real si solo se emuló.

## paquete 03: editor y recuperación local — fase 4

dependencia: paquete 02 revisado. crear src/features/editor/{EditorPage,DecorationCatalog,ObjectInspector,EditorToolbar}.tsx, src/features/editor/commands.ts, src/persistence/localDraft.ts, tests/editor.test.ts y tests/editor.e2e.ts; instalar herramienta e2e solo si se necesita y documentar uso.

implementar selección de catálogo, previsualización y colocación, arrastre con captura de puntero y cancelación, eliminación, orientación permitida, escala limitada, deshacer/rehacer de 50 comandos. límite 150 objetos. no crear comando por cada pointermove. impedir zonas inválidas usando la misma fórmula prevista para postgres. un gesto de dos dedos controla cámara sin colocar objetos por accidente.

inspector html ofrece selección y edición de posición, escala y orientación por teclado. atajos no afectan inputs. catálogo por pestañas compactas, panel móvil plegable con botones accesibles. selección se ve en escena y se anuncia en html.

guardar borrador local versionado tras cada comando confirmado, recuperar al recargar, manejar json corrupto y cuota de almacenamiento sin destruir la sesión. indicar “guardado en este dispositivo”; no decir guardado remoto. deshacer/rehacer también persiste. introducir interfaz IslandRepository para integrar backend sin acoplar editor a supabase.

aceptación: colocar, mover, rotar, escalar, eliminar, deshacer/rehacer y recargar conserva resultado; 151.º objeto rechazado; escala inválida y posiciones fuera de zona rechazadas; pointercancel revierte arrastre. probar teclado, tacto y ratón. pruebas del historial, validación y recuperación corrupta. typecheck/build y e2e pertinentes aprobados.

## paquete 04: migraciones y autorización — fase 5a

dependencia: paquete 03 revisado. implementar esquema exacto de docs/ARCHITECTURE.md antes de integrar auth. crear supabase/config.toml, supabase/migrations/ con migraciones de esquema, catálogo, rls y rpc separadas, supabase/tests/{authorization,layout,ratings}.sql, docs/SUPABASE.md y tipos de base de datos.

seed del catálogo debe coincidir con manifiesto visual; añadir comprobación automatizada de ids y reglas. nunca insertar cuentas o votos ficticios en producción. implementar complete_profile, save_island, set_rating, get_island y list_islands según contratos. defaults de isla deben satisfacer las mismas validaciones que un guardado normal.

proteger grant, rls y execute conjuntamente. invalidar escrituras directas a isla/objetos/estadísticas por clientes cuando corresponde; validar transformaciones en triggers además de rpc. catálogo solo administración. perfil e isla se crean juntos después de sesión confirmada y nombre válido. funciones privilegiadas con search_path vacío y auth.uid() explícito; no usar owner_id/user_id aportado por cliente como identidad.

probar anon y usuarios a/b: lectura pública sin correo, acceso al voto propio únicamente, escritura ajena rechazada, voto propio rechazado, voto 0/11 rechazado, unicidad, update correcto de agregados, segunda isla rechazada, nombre duplicado/caso/reservado rechazado, catálogo desconocido/desactivado rechazado, objetos >150, ids repetidos, infinitos, claves inesperadas y posiciones inválidas. verificar revocación de invocación pública de rpc sensibles.

pruebas de concurrencia obligatorias: dos guardados con misma revisión producen un solo ganador; dos votos distintos incrementan sum/count sin pérdida; dos altas del mismo username no crean registros parciales. reversión del lote inválido conserva todos los objetos anteriores. borrar votos/usuarios mantiene estadísticas coherentes.

aceptación: supabase db reset y supabase test db sobre entorno local desechable aprobado por su naturaleza de prueba; nunca resetear proyecto externo. registrar comandos/resultados. si no existe runtime local o acceso remoto de prueba, entregar migraciones y marcar pruebas sql pendientes; fase no aprobada hasta ejecutarlas.

## paquete 05: autenticación y guardado real — fase 5b

dependencia: paquete 04 con pruebas sql aprobadas. crear src/features/auth/, src/features/profiles/, src/persistence/supabaseRepository.ts, src/persistence/saveQueue.ts, src/app/supabase.ts y tests/saveQueue.test.ts. instalar @supabase/supabase-js. configurar cliente solo con url y publishable key.

registro con email/contraseña y username, confirmación de correo, login/logout, recuperación de contraseña y errores accionables. resolver callback antes del router hash; no registrar tokens en consola. completar perfil/isla de forma idempotente cuando exista sesión confirmada. guardar nombre pendiente localmente sin contraseña y permitir corregir si quedó ocupado. usuario autenticado sin perfil debe poder terminar el alta.

conectar editor mediante repositorio y cola serializada. debounce 1200 ms, revisión optimista, copia local por identidad, reintento, estados explícitos. si entran cambios mientras se guarda, enviar snapshot siguiente con revisión nueva. no limpiar borrador reciente al confirmar snapshot viejo. conflicto no reemplaza estado sin elección. evitar que una respuesta vieja de usuario a llegue al estado de b. no dejar escribir visitas ajenas.

sin variables, mantener solo demo local y explicar configuración ausente; no fingir servidor. documentación: proyecto, migraciones, redirect exacto para localhost y pages, publicación de variables, limitaciones de correo y cuotas verificadas en documentación oficial actual.

aceptación: cuentas reales de prueba a/b con confirmación, logout/login y recarga; isla automática una sola vez; cambios sobreviven a recarga y otra sesión; fallo de red recupera copia; dos pestañas detectan conflicto; cambio de sesión no cruza borradores. guardar evidencia sin emails, contraseñas ni tokens. si faltan url/key/proyecto o entrega de correo, describir bloqueo y no declarar fase completada.

## paquete 06: comunidad — fase 6

dependencia: paquete 05 revisado. crear src/features/community/{ExplorePage,IslandCard,VisitPage,RatingControl}.tsx, consultas/repositorios correspondientes y pruebas de comunidad.

explorar, recientes, mejor calificadas y búsqueda por prefijo. páginas <=24; estados vacíos honestos. usar respuesta resumida con miniatura derivada de objetos acotados, no descargar todas las islas ni crear webgl por tarjeta. ranking según fórmula de arquitectura y mostrar por separado promedio real y número de votos. con cero votos mostrar “sin votos”.

visitas /#/island/username, perfil público, cámara, enlace compartible con base correcta y fallback cuando clipboard falle. visitante no puede editar. anónimo ve resultados y puede acceder a login; propietario no puede votar su isla. autenticado asigna entero 1–10 y puede actualizar su voto; no acumular voto por cada clic. validar nuevamente en postgres.

aceptación: a visita y puntúa isla de b; actualiza 4 a 8 y count permanece 1; b no puede votar su propia isla; anónimo no escribe mediante solicitud directa. tarjetas y detalle muestran agregados reales. búsqueda, páginas y enlaces sobreviven a recarga bajo subruta. nunca añadir rankings simulados para llenar pantalla.

## paquete 07: calidad — fase 7

dependencia: paquete 06 revisado. crear docs/QA.md y ampliar tests solo para riesgos o fallos detectados.

ejecutar typecheck, unitarias, sql, integración y e2e del flujo completo; registrar versiones y entorno. revisar navegación por teclado, foco en diálogos, labels, live regions, contraste con fondo real, reduced-motion, errores de red y carga, touch y 390 × 844 / 1440 × 900. comprobar 150 objetos, memoria al desmontar y requests durante arrastre; objetivo <=1 guardado por pausa y ninguna consulta por frame. documentar mediciones reales, no estimaciones como resultados.

matriz de seguridad: a/b/anon, rls y grants, rpc, manipulación directa de ids, revisiones, catálogo, transformaciones, voto y estadísticas. verificar que bundle y git no incluyan secretos privilegiados. texto de usuario debe renderizarse como texto, nunca html; rutas de assets solo catálogo controlado.

aceptación: cero fallos críticos abiertos y todos los criterios finales del brief con evidencia o bloqueo explícito. corregir fallos antes de aprobar fase. no marcar pruebas de dispositivo real si solo hay emulación. el orquestador revisará diff y resultados antes de publicación.

## paquete 08: publicación — fase 8

dependencia: paquete 07 aprobado y repositorio/proyecto externos identificados. crear .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/DEPLOYMENT.md y actualizar README.md con capturas reales del juego.

actions con npm ci, typecheck, pruebas y build; permisos mínimos, deploy mediante artefacto pages, concurrency para evitar despliegues cruzados. no ejecutar pruebas sql destructivas contra producción. usar base real según repositorio; variables supabase públicas a nivel de compilación. revisar configuración de dominio y redirects con usuario cuando el acceso no esté disponible.

preparar despliegue y documentar pasos si no hay autorización/acceso al remoto. no inventar url publicada ni crear cuentas/servicios de pago. obtener credenciales privilegiadas solo por mecanismo seguro si son necesarias fuera del frontend; nunca pedir que se peguen en archivos públicos.

aceptación tras despliegue: assets sin 404, entrada directa a isla por hash y recarga, registro/confirmación/login, edición/persistencia, visita desde otra cuenta, voto y ranking real; comprobar móvil y escritorio. readme breve con enlace real y capturas. solo declarar terminado cuando las 15 condiciones finales del brief estén verificadas.

## revisión de entregas

entregar al orquestador el diff o carpeta actualizada, DEVELOPMENT_PROGRESS.md, salida de comandos y capturas. la revisión comprueba coherencia visual con referencia, seguridad sql, comportamiento verificable y límites declarados. cada defecto se devuelve con archivo, reproducción, resultado esperado y prueba de regresión. no iniciar un paquete dependiente mientras su condición de entrada siga pendiente.
