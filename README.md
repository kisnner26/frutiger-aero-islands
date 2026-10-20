# frutiger aero islands

videojuego de decoración de islas en pleno frutiger aero: lago con reflejos, burbujas de cristal, peces, ventanas estilo windows vista y fichas estilo wii u. estado: isla jugable en modo local (sin cuentas ni comunidad todavía).

cómo se juega: revienta burbujas (las doradas valen más), atrapa la mariposa y el pez que salta para ganar brillos; con ellos compras palmeras, árboles, flores, rocas, cristales, fuentes, pabellones y peces. el encanto de tu isla sube con la variedad y la armonía entre objetos cercanos; cada nivel desbloquea decoraciones nuevas y da brillos. tu isla se guarda en este dispositivo.

## ejecutar

```bash
npm install
npm run dev
```

otros scripts: `npm run typecheck`, `npm run build`, `npm run preview`, `npm test`. copiar `.env.example` a `.env` solo cuando exista backend; hoy no se usa.

rutas hash: `#/` (inicio), `#/introduccion` y `#/isla` (el juego). doble clic o doble toque en el fondo restablece la cámara; rueda o pellizco para acercar; esc cancela.

música: copia tu pista en `public/audio/soundtrack.mp3` (no se versiona; véase [recursos](docs/ASSETS.md) sobre su licencia).

## capturas reales

| vista | 390 × 844 | 1440 × 900 |
| --- | --- | --- |
| inicio | ![inicio móvil](docs/capturas/inicio-390x844.png) | ![inicio escritorio](docs/capturas/inicio-1440x900.png) |
| introducción | ![introducción móvil](docs/capturas/introduccion-390x844.png) | ![introducción escritorio](docs/capturas/introduccion-1440x900.png) |
| isla (juego) | ![isla móvil](docs/capturas/isla-390x844.png) | ![isla escritorio](docs/capturas/isla-1440x900.png) |
| menú de inicio | | ![menú de inicio](docs/capturas/isla-menu-inicio-1440x900.png) |

la captura de la isla usa un borrador local de muestra (14 objetos) cargado solo para fotografiarla; no son datos de comunidad.

## documentación

- [arquitectura y modelo de datos](docs/ARCHITECTURE.md)
- [paquetes de implementación](docs/tasks/IMPLEMENTATION.md)
- [recursos y autoría](docs/ASSETS.md)
- [progreso y próxima tarea](DEVELOPMENT_PROGRESS.md)

referencia visual: https://kisnner26.github.io/kisnner26/
