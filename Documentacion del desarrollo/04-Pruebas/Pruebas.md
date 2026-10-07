# Pruebas realizadas y sus resultados

Pasada completa: **2026-10-06 · 156/156 checks · 0 fallos · 0 errores de consola**.

La validación de RunWell no usa un framework: se hace con **arneses HTML**
(`__*.html`, en la raíz del repo, **versionados a propósito** — son la
evidencia reproducible) que cargan la aplicación real, la ejercitan
con clics y llamadas reales y capturan cualquier `window.onerror`. Cada arnés
reporta sus checks a un servidor local (`pruebas/servidor.py`), que los guarda
tal cual — esa salida sin editar es la evidencia versionada en
[`evidencia/`](evidencia/).

---

## 1. Qué se probó y resultado

| Arnés | Alcance | Escenarios | Checks | Resultado |
|---|---|---|---|---|
| `__geo.html` | Permisos y geolocalización, con `navigator.geolocation` y `navigator.permissions` mockeados | 4 (`?esc=pendiente/concede/ok/denegado`) | 4 + 4 + 11 + 4 | **23/23** |
| `__popup.html` | Popup del mapa al iniciar/detener actividad: cronómetro, HUD, botones, historial | 1 | 30 | **30/30** |
| `__e2e.html` | Regresión extremo a extremo: navegación, mapa, historial + migración de claves, tema oscuro, chatbot, modal de auth, GPS | 1 | 37 | **37/37** |
| `__poo.html` | POO: Observer, contrato de `Repositorio`, jerarquías, encapsulación con `#`, singletons de módulo, storage inyectado | 1 | 58 | **58/58** |
| `__probe_logs.html` | `Logger`: importación, buffer con tope de 300, crash y crash de promesa, subida sin pérdida de eventos | 1 | 8 | **8/8** |
| | | **8 corridas** | **156** | **156/156** |

Detalle check por check (entrada y salida de cada uno) en
`evidencia/*.txt`, una corrida por archivo, más el agregado de la
pasada en `evidencia/resumen.json`.

### Qué cubre cada bloque

- **Geolocalización** — 4 escenarios de permiso del navegador: *pendiente*
  (no se alerta mientras el diálogo está abierto), *concede*, *ok* (ubicación
  real mockeada: marcador, vuelo del mapa, toast y popup con coordenadas) y
  *denegado* (aviso en pantalla, en español). En todos: **0 errores JS**.
- **Popup** — abrir/cerrar mapa, iniciar trote y carrera desde el popup,
  que el cronómetro avanza y coincide con el HUD, que "Detener" sigue
  visible sin reabrir el popup, y que al detenerse se guarda la sesión en el
  historial (1 y 2 sesiones, campos y tipo correctos).
- **Extremo a extremo** — navegación entre secciones, dibujo de rutas
  (2 marcadores y 1 polyline por ruta, 8 y 4 en total), tema oscuro que
  persiste, render y limpieza del historial, **migración** de las claves
  antiguas (`runwell_historial`, `duracionSegundos`…), chatbot, modal de
  login/registro y error de GPS en pantalla.
- **POO** — `EmisorEventos` (suscribir, cancelar, no duplicar, aíslar
  fallos), `bus` como canal único, contrato `Repositorio` por método,
  `StateStore` con privados no enumerables, jerarquía `TipoActividad` →
  `Trote`/`Carrera`, singletons de módulo y `HistoryRepository` con storage
  inyectado. Es la misma base que sustenta `Patrones de diseño.md`.
- **Logs** — que `logs.js` importa y expone `__logs`, que la app real carga
  en un iframe, que los eventos acumulan timestamp, que el crash (y el de
  promesa) se captura, que el buffer no pasa de 300 y que `subir()` no
  pierde eventos si la petición falla. Esta corrida **sube a Supabase de
  verdad** (bucket `logs`), así que además de lógica comprueba que la
  política de `INSERT` sigue permitiendo la subida anónima.

---

## 2. Cómo reproducirlo

```bash
# 1. servidor local que además recoge los reportes de /bc?d=
python3 pruebas/servidor.py 8000 &

# 2. corre los 8 escenarios en Firefox headless (perfil nuevo por corrida)
python3 pruebas/correr.py
```

El resultado sale por pantalla (`ok/total` por arnés) y queda en
`/tmp/runwell-pruebas/resumen.json`, con los reportes crudos en
`/tmp/runwell-pruebas/evidencia/` (uno por escenario). Cada arnés se puede
abrir a mano en el navegador (`http://localhost:8000/__e2e.html`) y los
checks también se ven en la consola.

---

## 3. Entorno de la corrida

| | |
|---|---|
| Fecha | 2026-10-06, 17:48 |
| Sistema | Arch Linux, kernel 7.2.8-arch1-2 |
| Navegador | Mozilla Firefox 157.0, **headless**, perfil desechable nuevo por corrida |
| Servidor | `python3` local en `127.0.0.1:8000` (sin build, sin framework) |
| Red | con acceso a internet (Leaflet desde CDN y subida real a Supabase) |

---

## 4. Qué **no** cubre esta pasada

Para que la evidencia no parezca más de lo que es:

- **Solo Firefox desktop.** No se probaron Chrome, Safari ni navegadores
  móviles (iOS/Android), donde el permiso de geolocalización se comporta
  distinto.
- **El GPS está mockeado** en los escenarios que lo requieren: no hay
  recorrido físico real con dispositivo de verdad.
- **No hay prueba de carga ni de rendimiento**, ni de accesibilidad (WCAG).
- **La subida a Supabase** se verifica en condiciones reales de red, pero no
  se cubren los casos de caída del servicio más allá de un fallo simulado.

Esas son las tareas de mantenimiento con prioridad alta que quedan
registradas en `Cierre de proyecto.md` §4.
