# flujos y su lógica

| flujo | comportamiento esperado | verificado |
| --- | --- | --- |
| portada → cuenta, sin sesión | muestra entrar / crear cuenta | por código; sin credenciales reales |
| portada → cuenta, con sesión | muestra la cuenta (usuario, país, ir a mi isla, ver el mundo, cerrar sesión), nunca el formulario | simulado en desarrollo con sesión ficticia (`dev-sesion`), portada → cuenta → portada → cuenta, escritorio y móvil |
| el canal y el menú de inicio reflejan la sesión | "mi cuenta" y "@usuario" con sesión; "entrar o crear" sin ella; "cerrar sesión" en el menú | igual que arriba |
| cerrar sesión | vuelve a la bienvenida y la portada muestra "cuenta" | por código |
| mi isla sin sesión y con backend configurado | lleva a la cuenta; tras entrar, a la isla | por código (flujo de la comunidad) |
| mi isla sin backend | modo local con borrador del dispositivo | sí |
| abrir la isla | velo de cristal "abriendo tu isla" (mínimo 0,75 s, se retira cuando la escena está lista, máximo 9 s) y acercamiento suave de la cámara | sí |
| salir de la isla / mundo | velo breve "volviendo" | sí |
| mundo → mi isla → mundo | restaura el archipiélago con mi isla seleccionada | sí |
| elegir país | pregunta una vez; búsqueda; confirma; cambia la zona de mi isla; "ahora no" no insiste en la sesión | sí (local) |
| mi isla en el mundo con cuenta | usa la isla guardada en la nube, no el borrador local | por código |
| teléfono → cámara → álbum | fotografía real, vista previa, conservar o descartar; álbum con descarga, compartir y borrado confirmado | sí |
| música | solo suena tras una acción explícita; sigue al cambiar de vista | sí |

limitaciones de verificación: el entorno no tiene cuentas de supabase de prueba; todo lo que depende del servidor se comprobó por lectura de código y con una sesión ficticia solo disponible en desarrollo.
