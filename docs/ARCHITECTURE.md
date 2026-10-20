# frutiger aero islands: arquitectura

estado: diseño inicial; implementación pendiente. fecha: 2026-10-19.

## dirección visual

referencia del usuario: https://kisnner26.github.io/kisnner26/
se inspeccionaron su html/css y la pantalla de entrada en navegador. la captura observada muestra agua nocturna, medusas luminosas, burbujas, bordes blancos y controles de vidrio. el código también contempla iluminación diurna.

adoptar una estética aero acuática: océano ocupando la pantalla, isla central y controles flotantes compactos. el vidrio comunica profundidad y permite mantener visible el escenario. los reflejos, vegetación verde y agua turquesa corresponden al carácter optimista del juego.

conservar: reflejos blancos, doble borde luminoso, botones glossy, esferas, sombras azuladas, tipografía redondeada y paneles translúcidos. no copiar navegación de portfolio ni reutilizar música, imágenes o código sin comprobar licencia. crear svg propios y registrar autoría en docs/ASSETS.md.

tokens iniciales: tinta #064a73, océano #2b7ea6, agua #5cc8ff, vegetación #b8ff6a; texto sobre superficies claras suficientemente opacas. validar contraste real sobre la escena. fuente local del sistema con preferencia por segoe ui; una fuente redistribuible solo con licencia documentada. tamaños 12/14/16/20/24/32/48 px, espaciado 4/8/12/16/24/32/48/64 px. radios 16 px para paneles, píldoras para acciones. interacciones 150–250 ms. movimiento ambiental desactivable y respetuoso de prefers-reduced-motion. objetivos táctiles de 44 px.

## decisiones

- react + typescript + vite; css propio. interfaz html accesible sobre pixijs 8 cargado de forma diferida. no servidor permanente.
- pixijs permite sprites, transformaciones y profundidad con un modelo de escena independiente de react. perspectiva 2.5d fija; rotar objetos significa cambiar orientación gráfica admitida, nunca rotar la cámara.
- supabase auth y postgres. sin realtime, storage ni edge functions inicialmente.
- rutas hash: /#/island/usuario, /#/editor, /#/explore y /#/auth. base de vite configurable; no asumir que la carpeta local es el nombre del repositorio remoto.
- demo local identificada como tal, separada de datos comunitarios. sin configuración externa, no presentar registro, votos ni guardado remoto como operativos.
- objetos normalizados, no layout jsonb persistente: claves foráneas al catálogo y restricciones por objeto verificables en sql. json es únicamente el formato del lote de guardado y de la copia de recuperación local.

## estructura objetivo

```text
src/
  app/                 rutas, inicialización y límites de error
  features/auth/       sesión, registro, confirmación y recuperación
  features/profiles/   alta idempotente y perfil público
  features/editor/     comandos, selección e historial
  features/community/  galería, visitas y votos
  engine/              cámara, proyección, sprites e interacciones
  catalog/             manifiesto y carga de recursos
  persistence/         repositorio remoto, demo y recuperación
  domain/              tipos y validadores puros
  ui/                  controles html accesibles
  styles/              tokens y estilos
public/assets/         svg propios
supabase/migrations/   esquema, restricciones, rpc y permisos
supabase/tests/        pruebas sql de autorización e integridad
tests/                 pruebas unitarias y e2e
docs/tasks/            paquetes de implementación
.github/workflows/     comprobaciones y despliegue
```

## esquema relacional

todos los timestamps son timestamptz del servidor. todas las claves foráneas tienen índice cuando no lo aporta una clave primaria/única.

| tabla | campos y restricciones |
| --- | --- |
| profiles | id uuid pk referencia auth.users on delete cascade; username text unique, canónico, 3–24 caracteres con patrón `^[a-z][a-z0-9_]{2,23}$`; display_name 1–40 caracteres; created_at, updated_at |
| islands | id uuid pk; owner_id uuid unique fk profiles on delete cascade; name 1–60; description hasta 300; layout_version integer = 1; revision bigint >= 0; created_at, updated_at |
| decoration_catalog | id text pk; name; category; asset_path de ruta local; footprint_radius > 0; min_scale/max_scale; orientations int[]; placement_zone en land/water; enabled boolean; metadata jsonb solo descriptivo |
| island_objects | id uuid; island_id fk islands on delete cascade; pk(island_id,id); asset_id fk catalog restrict; position_x/y enteros 0–1000; scale numeric finito; rotation entero; created_at |
| island_ratings | island_id fk islands on delete cascade; user_id fk profiles on delete cascade; pk(island_id,user_id); score smallint check 1–10; created_at, updated_at |
| island_stats | island_id pk fk islands on delete cascade; score_sum bigint >= 0; vote_count bigint >= 0; valores mantenidos exclusivamente por trigger |

no almacenar z_index editable: calcular profundidad por y proyectada, con desempate por id. nombres canónicos inmutables en el mvp para no romper enlaces. reservar admin, support, moderator, system y variantes definidas en una tabla privada; display_name no implica identidad verificada. no prometer impedir suplantación completa.

índices: islands(created_at desc,id), profiles(username text_pattern_ops), island_objects(asset_id), island_ratings(user_id). ranking basado en stats; incorporar índice por expresión de ranking si explain demuestra necesidad.

## contratos y seguridad

activar rls y definir grants explícitos en todas las tablas expuestas. revocar escrituras directas donde se use rpc. sin email en profiles ni en respuestas públicas. nunca service_role en navegador.

