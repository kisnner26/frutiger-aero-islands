# frutiger aero islands

videojuego de decoración de islas en pleno frutiger aero: lago con reflejos, burbujas de cristal, peces, ventanas estilo windows vista y fichas estilo wii u. estado: isla jugable en modo local (sin cuentas ni comunidad todavía).

cómo se juega: revienta burbujas (las doradas valen más), atrapa la mariposa y el pez que salta para ganar brillos; con ellos compras palmeras, árboles, flores, rocas, cristales, fuentes, pabellones y peces. el encanto de tu isla sube con la variedad y la armonía entre objetos cercanos; cada nivel desbloquea decoraciones nuevas y da brillos. tu isla se guarda en este dispositivo.

## ejecutar

```bash
npm install
npm run dev
```

otros scripts: `npm run typecheck`, `npm run build`, `npm run preview`, `npm test`. copiar `.env.example` a `.env` solo cuando exista backend; hoy no se usa.

rutas hash: `#/` (inicio), `#/introduccion`, `#/isla` (el juego) y `#/mundo` (planeta y archipiélago; las islas de ejemplo son dibujos del prototipo). doble clic o doble toque en el fondo restablece la cámara; rueda o pellizco para acercar; esc cancela.

música: radio generativa original en el teléfono de la bandeja (véase [radio](docs/RADIO.md)); no suena hasta que la pulses. la pista personal del autor (`public/audio/soundtrack.mp3`) se publica como emisora opcional por decisión suya; sus derechos no están verificados (véase [recursos](docs/ASSETS.md)).

## capturas reales

| vista | 390 × 844 | 1440 × 900 |
| --- | --- | --- |
| inicio | ![inicio móvil](docs/capturas/inicio-390x844.png) | ![inicio escritorio](docs/capturas/inicio-1440x900.png) |
| introducción | ![introducción móvil](docs/capturas/introduccion-390x844.png) | ![introducción escritorio](docs/capturas/introduccion-1440x900.png) |
| isla (juego) | ![isla móvil](docs/capturas/isla-390x844.png) | ![isla escritorio](docs/capturas/isla-1440x900.png) |
| menú de inicio | | ![menú de inicio](docs/capturas/isla-menu-inicio-1440x900.png) |
| mundo (planeta) | ![mundo móvil](docs/capturas/mundo-lejos-390x844.png) | ![mundo escritorio](docs/capturas/mundo-lejos-1440x900.png) |
| mundo (archipiélago) | ![archipiélago móvil](docs/capturas/mundo-mi-isla-390x844.png) | ![archipiélago escritorio](docs/capturas/mundo-mi-isla-1440x900.png) |
| elegir país | ![país móvil](docs/capturas/pais-pregunta-390x844.png) | ![país escritorio](docs/capturas/pais-pregunta-1440x900.png) |
| mundo por países | ![mundo móvil](docs/capturas/mundo-zona-390x844.png) | ![mundo escritorio](docs/capturas/mundo-zona-1440x900.png) |
| transición al abrir la isla | ![velo móvil](docs/capturas/transicion-velo-390x844.png) | ![velo escritorio](docs/capturas/transicion-velo-1440x900.png) |
| cuenta con sesión | ![cuenta móvil](docs/capturas/pulido-cuenta-390x844.png) | ![cuenta escritorio](docs/capturas/pulido-cuenta-1440x900.png) |
| cámara y álbum | ![álbum móvil](docs/capturas/album-lista-390x844.png) | ![álbum escritorio](docs/capturas/album-lista-1440x900.png) |
| radio en el teléfono | ![radio móvil](docs/capturas/radio-sonando-390x844.png) | ![radio escritorio](docs/capturas/radio-sonando-1440x900.png) |

la captura de la isla usa un borrador local de muestra (14 objetos) cargado solo para fotografiarla; no son datos de comunidad.

## documentación

- [arquitectura y modelo de datos](docs/ARCHITECTURE.md)
- [paquetes de implementación](docs/tasks/IMPLEMENTATION.md)
- [recursos y autoría](docs/ASSETS.md)
- [radio y teléfono](docs/RADIO.md)
- [auditoría y plan de integración](docs/INTEGRATION_PLAN.md)
- [cámara y álbum](docs/CAMARA_ALBUM.md)
- [país, zonas y banderas](docs/WORLD_COUNTRIES.md)
- [flujos y su lógica](docs/FLUJOS.md)
- [progreso y próxima tarea](DEVELOPMENT_PROGRESS.md)

referencia visual: https://kisnner26.github.io/kisnner26/
