# rendimiento y latencia del servidor

medido desde miami contra el proyecto de supabase: la conexión tarda ~55 ms, pero cada llamada completa cuesta **0,35–0,65 s** (la base de datos está lejos del cliente). por eso la regla es: menos llamadas, hechas a la vez y casi nunca repetidas.

## qué se hizo
- **una llamada en vez de cinco** para el mapa de conquista: `world_snapshot()` (migración 0016) devuelve zonas dañadas, parcelas, resumen, energía y retos. si el proyecto aún no la tiene, el cliente usa las funciones antiguas.
- **un solo perfil** (`src/persistence/profileRow.ts`): usuario, país y personaje salen de una consulta compartida (antes eran tres, una por módulo).
- **caché con "mostrar lo viejo mientras se actualiza"** (`src/persistence/fastcache.ts`): las peticiones iguales que coinciden se unen en una, las recientes no se repiten (islas del mundo 45 s, mapa 15 s, gadgets 10 min).
- **precarga en la portada** (`src/persistence/prefetch.ts`): al entrar con sesión se piden en segundo plano las islas y el mapa; el mundo abre con datos ya listos.
- **sin esperas tras actuar**: restaurar, reclamar y capturar actualizan la pantalla al instante y el servidor se relee detrás.
- **sondeos solo con la pestaña visible** (presencia cada 60 s, mapa cada 40 s mientras la ventana de conquista está abierta).
- el planeta 3d (three.js, 135 kb comprimidos) se descarga solo al abrir el mundo.

## qué falta (necesita decisiones fuera del código)
- acercar la base de datos a la gente: el proyecto está en una sola región. si la mayoría de jugadores está en latinoamérica, conviene que esté en sao paulo o virginia (supabase no mueve proyectos: hay que crear uno nuevo y migrar).
- si el volumen crece, `world_island_summaries` y `world_snapshot` deberían cachearse en el borde (edge function con caché de 15–30 s) para que muchas personas compartan una sola lectura.
