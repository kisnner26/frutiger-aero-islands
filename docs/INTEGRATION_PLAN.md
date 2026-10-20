# auditoría y plan de integración: radio, recuerdos, concursos pequeños, rutas de mascotas y visitas con huella

estado al 2026-10-19. este documento separa lo que ya existe de lo que falta y fija el orden y los contratos. implementados: radio, y cámara con álbum local (recuerdos de creación y fotos).

## qué existe

| pieza | estado | dónde |
| --- | --- | --- |
| motor de escena pixijs, editor, catálogo de 8 objetos, economía local (brillos, encanto, niveles) | operativo, solo local | src/engine, src/features/editor |
| audio | un único motor de radio; efectos sintetizados aparte | src/audio |
| teléfono | cuerpo y panel; aplicaciones: radio, cámara y álbum | src/features/phone |
| mundo (planeta, archipiélago) | solo islas de jugadores reales registrados | src/features/world |
| comunidad: auth, explorar, visitas, migración inicial | en construcción por otra sesión (perfiles, islas, rpc `complete_profile` y `save_island`) | src/features/community, supabase/migrations |
| mascotas, personaje, expansiones, concursos, fotos | no existen | |

## dependencias por sistema

### 1. radio (hecho)
sin dependencias externas. véase docs/RADIO.md.

### 2. recuerdos de la isla (parcial: local, creación y fotos; véase docs/CAMARA_ALBUM.md)
- captura real: combinar el lienzo de fondo (dom) con `renderer.extract` de pixi; la interfaz html queda fuera por construcción. falta la aplicación cámara del teléfono para que el jugador decida conservar fotos.
- eventos que ya pueden registrarse: creación de la isla. no pueden registrarse todavía: expansión, mascota, concurso (no existen).
- almacenamiento local: indexeddb con jpeg de máximo 1280 px y calidad 0,8; tope de 40 recuerdos y unos 12 mb; avisar al llegar al límite. sincronizados: supabase storage, bucket privado con cuota por usuario; el álbum es privado por defecto.
- contrato: `Memory { id, kind: 'creacion'|'expansion'|'mascota'|'concurso'|'foto', at (reloj del dispositivo, marcado local), text, photoKey?, beforeKey?, afterKey?, origin: 'local'|'sincronizado' }`. no se generan recuerdos por mover objetos.
- bloqueo: expansiones, mascotas y concursos. hecho: creación y fotos (ver CAMARA_ALBUM.md).

### 3. rutas para mascotas
- requiere mascotas (no hay) y una base mínima de movimiento. primera entrega propuesta: una mascota terrestre y una acuática con comportamiento por defecto, y después rutas.
- navegación: rejilla gruesa (celdas de 50 unidades sobre el mundo 1000 × 1000) con celdas bloqueadas por zona y por huellas de objetos; a* solo al guardar una ruta o al mover un objeto que la cruza, nunca por fotograma; la mascota sigue los puntos con dirección suavizada y pausas.
- contrato: `PetRoute { id, petId, points: {x,y}[], stops: {index, kind: 'descansar'|'jugar'|'beber'|'refugio'}[], paused, version }` con ids estables, validada con la misma geometría de zonas del editor y compatible con la futura expansión (coordenadas del mundo, no de pantalla).
- bloqueo: mascotas y catálogo de refugios.

### 4. visitas con huella
- requiere comunidad real (perfiles, islas, visita por nombre): está en construcción. tablas nuevas: `visit_entries (id, island_id, visitor_id, kind: 'firma'|'postal'|'riego', postcard_id?, created_at)`, `visit_settings (island_id, allow_guestbook, allow_postcards, allow_watering)`, `visit_blocks (owner_id, blocked_id)`, `visit_hidden (entry_id)`.
- reglas: autor, fecha y propietario los pone el servidor (`auth.uid()` y `now()`); sin mensajes libres (postales predefinidas por id); límite de frecuencia por visitante e isla y unicidad diaria por tipo; lectura paginada; el visitante no puede escribir en la isla ajena; regar solo crea un registro y un efecto visual, no suma soles.
- bloqueo: backend de la otra sesión (url y clave de supabase, migraciones aplicadas).

### 5. concursos pequeños
- requiere backend con tiempo del servidor y permisos de administración, el editor parametrizable (terreno, presupuesto y catálogo fijos) y proyectos independientes por concurso y participante.
- tablas: `contests`, `contest_entries` (copia congelada de la composición al cerrar entregas), `contest_votes`, `contest_awards` (clave de idempotencia por concurso y participante). cierre y premios por rpc idempotente; resultados ocultos hasta cerrar votación; mínimo de votos y desempate definidos en el reglamento de cada concurso.
- modo sin backend: concurso local de práctica claramente identificado, sin participantes ni votos simulados.
- bloqueo: backend, sistema de moneda comunitaria separado, lista de administradores.

## orden recomendado

1. radio (hecha) → 2. cámara y álbum con eventos de creación y foto (hecho, solo local) → 3. base de mascotas → 4. rutas → 5. visitas con huella (cuando la comunidad esté desplegada) → 6. concursos.

## decisiones pendientes del usuario

- proyecto de supabase (url y clave pública) y nombre del repositorio de pages.
- si la moneda pasa a llamarse "soles" y cómo migrar los brillos locales (no se tocó la economía).
- lista de administradores para concursos.
