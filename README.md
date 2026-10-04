# RunWell 🏃

Aplicación web de seguimiento de running: rutas predefinidas en Maracaibo, mapa interactivo,
actividades con cronómetro (trote/carrera) e historial de sesiones.

Proyecto académico de Ingeniería de Software — frontend puro (HTML + CSS + JavaScript),
sin frameworks, Utiliza Vercel para hostear la página y Supabase como Backend. Mapas con [Leaflet](https://leafletjs.com/) + OpenStreetMap.

## Cómo ejecutarla

El JS usa **módulos ES**, así que hay que servir la carpeta por HTTP
(abrir `index.html` con doble clic / `file://` no carga los módulos por CORS):

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Alternativas: cualquier servidor estático, o el despliegue en Vercel.
La geolocalización solo funciona en contextos seguros (HTTPS o `localhost`).

## Estructura

```
├── index.html            estructura de la página (secciones, mapa, HUD, prompt)
├── css/
│   ├── variables.css     :root, tema oscuro, reset (se carga primero)
│   ├── base.css          nav, hero, botones, switch de tema, menú hamburguesa
│   ├── mapa.css          mapa, marcadores, popups, prompt, panel HUD, alerta GPS
│   ├── secciones.css     eventos, historial y modo oscuro de tarjetas
│   └── responsive.css    media queries (móvil, navbar, menú desplegable)
├── js/
│   ├── datos.js          rutas mock (misRutas)
│   ├── util.js           funciones puras: tiempo, distancia (Haversine), ritmo, colisión
│   ├── estado.js         objeto `estado` compartido (mapa, GPS, actividad, popups)
│   ├── dom.js            referencias a elementos del DOM (una sola vez)
│   ├── actividad.js      cronómetro, HUD, traza, guardado de sesiones
│   ├── proximidad.js     detección ≤ 50 m de una ruta + prompt (cooldown 20 s)
│   ├── geolocalizacion.js GPS: seguimiento continuo, errores, marcador del usuario
│   ├── mapa.js           abrir/cerrar mapa, dibujo de rutas y popups
│   ├── eventos.js        tarjetas de la sección Eventos
│   ├── navegacion.js     mostrar/ocultar secciones + menú móvil
│   ├── historial.js      localStorage: guardado, lectura, render y migración
│   ├── tema.js           modo oscuro persistente (clave `runwell-tema`)
│   └── main.js           punto de entrada: conecta botones ↔ módulos
└── docs/diagrama-casos-uso.md
```

Dependencias (sin ciclos): `datos/util/estado/dom` → `historial` → `actividad` →
`proximidad` → `geolocalizacion` → `mapa` → `eventos`; `main.js` importa todos.

## Funcionalidades

- Rutas predefinidas en Maracaibo (zonas LUZ y Paseo Sur) como mock data.
- Mapa interactivo que dibuja las rutas; botón 📍 para centrar la ubicación.
- Sección de Eventos con día/hora por ruta y botón "Ver Ruta en Mapa".
- Actividad tipo **trote o carrera** con cronómetro: se inicia desde los popups
  del mapa o desde el prompt de proximidad y se detiene con "Detener".
- Geolocalización con seguimiento continuo (`watchPosition`). Regla de errores:
  **lo automático es silencio (consola) y lo que pide el usuario avisa** (alerta
  `#alerta-gps` al pulsar 📍); las peticiones automáticas van sin `timeout` para
  no morir mientras el navegador muestra el diálogo de permiso. Al pulsar 📍
  aparece un toast azul con **las coordenadas y la precisión (± m) que reporta
  el navegador**, y el popup del marcador muestra lo mismo — así se distingue
  de inmediato una ubicación exacta (± decenas de m) de una aproximada por
  WiFi/IP (± cientos/miles de m). Lecturas con imprecisión > 35 m se descartan.
- Traza del recorrido: línea punteada azul que crece mientras hay actividad.
- Panel flotante en vivo (`#hud-actividad`): tiempo, distancia y ritmo min/km.
- Historial de sesiones en `localStorage` (clave `runwell-historial`), con
  migración automática de las claves/formatos antiguos.
- Modo oscuro persistente (`runwell-tema`).
- **Logs de la página a Supabase Storage** (`js/logs.js`): captura crashes
  (errores JS no manejados, promesas rechazadas y recursos rotos) y eventos de
  uso (secciones, mapa, actividad, login, GPS) más un heartbeat con el estado
  de la app. Los eventos se suben como JSON por sesión en el bucket `logs`
  **cada 60 s**, **inmediato al producirse un crash** y **al cerrar la
  pestaña** (`fetch` con `keepalive`). Si la subida falla, los eventos se
  conservan en buffer y se reintentan; los fallos de subida son silenciosos en
  pantalla (solo consola).

## Datos guardados (localStorage)

| Clave | Contenido |
|---|---|
| `runwell-historial` | Sesiones: `{id, tipo, ruta, fecha, tiempo, distancia, ritmo}` |
| `runwell-tema` | `"oscuro"` o `"claro"` |

## Notas

- Se sirve en Vercel; backend en **Supabase**: auth con avatar (bucket
  `avatars`), guardado de actividades (tabla `actividades`) y logs de la
  página (bucket `logs`).
- Casos de uso planeados en `docs/diagrama-casos-uso.md`.
