# RunWell — Contexto del proyecto

Aplicación web de seguimiento de running, proyecto académico de Ingeniería de Software.
Frontend puro: HTML, CSS y JavaScript (sin frameworks ni backend). Mapas con Leaflet + OpenStreetMap.

## Funcionalidades actuales
- Rutas predefinidas en Maracaibo (zonas de LUZ y Paseo Sur) como mock data en `script.js`.
- Mapa interactivo que dibuja las rutas (Leaflet).
- Sección de Eventos con día/hora programados por ruta y botón "Unirse".
- Actividad tipo **trote o carrera** con cronómetro: se inicia desde los popups del mapa o desde el prompt de proximidad y se detiene con "Detener". El estado vive en el objeto global `actividad`.
- Geolocalización: marcador azul del usuario, botón "📍" para centrarse y **seguimiento continuo** (`iniciarTracking()` con `watchPosition` al cargar la página).
- Detección de proximidad: al acercarse ≤ 50 m a una ruta aparece un prompt para iniciar trote/carrera (con cooldown de 20 s y colisión punto-segmento en metros).
- Traza del recorrido: línea punteada azul que crece con cada posición mientras hay actividad activa (`refrescarTraza()`).
- Panel flotante en vivo (`#hud-actividad`): tiempo, distancia acumulada (Haversine en `distanciaMetros`) y ritmo min/km; se muestra mientras hay actividad y se oculta al detener.
- Persistencia del modo oscuro en `localStorage` (clave `runwell-tema`).

## Archivos
- `index.html` — estructura y navegación. Carga Leaflet JS **antes** que `script.js` (orden de dependencias).
- `script.js` — datos de rutas y toda la lógica (mapa, cronómetro, geolocalización, eventos, tema).
- `style.css` — estilos, modo oscuro, animaciones.
- `docs/diagrama-casos-uso.md` — casos de uso planeados (Mermaid).

## Funcionalidad planificada (según casos de uso)
Registro/login, seleccionar/filtrar rutas,
dashboard de estadísticas e historial de progreso. No hay backend ni persistencia todavía
(se evaluó Supabase como BaaS gratuita y GitHub Pages/Vercel para el deploy).

## Notas de desarrollo
- El mismo popup se vincula a los marcadores de inicio y fin de cada ruta (duplicado de listeners en `script.js`).
- El popup de Leaflet **no está en el `document` hasta que se abre**: `popupsRuta` registra los nodos por ruta para poder actualizar su UI aunque esté cerrado (si no, iniciar actividad desde el prompt dejaría el popup desfasado).
- El ícono del usuario se crea de forma perezosa (`iconoUsuario()`) para no depender del orden de carga de Leaflet.
- Los botones del mapa usan `padding: 0` para quedar circulares (el selector global `button` agrega padding por defecto).
- No hay suite de tests permanente; es frontend estático. La validación de la lógica se hizo con un arnés temporal (`test.html`, ya eliminado) en Firefox headless: 66 checks de mapa, colisión, prompt, actividad, traza, tema y distancia/ritmo en vivo — todos OK (verificados por log del servidor: `largo=76&nok=66`).

## Preferencia de trabajo del usuario
El usuario trabaja en modo **tutor**: se le explican conceptos y se le dan ejemplos generales,
y él aplica los cambios en su proyecto. Dar guía y pasos, no implementar por él.