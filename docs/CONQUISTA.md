# conquista y restauración del mundo

el mundo es una cuadrícula de 24×24 parcelas (432 dentro del círculo de la cuenca). hay unos pocos **rincones dañados** (zonas grises y abandonadas, lejos de los países y de las islas) y la comunidad los devuelve al estilo frutiger aero. no hay datos simulados: lo que se ve sale de la base de datos.

## reglas (todas se validan en el servidor, `supabase/migrations/202610200013_territory.sql`)
- **energía**: máximo 5, se recupera 1 cada 20 minutos. es compartida por todas las acciones.
- **restaurar** (1 energía): suma 20% a una zona dañada. cada persona aporta como máximo 40% por parcela, así que hacen falta al menos 3 personas para restaurar una.
- **reclamar** (1 energía): una parcela libre pasa a ser tuya. la primera puede ser en cualquier sitio; las siguientes deben tocar (8 vecinas) una parcela tuya.
- **capturar** (2 energías): quitar una parcela a otra persona. no se puede mientras tenga escudo (30 minutos tras reclamarla o capturarla).
- las tablas no se pueden tocar desde el cliente; solo funciones `security definer` con `search_path` vacío. anon puede ver el mapa y los rankings, pero no actuar.

## retos semanales
`expansión` (8 reclamos), `conquistador` (3 capturas), `restaurador` (10 restauraciones) y `constancia` (15 acciones). el progreso se calcula del registro de eventos de la semana; el ranking de restauradores sale del mismo registro. también hay ranking de jugadores y de países (parcelas por país del dueño).

## cliente
- `src/world/territory.ts`: cuadrícula, colores por jugador y reglas de ayuda (`claimHint`).
- `src/persistence/territory.ts`: llamadas a las funciones del servidor.
- `src/features/world/TerritoryPanel.tsx`: ventana "conquista" (estado del planeta, energía, parcela elegida, retos y rankings).
- `src/engine/WorldScene.ts`: capa de parcelas (bruma gris y grietas en zonas dañadas, brillos en las restauradas, bordes de color por dueño). el planeta 3d se vuelve gris y nublado cuando está dañado (`Globe3D.setRestoration`).

## verificación
la migración se probó en un postgres 16 local con tablas de apoyo (`auth.uid()`, `profiles`): reclamar, adyacencia, escudo, límite de aportes, capturas, retos, rankings y permisos de anon. falta probarla con la sesión real de supabase.
