# RunWell — Contexto del proyecto

Aplicación web de seguimiento de running, proyecto académico de Ingeniería de Software.
Frontend puro: HTML, CSS y JavaScript (sin frameworks ni backend). Mapas con Leaflet + OpenStreetMap.

## Funcionalidades actuales
- Rutas predefinidas en Maracaibo (zonas de LUZ y Paseo Sur) como mock data en `script.js`.
- Mapa interactivo que dibuja las rutas (Leaflet).
- Sección de Eventos con día/hora programados por ruta y botón "Unirse".
- Cronómetro por ruta (iniciar/detener) en los popups del mapa.
- Toggle de modo oscuro.

## Archivos
- `index.html` — estructura y navegación.
- `script.js` — datos de rutas y toda la lógica (mapa, cronómetro, eventos, tema).
- `style.css` — estilos, modo oscuro, animaciones.
- `docs/diagrama-casos-uso.md` — casos de uso planeados (Mermaid).

## Funcionalidad planificada (según casos de uso)
Registro/login, iniciar/detener actividad (ya parcial), seleccionar/filtrar rutas,
dashboard de estadísticas e historial de progreso. No hay backend ni persistencia todavía.

## Notas de desarrollo
- El mismo popup se vincula a los marcadores de inicio y fin de cada ruta (duplicado de listeners en `script.js`).
- No hay tests configurados; es solo frontend estático.