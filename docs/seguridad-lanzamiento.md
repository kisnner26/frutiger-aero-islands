# seguridad y estabilidad antes de abrir el registro

## lo que protege el proyecto

- rls está activado en perfiles, islas, likes, favoritos, presencia, expediciones, clubes, gadgets, recursos y crafteo.
- el navegador usa únicamente la clave publicable. la clave `service_role` no pertenece al cliente, a github pages ni a variables `vite`.
- cada rpc de escritura comprueba `auth.uid()` y se concede solo a `authenticated`.
- `save_island` bloquea la fila, usa revisión optimista y valida tamaño, catálogo, ids únicos, coordenadas, escala y progreso básico antes de escribir.
- el laboratorio entrega recursos y craftea en postgres; el navegador no decide los costos ni el enfriamiento.
- la aplicación no muestra rutas de juego a visitantes sin sesión.
- las vistas pesadas se cargan bajo demanda para reducir la descarga inicial.

## antes de publicar

1. ejecuta las migraciones pendientes en el sql editor de supabase, en orden: `0005`, `0006`, `0007`, `0008` y `0009`.
2. en authentication > url configuration, conserva como site url la url de github pages y como redirect url esa misma url con `#/auth`.
3. en authentication > sign in/providers, deja activada la confirmación de correo. antes de una campaña pública, configura smtp propio; el proveedor de prueba no sirve para volumen real.
4. en authentication > rate limits, conserva límites bajos para registro, recuperación y envío de correo. habilita captcha/turnstile gratuito antes de abrir el registro a cualquiera.
5. no desactives rls ni copies una clave secreta al frontend. si se filtra una clave, rótala desde project settings > api keys.
6. crea una cuenta de prueba y verifica: crear cuenta, confirmar correo, iniciar sesión, editar isla, abrirla desde otro navegador y cerrar sesión.

## límite actual de la economía

los brillos generados por burbujas siguen siendo lógica del cliente. no hay que usar esa moneda para ranking, premios escasos ni compras con dinero hasta que las recompensas de minijuegos pasen por un rpc con límites temporales y validación en servidor. recursos, crafteo y expediciones ya siguen ese modelo.
