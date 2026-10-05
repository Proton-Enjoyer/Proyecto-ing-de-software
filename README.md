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

  # Seguridad en Supabase

Esta guía documenta las recomendaciones y políticas para asegurar el backend en Supabase del proyecto. Incluye: políticas RLS (Row Level Security) para tablas clave, configuración de Storage (buckets privados, metadata, signed URLs), manejo de claves y pruebas. Aplica los snippets SQL en la consola SQL de Supabase adaptando nombres de tablas/columnas según tu esquema.

---

## Principios generales
- Habilitar RLS en todas las tablas que contienen datos por usuario.
- Usar auth.uid() para asociar filas a la identidad autenticada.
- Usar WITH CHECK para evitar que un usuario cree/edite filas asignadas a otro usuario.
- Nunca exponer la service_role key en el cliente (sólo en servidor/Edge Functions).
- Mantener buckets de Storage privados para datos de usuario; usar signed URLs para compartir temporalmente.
- Auditar cambios y probar políticas con cuentas de prueba.

---

## Políticas RLS recomendadas (ejemplos)
Adapta los nombres de tablas/columnas. Estos ejemplos asumen tablas: `runs`, `profiles`, `routes`, `logs`. Ejecuta en la pestaña SQL de Supabase.

```sql
-- runs (historial de actividad)
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own runs" ON public.runs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Insert run as self" ON public.runs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own runs" ON public.runs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own runs" ON public.runs
  FOR DELETE
  USING (user_id = auth.uid());
```

```sql
-- profiles (perfil de usuario: id = uid)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own profile" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Modify own profile" ON public.profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

```sql
-- routes (si algunas rutas son públicas)
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select public or owner routes" ON public.routes
  FOR SELECT
  USING (is_public = true OR owner = auth.uid());

CREATE POLICY "Manage routes by owner or admin" ON public.routes
  FOR ALL
  USING (owner = auth.uid() OR (auth.role() = 'authenticated' AND (current_setting('jwt.claims.role', true) = 'admin')))
  WITH CHECK (owner = auth.uid() OR (auth.role() = 'authenticated' AND (current_setting('jwt.claims.role', true) = 'admin')));
```

```sql
-- logs (telemetría sensible)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert logs as self" ON public.logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Select own logs" ON public.logs
  FOR SELECT
  USING (user_id = auth.uid());
```

Notas:
- Si permites lecturas públicas en una tabla, añade columna `is_public` y úsala en USING.
- current_setting('jwt.claims.role', true) permite leer claims personalizados si los incluyes en el JWT (configura con cuidado).

---

## Storage: buckets, metadata y políticas
Recomendaciones:
- Crear buckets privados para archivos de usuario (fotos, GPX, etc.).
- Al subir objetos desde el cliente, añadir metadata `owner = auth.uid()`.
- Habilitar RLS sobre `storage.objects` y restringir SELECT/INSERT/UPDATE/DELETE al owner.

Ejemplo (storage.objects):

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storage_select_owner" ON storage.objects
  FOR SELECT
  USING ((metadata ->> 'owner')::text = auth.uid());

CREATE POLICY "storage_insert_owner" ON storage.objects
  FOR INSERT
  WITH CHECK ((metadata ->> 'owner')::text = auth.uid());

CREATE POLICY "storage_delete_owner" ON storage.objects
  FOR DELETE
  USING ((metadata ->> 'owner')::text = auth.uid());

CREATE POLICY "storage_update_owner" ON storage.objects
  FOR UPDATE
  USING ((metadata ->> 'owner')::text = auth.uid())
  WITH CHECK ((metadata ->> 'owner')::text = auth.uid());
```

Subidas desde cliente:
- En supabase-js: await supabase.storage.from('private-bucket').upload(path, file, { metadata: { owner: supabase.auth.user().id } })
- RLS WITH CHECK evita que un cliente ponga metadata.owner distinto del JWT.

Descargas y compartición:
- Para compartir temporalmente: generar signed URLs desde servidor/Edge Function (usar service_role key en secreto).
- Para descargas directas con usuario autenticado, las políticas RLS permiten al SDK del cliente descargar si el owner coincide.

---

## Signed URLs (Edge Function — esquema)
1. El cliente solicita un signed URL a tu Edge Function/proxy (incluye token del usuario).
2. La función verifica que el usuario tiene derecho al recurso (opcional).
3. La función usa la service_role key en secreto para crear el signed URL:
   - supabaseAdmin.storage.from('private-bucket').createSignedUrl(path, 60)
4. Devuelve el URL al cliente.

Importante: verificar permisos antes de crear signed URL para evitar leaks si alguien conoce paths.

---

## Gestión de claves y roles
- Anon key: para clientes (navegador). No anules RLS desde el cliente.
- Service_role key: sólo en servidor/Edge functions; omite RLS (privilegios completos). Guardar en secret manager, nunca en código público.
- Rotar keys si sospechas filtración.
- Limitar privilegios de cuentas de servicio donde sea posible.

---

## Buenas prácticas operativas
- Habilitar RLS por defecto en nuevas tablas con datos de usuario.
- Revisar las políticas periódicamente (code review / auditoría).
- Mantener una tabla de auditoría para cambios sensibles (escrita desde backend con service_role).
- Restringir CORS/orígenes que puedan usar tu anon key.
- Evitar exponer metadata sensible en consultas públicas.
- Usar vistas/functs para devolver solo columnas permitidas (en lugar de exponer toda la tabla).

---

## Checklist para el repositorio (qué documentar / aplicar)
- [ ] Habilitar RLS en tablas: runs, profiles, routes, logs, cualquier tabla con user_id.
- [ ] Implementar políticas SELECT/INSERT/UPDATE/DELETE con auth.uid() y WITH CHECK.
- [ ] Buckets privados en Storage; no usar buckets públicos para datos de usuario.
- [ ] Añadir metadata.owner = auth.uid() al subir objetos; políticas sobre storage.objects.
- [ ] Generar signed URLs desde servidor/Edge Functions (service_role).
- [ ] Guardar service_role en secretos, no en el repo.
- [ ] Tests: crear usuarios de prueba A/B y verificar que no se cruzan permisos.
- [ ] Documentar en README dónde están las keys y el procedimiento para rotarlas.

---

## Pruebas y debugging de políticas
- Crear usuarios de prueba en Supabase Auth y generar tokens.
- Usar la pestaña SQL / Policies UI para probar consultas como distintos usuarios.
- Verificar que:
  - Usuario A no puede SELECT/UPDATE/DELETE filas de Usuario B.
  - No se puede INSERT con user_id distinto al auth.uid().
  - Subida de archivo con metadata.owner distinto falla.
- Para storage: probar upload/download desde cliente autenticado y desde anon.

---

## Riesgos frecuentes y mitigaciones
- Filtración de service_role -> rotar la key y revisar logs, mover a secret manager.
- Buckets públicos con datos personales -> auditar buckets, convertir a private.
- Políticas incompletas que permiten escalation -> revisar policies con auditoría y tests.
- Metadata manipulable -> usar WITH CHECK que compara metadata con auth.uid().

---

## Recursos y referencias
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Storage: https://supabase.com/docs/guides/storage
- Documentación de supabase-js: https://supabase.com/docs/reference/javascript

