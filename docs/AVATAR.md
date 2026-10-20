# personaje (primera entrega)

identidad visual propia, no basada en ningún avatar de consola: cabeza grande y ovalada, mejillas, ojos con brillo, cuerpo pequeño de manos redondas, contorno suave y degradados de cristal. se dibuja por código como svg (src/avatar/svg.ts); no hay imágenes externas.

## qué se puede elegir (todo gratuito)

forma de la cara (3), 10 tonos de piel, ojos (6 estilos, 6 colores), cejas (5), nariz (4), boca (6), pecas, vello facial (5), 10 peinados con 12 colores (naturales y de fantasía), parte de arriba (6), parte de abajo (3, el vestido cubre la de abajo), calzado (4), 8 accesorios, 3 complexiones. los tonos de piel y rasgos básicos nunca serán de pago; la complexión no se asocia a capacidades.

## cómo funciona

- editor en `#/personaje` (canal de la portada, menú de inicio, insignia del juego y de la cuenta): vista previa grande, cuatro pestañas (cara, pelo, ropa, extras), miniaturas de cada opción, "al azar", "deshacer cambios", y solo se guarda con "guardar personaje". salir con cambios pide confirmación.
- el personaje aparece de pie en la isla con una respiración suave, en la cabecera del juego, en el menú de inicio y en la cuenta.
- guardado local en `frutiger-aero-islands:avatar` (cada campo es un entero validado: lo corrupto vuelve a lo predeterminado).
- remoto: migración `supabase/migrations/202610200005_avatar.sql` **escrita y sin aplicar**: `profiles.avatar` (lectura pública) y `set_my_avatar` (solo autenticados, `search_path` vacío, exige los 21 campos exactos, enteros de 0 a 11). el cliente (src/persistence/avatar.ts) la usa tras guardar y en el inicio de sesión (el del perfil manda). **no verificado con backend real.**

## no hecho todavía (siguientes entregas del encargo)

caminar por zonas válidas, reposo/saludar/sentarse/sacar el teléfono, aparecer como representación del propietario en las visitas, conjuntos guardados, más opciones y tienda de cosméticos. el personaje hoy se queda quieto en un punto fijo de la isla.
