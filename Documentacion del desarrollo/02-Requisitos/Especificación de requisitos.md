# Especificación final de requisitos — RunWell

Especificación del sistema **tal como quedó en `main`** (2026-10-06), para el
punto 3 de las correcciones: necesidades, requisitos funcionales, no
funcionales, actores y requisitos de datos.

La especificación **inicial** (la visión con la que empezó el proyecto,
RF01–RF15 y RNF01–RNF15) vive en `Requerimientos funcionales.docx` y se
conserva como historia del proceso. Acá se documenta qué se implementó, qué
quedó a medias y qué quedó fuera de alcance, con el archivo donde se verifica.

## 1. Necesidades

Del estudio comparativo (`05-Cierre/Tabla comparativa.docx`) y
del alcance final:

- **Rutas locales, no globales**: las apps del mercado (Strava, NRC,
  TrainingPeaks) tratan al usuario como un punto en un mapa mundial; la
  necesidad es correr por rutas concretas de Maracaibo.
- **Sin barrera de entrada**: consultar rutas y eventos sin crear cuenta.
- **Métricas simples**: al usuario de bienestar le basta tiempo, distancia y
  ritmo; no cadencia ni segmentos competitivos.
- **Acompañamiento en el recorrido**: saber cuándo se está cerca de una ruta y
  poder iniciar la actividad desde ahí.
- **Historial propio**: constancia de lo que se corrió, sin perderlo al cerrar
  la pestaña.
- **Cuenta y presencia**: registrarse, iniciar sesión y tener avatar.
- **Ayuda en lenguaje llano**: un asistente que resuelva dudas dentro de la
  página.
- **Cuidado de los datos**: la ubicación es dato sensible; no debe quedar
  expuesta.

## 2. Actores

| Actor | Rol |
|---|---|
| **Corredor** | Usuario de la web. Puede usarla **sin sesión** (ver rutas, eventos, tema, actividad e historial local) o **con sesión** (avatar y copia de la sesión a Supabase). |
| **Supabase** | Sistema externo (BaaS). Único componente fuera del frontend: autenticación, tabla `actividades`, buckets `avatars` y `logs`. |
| **Navegador / proveedor de ubicación** | Fuente del GPS. No es un actor del dominio, pero condiciona los requisitos de geolocalización (permisos, precisión). |

No hay servidor propio ni build: frontend puro servido en Vercel + Supabase.

## 3. Requisitos funcionales

| ID | Requisito | Estado | Evidencia |
|---|---|---|---|
| RF01 | Registrarse, iniciar y cerrar sesión con correo y contraseña | Implementado | `js/servicios/auth.js` |
| RF02 | Subir avatar a Supabase Storage | Implementado | `js/servicios/auth.js`, bucket `avatars` |
| RF03 | Ver las rutas predefinidas dibujadas en el mapa | Implementado | `js/core/datos.js`, `js/servicios/mapa.js` |
| RF04 | Ver los eventos programados y abrir su ruta en el mapa | Implementado | `js/servicios/eventos.js` |
| RF05 | Iniciar y detener una actividad (trote o carrera) con cronómetro | Implementado | `js/servicios/actividad.js` (`TipoActividad` → `Trote`/`Carrera`) |
| RF06 | Panel en vivo con tiempo, distancia y ritmo min/km | Implementado | `js/servicios/actividad.js` (`#hud-actividad`) |
| RF07 | Dibujar la traza del recorrido mientras hay actividad | Implementado | `js/servicios/actividad.js` (`refrescarTraza()`) |
| RF08 | Seguimiento GPS continuo y botón para centrarse en la ubicación | Implementado | `js/servicios/geolocalizacion.js` |
| RF09 | Mostrar precisión de la ubicación (± m) para distinguir exacta de aproximada | Implementado | `js/servicios/geolocalizacion.js` |
| RF10 | Avisar cuando el usuario está a ≤ 50 m de una ruta (cooldown 20 s) | Implementado | `js/servicios/proximidad.js` |
| RF11 | Guardar las sesiones en el historial local y poder limpiarlo | Implementado | `js/servicios/historial.js` |
| RF12 | Alternar tema claro/oscuro y recordarlo | Implementado | `js/servicios/tema.js` |
| RF13 | Consultar dudas a un asistente en la página | Implementado | `js/servicios/chatbot.js` |
| RF14 | Copiar la sesión terminada a la tabla `actividades` de Supabase | Implementado | `js/servicios/actividad.js` (`insert`) |
| RF15 | Enviar eventos y crashes a Supabase Storage de forma automática | Implementado | `js/servicios/logs.js` (bucket `logs`) |

### Requisitos originales que quedaron fuera de alcance

Estaban en la especificación inicial y **no** se implementaron; se listan para
que no se asuman como parte del sistema:

