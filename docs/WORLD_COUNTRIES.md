# país, zona en el mundo y banderas

## qué hace

- la primera vez que alguien entra a su isla o al mundo se le pregunta de qué país es (selector con búsqueda y la bandera de cada país). puede elegir "ahora no": no se vuelve a preguntar en esa sesión del navegador y su isla queda en mar abierto, sin bandera, hasta que elija.
- el país decide la **zona** de su isla dentro del mundo. el interior del planeta es un mapa (proyección azimutal de áreas iguales centrada en el atlántico, dibujada con los continentes como bajíos claros bajo el agua) y cada isla se coloca cerca del punto de referencia de su país.
- la bandera aparece en: el selector, la barra superior del juego, un asta plantada en la isla del juego (ondea; sale en las fotografías), el asta de cada isla del mundo, la tarjeta de la isla, el menú de inicio y la cuenta.
- se puede cambiar desde la tarjeta de mi isla en el mundo y desde la cuenta.

## reparto de islas por zonas (src/world/geoProjection.ts)

determinista: la isla con prioridad (la propia) y luego las demás por país y orden de llegada. la primera isla de cada país ocupa su punto de referencia; las siguientes, una espiral dorada alrededor, siempre separadas al menos una elipse de 250 × 150 unidades de cualquier otra. si la zona se llena se busca el hueco libre más cercano en todo el disco.

- prueba: 42 islas apiñadas en países vecinos (países bajos, bélgica, alemania, francia, reino unido y sin país) no se solapan.
- **capacidad real del prototipo**: el disco admite unas decenas de islas a este tamaño. con miles de jugadores hará falta una vista jerárquica (mundo → país → islas, con miniaturas o marcadores a distancia) y que el servidor asigne las posiciones. si el disco se satura, el algoritmo acepta solapes antes que perder una isla. no está resuelto y no debe prometerse.

## banderas (src/world/flags.ts)

130+ banderas dibujadas por código a partir de formas (franjas, círculos, estrellas, cruces, polígonos) y con acabado frutiger aero (pliegues, brillo de cristal, borde luminoso). los escudos y emblemas complejos se **simplifican** (un disco, una estrella o un bloque de color), y algunas proporciones o tonos son aproximados. conviene que alguien las revise antes del lanzamiento, sobre todo las que usan escudos. no se usan imágenes externas.

## país en la cuenta (contrato con el servidor)

- local: `localStorage` (`frutiger-aero-islands:pais`).
- remoto: migración **escrita pero no aplicada** `supabase/migrations/202610200002_country.sql`: tabla `countries`, columna `profiles.country_code` (lectura pública), `country_changed_at` privada y la función `set_my_country(p_country)` (`security definer`, `search_path` vacío, solo `authenticated`, valida contra la tabla, un cambio como máximo cada 30 días, sin escritura directa). una prueba comprueba que los códigos del sql coinciden con los del cliente.
- cliente: src/persistence/country.ts (`pushCountry`, `syncCountry`). con cuenta, el país del perfil manda sobre el local; si el servidor rechaza un cambio se vuelve al anterior y se explica el motivo.
- **no verificado con un backend real**: no hay credenciales de prueba en este entorno. la lista pública de islas (explorar) aún no incluye el país; lo añadirá quien mantenga la comunidad.