- complete_profile(username, display_name): sesión autenticada con correo confirmado; transacción crea perfil, isla y objetos iniciales. idempotente por auth.uid(); concurrencia de nombres se resuelve con unique. si nombre ocupado, permitir corregirlo sin repetir registro. no confiar en user_metadata para privilegios. ejecutar automáticamente después de confirmar sesión y completar nombre.
- save_island(island_id, expected_revision, objects): transacción bloquea isla, verifica propietario y revisión, valida todo el lote y sustituye objetos; incrementa revision una vez. conflicto devuelve error distinguible sin escribir nada. límite 150 objetos y 128 kib de json; rechazar claves desconocidas, ids duplicados y números no finitos. las restricciones y triggers protegen también rutas sql directas.
- set_rating(island_id, score): obtiene usuario de auth.uid(), rechaza propia isla, score inválido o sesión ausente; upsert de clave compuesta. limitar frecuencia de actualizaciones por usuario con control transaccional. la unicidad no impide abuso de múltiples cuentas; documentar ese límite.
- list_islands(sort, search, cursor, limit): máximo 24 resultados, búsqueda por prefijo canónico, campos públicos y agregados. recientes con cursor(created_at,id); ranking con cursor(peso,id), avisando que votos nuevos pueden alterar páginas. nunca devolver todos los layouts para poblar galería.
- get_island(username): devuelve perfil público, isla, objetos y estadísticas. público solo lectura; el editor requiere propietario confirmado, además de autorización sql.

funciones security definer solo donde sea necesario, con search_path vacío, nombres calificados, auth.uid() verificado y execute revocado de public; otorgar solo a roles previstos. funciones públicas de lectura exponen columnas enumeradas. evitar vistas que salten rls accidentalmente.

ratings individuales: solo el votante puede leer su voto; público lee agregados. trigger de estadísticas usa incrementos atómicos sobre una fila por isla para insert/update/delete; probar concurrencia y reconciliación. clientes no pueden escribir estadísticas. el promedio es null con cero votos. ranking propuesto `(score_sum + 5 * 5.5) / (vote_count + 5)`; es una ponderación de producto, no promedio visible. excluir islas sin votos de mejor calificadas; mostrar esas islas en recientes/explorar.

## geometría y editor

mundo lógico 1000 × 1000. suelo: elipse centrada (500,500), radios (360,280); objetos terrestres requieren que su disco de apoyo escalado quepa dentro de una región conservadora de la elipse. usar la misma fórmula documentada en typescript y sql y probar puntos fronterizos. agua: fuera de la elipse ampliada por radio del objeto y dentro de los límites del mundo menos ese radio. decoración puede solaparse inicialmente; no simular colisiones físicas.

proyección afín fija y transformación inversa para puntero; cámara separada del layout. objetos anclados por pie. selección, mover, borrar, orientación y escala mediante comandos; historial limitado a 50 operaciones. no registrar cada pixel del arrastre. cancelar puntero restaura la posición anterior. zonas inválidas visibles y sin commit.

un dedo coloca/arrastra; gesto de dos dedos mueve y amplía cámara. mouse: rueda zoom, arrastre de fondo desplaza. zoom acotado 0.5–2.5 y reinicio. alternativa html de selección de objetos y campos de posición/escala para teclado y lector de pantalla. escape cancela; borrar solo si el foco no está en un campo.

## persistencia y fallos

debounce 1200 ms después de una operación confirmada. una solicitud a la vez; si hay cambios durante el envío, guardar de nuevo usando la revisión recibida. serializar copia local por usuario e isla con revision base, versión y fecha. nunca eliminar una copia posterior al snapshot confirmado. estados: guardando, guardado, sin conexión, conflicto y error.

al reconectar o recargar, comparar revisión remota con la base de la copia. conflictos requieren elección explícita entre estado remoto y recuperación local; no sobrescribir silenciosamente. no depender de beforeunload para completar red. cerrar sesión detiene guardado y aísla borradores del siguiente usuario. invalidar respuestas antiguas al cambiar de sesión/isla.

## rendimiento y publicación

reutilizar texturas, limitar dpr a 2 y pausar ticker al ocultarse la página. con movimiento reducido, renderizar bajo demanda si no hay interacción. destruir recursos y listeners al desmontar. galería con miniaturas svg derivadas de una selección acotada de objetos devuelta por consulta; no crear un canvas webgl por tarjeta. validar 150 objetos en equipo y móvil reales antes de prometer rendimiento.

github actions: npm ci, typecheck, pruebas, build y publicación del artefacto dist. distinguir repositorio de usuario (base /) y de proyecto (base /nombre/). configuración pública supabase por variables de compilación. redirect auth a la raíz real y procesamiento de callback antes del router hash; probar confirmación, recuperación y recarga profunda.

presupuesto cero es una restricción de diseño, no una garantía de servicio ilimitado. verificar cuotas actuales, disponibilidad de correo transaccional para destinatarios reales y condiciones de uso antes de lanzamiento. no marcar registro público aprobado hasta probar entrega de confirmación a usuarios externos.

## documentación consultada

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://pixijs.com/8.x/guides/components/scene-objects
- https://vite.dev/guide/static-deploy.html

estas referencias respaldan selección técnica; las reglas de producto, límites y fórmula de ranking anteriores son decisiones de este proyecto.
