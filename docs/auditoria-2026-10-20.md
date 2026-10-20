# auditoría técnica — 20 de octubre de 2026

## corregido en esta entrega

- acceso: isla, mundo, personaje, explorar, visitas y arcade requieren una sesión autenticada. la portada pública solo ofrece crear cuenta, iniciar sesión y conocer las reglas.
- identidad: el avatar local usa una clave por `auth.users.id`; al iniciar sesión se carga el avatar remoto de ese perfil. un visitante recibe el avatar público del dueño de la isla.
- persistencia: el editor serializa los guardados de una misma isla para conservar el orden de revisiones. ya no vuelve a escribir el documento recibido al cargar una isla. la migración 0007 endurece el RPC con límites de tamaño y estructura.
- concurrencia: `save_island` mantiene bloqueo de fila y revisión optimista. si dos dispositivos intentan cambiar una isla desde la misma revisión, el segundo recibe un conflicto en vez de sobrescribir trabajo ajeno.
- presencia: mientras una isla está abierta, el cliente actualiza la presencia cada 90 segundos.
- rendimiento: isla, mundo, editor, personaje y explorador se cargan bajo demanda. el bundle inicial bajó de 618.74 kB a 295.69 kB sin comprimir.
- interfaz: la portada dejó de ser una ventana compacta de seis accesos. ahora comunica el requisito de cuenta y lleva a una acción principal.

## comprobaciones

- `npm test -- --run`: 68 pruebas correctas.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.
- comprobación manual sin sesión: la portada no muestra accesos del juego y `#/mundo` muestra la puerta de acceso.

## lo que conviene hacer después

- usar Supabase Realtime para actualizar luces, likes y progreso de expediciones sin refrescar la vista.
- resolver conflictos de edición con una pantalla de comparación si una misma cuenta modifica la isla desde dos dispositivos.
- mover las recompensas de arcade a un RPC del servidor antes de permitir que otorguen brillos persistentes; el cliente no debe decidir monedas.
- activar rate limits y captcha de Supabase Auth al abrir el registro público, y configurar correo SMTP propio antes de crecer.
- añadir pruebas de integración con una cuenta de prueba para verificar alta, guardado, conflicto de revisión y restauración de avatar.

## bucle de juego incorporado

- el laboratorio aero incorpora agua, cristales y hojas como recursos de cuenta.
- el ciclo de marea entrega recursos cada seis horas mediante un RPC; el navegador no puede alterar los montos ni el enfriamiento.
- cuatro recetas desbloqueables producen decoraciones, gadgets o recuerdos persistentes en inventario.
- la marea diaria mantiene una racha de siete días y entrega recursos desde postgres; usa fecha UTC, bloqueo de fila y no acepta fechas ni montos del navegador.
- el laboratorio enlaza al arcade, que concentra aqua racer, crystal drop y pez fuera del agua.
- la migración `202610200008_aero_workshop.sql` es necesaria antes de usar este sistema.
