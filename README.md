# RunWell 🏃

Aplicación web de seguimiento de running: rutas predefinidas en Maracaibo, mapa interactivo,
actividades con cronómetro (trote/carrera) e historial de sesiones.

Proyecto académico de Ingeniería de Software — frontend puro (HTML + CSS + JavaScript),
sin frameworks. Se hostea en Vercel y usa Supabase como backend. Mapas con [Leaflet](https://leafletjs.com/) + OpenStreetMap.

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
├── supabase-config.js    SUPABASE_URL + SUPABASE_KEY (clave pública, versionada a propósito)
├── supabase.js           cliente de Supabase (browser client)
├── css/
│   ├── variables.css     :root, tema oscuro, reset (se carga primero)
│   ├── base.css          nav, hero, botones, switch de tema, menú hamburguesa
│   ├── mapa.css          mapa, marcadores, popups, prompt, panel HUD, alerta GPS
│   ├── secciones.css     eventos, historial y modo oscuro de tarjetas
│   ├── chatbot.css       ventana flotante del asistente (chips, mensajes)
│   └── responsive.css    media queries (móvil, navbar, menú desplegable)
├── js/
│   ├── base.js           abstracciones: EmisorEventos, bus, ServicioBase, Repositorio
│   ├── recursos.js       constantes compartidas (avatar por defecto, bucket de avatares)
│   ├── datos.js          rutas mock (misRutas)
│   ├── util.js           funciones puras: tiempo, distancia (Haversine), ritmo, colisión
│   ├── estado.js         estado compartido (mapa, GPS, actividad, popups)
│   ├── dom.js            referencias a elementos del DOM (una sola vez)
│   ├── actividad.js      Actividad: cronómetro, HUD, traza, guardado de sesiones
│   ├── proximidad.js     ProximityDetector: detección ≤ 50 m + prompt (cooldown 20 s)
│   ├── geolocalizacion.js GeolocationService: seguimiento GPS, errores, marcador
│   ├── mapa.js           MapController: abrir/cerrar mapa, dibujo de rutas y popups
│   ├── eventos.js        EventosController: tarjetas de la sección Eventos
│   ├── navegacion.js     Navegacion: mostrar/ocultar secciones + menú móvil
│   ├── historial.js      HistoryRepository: localStorage (guardado, lectura, migración)
│   ├── tema.js           Tema: modo oscuro persistente (clave `runwell-tema`)
│   ├── auth.js           AuthService: modal de login/registro y sesión
│   ├── chatbot.js        Chatbot: asistente de la interfaz
│   ├── logs.js           Logger: eventos y crashes → Supabase Storage (bucket `logs`)
│   └── main.js           raíz de composición: instancia y conecta las piezas
```

Estilo orientado a objetos: `EmisorEventos` (Observer) → `bus` + `ServicioBase` +
`StateStore`; 10 clases de servicio heredan de `ServicioBase`; `Repositorio` →
`HistoryRepository`; `TipoActividad` → `Trote` / `Carrera`. Los servicios no
importan al logger: publican con `registrar(...)` y el `Logger` se suscribe al
bus.

Patrones de diseño **implementados** (solo los que se pueden señalar en el
código): Observer, Repository, singleton por módulo, herencia/polimorfismo con
encapsulación e inyección de dependencias. Cada uno con su archivo, su porqué
y su verificación en
`Documentacion del desarrollo/Sprints/Patrones de diseño.md`, que también
deja constancia de los patrones que **no** están implementados.

Dependencias: `datos/util/estado/dom` → `historial` → `actividad` →
`proximidad` → `geolocalizacion` → `mapa` → `eventos`; `main.js` importa todos.
Hay un ciclo intencional `actividad ↔ mapa` (resuelto por hoisting de las
declaraciones de función).

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
  migración automática de las claves/formatos antiguos. Al detener, la sesión
  se guarda localmente y se sincroniza en la tabla `actividades` de Supabase
  (`tipo`, `tiempo`, `distancia`); si esa subida falla, solo se avisa por
  consola y el registro local sigue ahí.
- Modo oscuro persistente (`runwell-tema`).
- **Registro e inicio de sesión** con sesión persistente (`js/auth.js`):
  modal de login/registro, avatar de perfil (bucket `avatars`) y cierre de
  sesión. El historial local y el avatar conviven con la copia sincronizada
  en Supabase.
- **Logs de la página a Supabase Storage** (`js/logs.js`): captura crashes
  (errores JS no manejados, promesas rechazadas y recursos rotos) y eventos de
  uso (secciones, mapa, actividad, login, GPS) más un heartbeat con el estado
  de la app. Los eventos se suben como JSON por sesión en el bucket `logs`
  **cada 60 s**, **inmediato al producirse un crash** y **al cerrar la
  pestaña** (`fetch` con `keepalive`). Si la subida falla, los eventos se
  conservan en buffer y se reintentan; los fallos de subida son silenciosos en
  pantalla (solo consola).

## Pruebas

La validación se hace con **arneses de regresión** (`__*.html` en la raíz del
repo) que cargan la app real en Firefox headless, la ejercitan con clics y
llamadas reales y capturan cualquier `window.onerror`. Última pasada completa
(2026-10-06): **156/156 checks, 0 fallos, 0 errores de consola**, cubriendo:

- permisos y geolocalización (4 escenarios con `navigator.geolocation` y
  `navigator.permissions` mockeados),
- popup de actividad (cronómetro, HUD, historial),
- recorrido extremo a extremo (navegación, mapa, historial + migración de
  claves antiguas, tema oscuro, chatbot, modal de auth, GPS),
- POO (Observer, contrato de `Repositorio`, jerarquías, encapsulación) y
- `Logger` (buffer, crashes y subida real a Supabase).

Con cómo reproducirla (`pruebas/servidor.py` + `pruebas/correr.py`) y la
evidencia cruda check por check, en
`Documentacion del desarrollo/Sprints/Pruebas.md`.

## Documentación

- `Documentacion del desarrollo/Sprints/Patrones de diseño.md` — patrones
  implementados y, aparte, los que **no** lo están.
- `Documentacion del desarrollo/Sprints/Especificación de requisitos.md` —
  especificación final: necesidades, actores, RF/RNF con su estado y
  requisitos de datos.
- `Documentacion del desarrollo/Sprints/Pruebas.md` — pruebas, cómo
  reproducirlas y evidencia cruda de la última pasada.
- `Documentacion del desarrollo/Sprints/Documentación Supabase.md` —
  esquema, políticas RLS/Storage y verificación de seguridad.
- `Documentacion del desarrollo/Sprints/Cierre de proyecto.md` — cierre:
  logros, dificultades, decisiones, mantenimiento y conclusiones.
- `Documentacion del desarrollo/Sprints/Diagrama de clases Final.png` y
  `Sprints/Diagrama de Casos de Uso Final.png` — UML del sistema final
  (clases y casos de uso), exportados desde código Mermaid.
- `Documentacion del desarrollo/Sprints/Diagrama de Gantt Final.png` —
  planificación: actividades, hitos y responsables (cronograma).
- `Documentacion del desarrollo/Sprints/Metodologias de desarrollo de SW V2, Grupo 6.docx`
  — metodología incremental y planificación de los incrementos.
- `Documentacion del desarrollo/Sprints/Matriz y Clasificacion de Riesgos - Sistema Wellness (1).docx`
  — análisis y clasificación de riesgos del proyecto.

## Datos guardados (localStorage)

| Clave | Contenido |
|---|---|
| `runwell-historial` | Sesiones: `{id, tipo, ruta, fecha, tiempo, distancia, ritmo}` |
| `runwell-tema` | `"oscuro"` o `"claro"` |

## Notas

- Se sirve en Vercel; backend en **Supabase**: auth con avatar (bucket
  `avatars`), guardado de actividades (tabla `actividades`) y logs de la
  página (bucket `logs`).

### Sobre la clave de Supabase

`supabase-config.js` está versionado en el repo a propósito. Contiene
`SUPABASE_URL` y `SUPABASE_KEY`, donde la key es de tipo
`sb_publishable_...`: una **clave pública de cliente** que Supabase diseñó para
ir embebida en el frontend. No es un secreto y no otorga accesos por sí sola.

La seguridad del proyecto **no depende de ocultarla**, sino de las políticas
RLS y de Storage. Estado real hoy:

- **Tabla `actividades`**: política de **solo `INSERT`** y ninguna de
  `SELECT`, así que la app escribe pero la tabla no se puede leer con la
  clave pública. El cliente no envía `user_id`: lo rellena el servidor.
- **Bucket `logs`**: privado, solo política de `INSERT` con la forma real del
  archivo (`<uuid>/parte-NNNN.json`). Sin `SELECT`: la telemetría —incluidas
  las coordenadas del `heartbeat`— solo la lee el `service_role`.
- **Bucket `avatars`**: público, porque el registro usa `getPublicUrl()`. La
  subida es anónima porque ocurre antes del `signUp`.

La `service_role` (privilegios completos, salta RLS) nunca debe llegar al
navegador: si alguna vez hace falta, va en el servidor / Edge Functions.
Detalle completo, políticas SQL y el manejo de los datos de geolocalización
en `Documentacion del desarrollo/Sprints/Documentación Supabase.md`.
