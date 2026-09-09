# RunWell — Contexto del proyecto

Aplicación web de seguimiento de running, proyecto académico de Ingeniería de Software.
Frontend puro: HTML, CSS y JavaScript (sin frameworks ni backend). Mapas con Leaflet + OpenStreetMap.

## Funcionalidades actuales
- Rutas predefinidas en Maracaibo (zonas de LUZ y Paseo Sur) como mock data en `script.js`.
- Mapa interactivo que dibuja las rutas (Leaflet).
- Sección de Eventos con día/hora programados por ruta y botón "Unirse".
- Cronómetro por ruta (iniciar/detener) en los popups del mapa.
- Geolocalización: marcador azul del usuario al abrir el mapa, botón "📍" para centrarse en su ubicación, y rastreo en vivo (GPS) mientras corre una ruta (`watchPosition`).
- Toggle de modo oscuro.

## Archivos
- `index.html` — estructura y navegación. Carga Leaflet JS **antes** que `script.js` (orden de dependencias).
- `script.js` — datos de rutas y toda la lógica (mapa, cronómetro, geolocalización, eventos, tema).
- `style.css` — estilos, modo oscuro, animaciones.
- `docs/diagrama-casos-uso.md` — casos de uso planeados (Mermaid).
- `backup-sin-geolocalizacion/` — copia de los 3 archivos antes de agregar geolocalización.

## Funcionalidad planificada (según casos de uso)
Registro/login, iniciar/detener actividad (ya parcial), seleccionar/filtrar rutas,
dashboard de estadísticas e historial de progreso. No hay backend ni persistencia todavía
(se evaluó Supabase como BaaS gratuita y GitHub Pages/Vercel para el deploy).

## Notas de desarrollo
- El mismo popup se vincula a los marcadores de inicio y fin de cada ruta (duplicado de listeners en `script.js`).
- El ícono del usuario se crea de forma perezosa (`iconoUsuario()`) para no depender del orden de carga de Leaflet.
- Los botones del mapa usan `padding: 0` para quedar circulares (el selector global `button` agrega padding por defecto).
- No hay tests configurados; es solo frontend estático.

## Preferencia de trabajo del usuario
El usuario trabaja en modo **tutor**: se le explican conceptos y se le dan ejemplos generales,
y él aplica los cambios en su proyecto. Dar guía y pasos, no implementar por él.