| Requisito original | Motivo |
|---|---|
| Registro con edad y nivel de condición física | El registro final es correo/contraseña + avatar; el perfil detallado no aportaba al alcance |
| Bloques de actividad (caminata, trote, estiramiento como bloques) | El modelo final es **trote/carrera** como tipo de actividad, sin bloques |
| Creación de retos locales por usuarios o estudios | Requería backend/perfiles públicos, fuera del alcance |
| Notificaciones de motivación | No se implementó |
| Ajuste de tamaño de fuente y contraste | Solo se implementó el tema oscuro |
| Flexibilidad de rutinas (reemplazar un bloque por otro) | Dependía del modelo de bloques |
| Sincronización de sesiones entre dispositivos | Sin backend propio; el historial es local |
| Perfil "compañero de salud" (ver progreso de otros) | Fuera del alcance |
| Modo "solo salud" (ocultar métricas competitivas) | No se implementó |

## 4. Requisitos no funcionales

| ID | Requisito | Estado | Evidencia / nota |
|---|---|---|---|
| RNF01 | Diseño orientado a objetos (clases, herencia, encapsulación) | Implementado | 18 clases y 15 herencias; `__poo.html`, 58 checks |
| RNF02 | Seguridad de los datos en Supabase | Implementado | RLS activo con mínimo privilegio; ver `Documentación Supabase.md` |
| RNF03 | Privacidad de la ubicación | Implementado | Solo el `heartbeat` lleva `pos`, a 5 decimales, cada 60 s, sin retención; bucket `logs` sin `SELECT` |
| RNF04 | Interfaz responsiva | Implementado | `css/responsive.css` (probado en escritorio; móvil no verificado) |
| RNF05 | Idioma español, sin tecnicismos | Implementado | Todo el contenido de la app |
| RNF06 | Mantenibilidad: agregar servicios sin tocar la lógica base | Implementado | `ServicioBase` + módulos; `main.js` como raíz de composición |
| RNF07 | Compatibilidad con navegadores modernos | Parcial | Verificado solo en Firefox 157 (arneses de prueba) |
| RNF08 | Usabilidad: primera actividad sin ayuda | No medido | Requiere prueba con usuarios |
| RNF09 | Tiempo de carga del mapa e interfaz | No medido | Sin medición instrumentada |
| RNF10 | Escalabilidad (1.000 usuarios concurrentes) | No verificado | Depende de Supabase/Vercel; no hay prueba de carga |
| RNF11 | Disponibilidad (uptime 99,9 %) | No aplicable | La disponibilidad la ofrecen Vercel y Supabase, no el código |
| RNF12 | Accesibilidad WCAG 2.1 AA | No verificado | Sin auditoría de accesibilidad |
| RNF13 | Cifrado en reposo y en tránsito | Delegado | Lo provee Supabase (TLS y cifrado en reposo) |
| RNF14 | Funcionar sin conexión y sincronizar al volver | Fuera de alcance | El historial es local (`localStorage`); no hay cola de sincronización |
| RNF15 | Latencia de la IA < 1 s | No medido | La respuesta depende de la API de Gemini |

> Criterio: "No medido" y "No verificado" significan que no se puede afirmar sin
> una prueba; quedan como objetivo, no como logro. Es preferible esto a dar por
> cumplido lo que no se comprobó.

## 5. Requisitos de datos

### 5.1 Datos locales (`localStorage`)

| Clave | Contenido | Formato |
|---|---|---|
| `runwell-historial` | Sesiones terminadas | `{id, tipo, ruta, fecha, tiempo, distancia, ritmo}` |
| `runwell-tema` | Preferencia de tema | `"oscuro"` o `"claro"` |

Claves antiguas (`runwell_historial` y registros con `duracionSegundos` /
`distanciaMetros`) se migran al arrancar y se unifican en el formato actual
(`migrarDatosAntiguos()`, `js/servicios/historial.js`).

### 5.2 Datos en Supabase

| Recurso | Tipo | Datos | Acceso |
|---|---|---|---|
| Autenticación | Supabase Auth | Correo y contraseña; sesión de usuario | Usuario autenticado |
| `actividades` (tabla) | Postgres | `{tipo, tiempo, distancia}` de cada sesión terminada | Solo `INSERT`; sin `SELECT` (RLS) |
| `avatars` (bucket) | Storage | Imagen de avatar del usuario | `INSERT` y lectura pública del objeto |
| `logs` (bucket) | Storage | Eventos de uso, crashes y `heartbeat` (incluye `pos` de GPS) | Solo `INSERT`; sin `SELECT` |

### 5.3 Limitaciones declaradas

- La tabla `actividades` **no** guarda el identificador del usuario: el
  `INSERT` es anónimo y no se puede consultar desde el cliente (RLS sin
  política de `SELECT`).
- No se almacena el recorrido completo (traza): solo la última posición en el
  `heartbeat`.
- La geolocalización guardada va a 5 decimales (≈ 1 m) y sin retención
  programada.

## 6. Cómo se verifica

- Los requisitos funcionales que tienen arnés están cubiertos por la pasada
  completa de pruebas: **156/156 checks** (geo 23, popup 30, e2e 37, POO 58,
  logs 8), `Documentacion del desarrollo/04-Pruebas/Pruebas.md`.
- Las políticas de Supabase, por sondeo externo sin sesión
  (`Documentación Supabase.md`).
- Las clases y jerarquías, por `grep` sobre `js/core/` y `js/servicios/` (ver
  `Documentacion del desarrollo/03-Diseño-UML/Diagrama de clases.png`).
