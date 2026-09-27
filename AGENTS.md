# RunWell — Contexto del proyecto

Aplicación web de seguimiento de running, proyecto académico de Ingeniería de Software.
Frontend puro: HTML, CSS y JavaScript (sin frameworks ni backend). Mapas con Leaflet + OpenStreetMap.

## Funcionalidades actuales
- Rutas predefinidas en Maracaibo (zonas de LUZ y Paseo Sur) como mock data en `js/datos.js`.
- Mapa interactivo que dibuja las rutas (Leaflet).
- Sección de Eventos con día/hora programados por ruta y botón "Ver Ruta en Mapa".
- Actividad tipo **trote o carrera** con cronómetro: se inicia desde los popups del mapa o desde el prompt de proximidad y se detiene con "Detener". El estado vive en el objeto compartido `estado` (`js/estado.js`).
- Geolocalización: marcador azul del usuario, botón "📍" para centrarse y **seguimiento continuo** (`iniciarTracking()` con `watchPosition` al cargar la página). Errores de GPS visibles en pantalla (`#alerta-gps`, creada por `mostrarErrorGPS()`).
- Detección de proximidad: al acercarse ≤ 50 m a una ruta aparece un prompt para iniciar trote/carrera (con cooldown de 20 s y colisión punto-segmento en metros).
- Traza del recorrido: línea punteada azul que crece con cada posición mientras hay actividad (`refrescarTraza()`).
- Panel flotante en vivo (`#hud-actividad`): tiempo, distancia acumulada (Haversine en `distanciaMetros`) y ritmo min/km; se muestra mientras hay actividad y se oculta al detener.
- Historial de sesiones en `localStorage` (clave **`runwell-historial`**, formato `{id, tipo, ruta, fecha, tiempo, distancia, ritmo}`). `migrarDatosAntiguos()` une en el arranque claves/formatos anteriores (`runwell_historial` y registros con `duracionSegundos`/`distanciaMetros`) sin perder datos.
- Persistencia del modo oscuro en `localStorage` (clave `runwell-tema`).

## Estructura de archivos
```
index.html          estructura (secciones, mapa, HUD, prompt); carga Leaflet clásico
                    y después <script type="module" src="js/main.js">
css/variables.css   :root, tema oscuro, reset — se carga primero (el orden de los
css/base.css        <link> importa: define el cascade)
css/mapa.css
css/secciones.css
css/responsive.css
js/datos.js         rutas mock
js/util.js          funciones puras (tiempo, distancia, ritmo, colisión)
js/estado.js        objeto `estado` compartido por todos los módulos
js/dom.js           referencias al DOM (resueltas una sola vez)
js/actividad.js     cronómetro, HUD, traza, guardado de sesiones
js/proximidad.js    detección de cercanía + prompt
js/geolocalizacion.js seguimiento GPS, errores, marcador del usuario
js/mapa.js          apertura/cierre, dibujo de rutas, popups
js/eventos.js       tarjetas de la sección Eventos
js/navegacion.js    mostrar/ocultar secciones + menú móvil
js/historial.js     localStorage: guardado, lectura, render, migración
js/tema.js          modo oscuro
js/main.js          punto de entrada: conecta botones ↔ módulos
docs/diagrama-casos-uso.md  casos de uso planeados (Mermaid)
README.md           cómo ejecutarla, estructura y datos guardados
```
Grafo de dependencias (sin ciclos): `datos/util/estado/dom` → `historial` → `actividad` → `proximidad` → `geolocalizacion` → `mapa` → `eventos`; `main.js` importa todos. Si un módulo necesita algo de otro que lo precede en el grafo, la función se llama en tiempo de ejecución (no en la evaluación del módulo) — nunca tocar estado al cargar.

## Funcionalidad planificada (según casos de uso)
Registro/login, seleccionar/filtrar rutas,
dashboard de estadísticas e historial de progreso. No hay backend ni persistencia todavía
(se evaluó Supabase como BaaS gratuita y GitHub Pages/Vercel para el deploy).

## Notas de desarrollo
- **Módulos ES**: hay que servir por HTTP (`python3 -m http.server`); `file://` no carga los módulos. `L` (Leaflet) es un global accesible desde los módulos porque se carga como script clásico antes de `main.js`.
- El mismo popup se vincula a los marcadores de inicio y fin de cada ruta (duplicado de listeners por diseño).
- El popup de Leaflet **no está en el `document` hasta que se abre**: `estado.popupsRuta` registra los nodos por ruta para poder actualizar su UI aunque esté cerrado (si no, iniciar actividad desde el prompt dejaría el popup desfasado). `js/eventos.js` reutiliza esos nodos para abrir el popup tras "Ver Ruta en Mapa".
- El ícono del usuario se crea de forma perezosa (`iconoUsuario()`) para no depender del orden de carga de Leaflet.
- Los botones del mapa usan `padding: 0` para quedar circulares (el selector global `button` agrega padding por defecto).
- Las reglas CSS con `!important` de modo oscuro (tarjetas de historial) ganan por diseño: `.dark-theme .plane-card` debe competir con `body`/herencia.
- **Sin suite de tests permanente**: la validación se hace con un arnés temporal generado desde `index.html` (se copia a `__probe.html`, ignorado por git) que captura `window.onerror` y ejercita la app con clics reales en Firefox headless, reportando a un servidor local en el puerto 8777. Última pasada tras la partición/fixes: 31/31 checks OK, 0 errores de consola (mapa, popup, actividad→detener→historial, migración de datos, tema, menú móvil).

## Preferencia de trabajo del usuario
El usuario trabaja en modo **tutor**: se le explican conceptos y se le dan ejemplos generales,
y él aplica los cambios en su proyecto. Dar guía y pasos, no implementar por él.
