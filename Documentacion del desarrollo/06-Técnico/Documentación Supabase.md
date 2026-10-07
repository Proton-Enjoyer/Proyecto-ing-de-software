# Seguridad en Supabase

RunWell no tiene servidor propio: lo único que protege los datos es la
configuración de Supabase. La clave del cliente `sb_publishable_...` va en el
frontend **a propósito** — es un valor público, no un secreto. Lo que la
sostiene son las políticas RLS y de Storage descritas aquí.

---

## 1. Qué usa la aplicación

| Recurso | Tipo | Uso | Operaciones que hace la app |
|---|---|---|---|
| `actividades` | tabla | historial de sesiones | **solo `INSERT`** |
| `avatars` | bucket **público** | foto de perfil | `upload` + `getPublicUrl` |
| `logs` | bucket **privado** | telemetría y crashes | `upload` |

No hay más tablas ni buckets, y **no hay ningún `SELECT` en toda la
aplicación**: el historial que se muestra en pantalla sale de `localStorage`.
El perfil tampoco vive en una tabla — `signUp` guarda `first_name`,
`last_name` y `avatar_url` en los metadatos del usuario de Auth.

Columnas que envía el cliente: `tipo` (`Trote` / `Carrera`), `tiempo`
(`MM:SS`) y `distancia` (km con 2 decimales). El `INSERT` **no envía
`user_id`** ni comprueba sesión: la tabla lo rellena en el servidor. La
escritura local ocurre antes que el `INSERT`, así que si la petición falla
solo se pierde la sincronización (el error va a la consola).

---

## 2. Políticas RLS — tabla `actividades`

Como la app solo inserta, la tabla necesita una política de `INSERT` y
**ninguna de `SELECT`**: sin política de lectura, nadie puede leer el
historial con la clave pública.

```sql
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

-- Solo INSERT. `anon` es necesario: el INSERT no exige sesión.
CREATE POLICY "actividades_insert" ON public.actividades
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

Estado verificado en el SQL Editor: RLS activo y **una única política**,
`actividades_insert` (`cmd = insert`). Consulta sin sesión con la clave
pública → `[]`, es decir 0 filas visibles (devolvía filas de otros usuarios
antes de aplicar este bloque).

---

## 3. Políticas de Storage

**`avatars`** — tiene que ser **público**: el registro usa `getPublicUrl()`,
y con bucket privado esa URL no devolvería nada. La subida ocurre **antes**
del `signUp`, es decir sin sesión, y va a la raíz del bucket como
`<marca-tiempo>.<ext>`:

```sql
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars' AND name !~ '/' AND char_length(name) <= 60);
```

Riesgo aceptado: cualquiera con la URL ve la foto de perfil. Cerrarlo
exigiría bucket privado + signed URL desde una Edge Function, que **no está
implementado**.

**`logs`** — **privado**. La ruta real del archivo es
`<uuid>/parte-NNNN.json`, donde el `uuid` lo genera el cliente con
`crypto.randomUUID()`. `logs.js` no comprueba sesión porque los eventos de
crash y de carga de página se registran también desde la pantalla de login:

```sql
CREATE POLICY "logs_insert" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'logs'
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/parte-[0-9]{4}\.json$'
  );
```

### Estado final de `storage.objects`

RLS está activo en la tabla de Storage (`relrowsecurity = true`) y quedan
**tres** políticas, verificadas en el SQL Editor:

| Política | Comando | Roles | Condición |
|---|---|---|---|
| `avatars_insert` | `INSERT` | anon, authenticated | bucket `avatars`, sin `/`, ≤ 60 caracteres |
| `logs_insert` | `INSERT` | anon, authenticated | bucket `logs`, `<uuid>/parte-NNNN.json` |
| `rw_avatars_select` | `SELECT` | anon | bucket `avatars` |

- **`logs` no tiene ninguna política de `SELECT`**: con la clave pública ni
  siquiera se puede listar el bucket — la lectura devuelve `404 not_found`.
- **`avatars` sí tiene `SELECT`**, lo mismo que ya cubre `getPublicUrl()`:
  el bucket es público, así que sería redundante quitarlo.
- **No hay ninguna política de `UPDATE` ni `DELETE`:** la app no actualiza ni
  borra nada de Storage y, de paso, nadie desde el cliente puede sobrescribir
  ni borrar archivos ajenos.

**Limpieza aplicada.** El proyecto arrastraba políticas legacy creadas para
que la subida funcionara sin sesión — `rw_logs_select`, `rw_logs_update`,
`rw_logs_insert`, `rw_avatars_insert`, `rw_avatars_update` y
`Permitir subida de avatares 1oj01fe_0`. Las de `SELECT`/`UPDATE` sobre
`logs` dejaban **descargables los JSON con las coordenadas del `heartbeat`**
a cualquiera con la clave pública; se retiraron junto con los `INSERT`
duplicados, que cubren las dos políticas de la tabla. Los buckets no cambian:
el tamaño máximo y los tipos permitidos se limitan en su configuración
(`file_size_limit`, `allowed_mime_types`), no dentro de la política.

Verificación externa (sin sesión, con la misma clave que usa la app):

```
GET /storage/v1/object/logs/<uuid>/parte-0001.json  → 404 not_found
POST /storage/v1/object/list/logs                   → []
GET /storage/v1/object/public/avatars/<archivo>     → 200
GET /rest/v1/actividades?select=*                   → []
```

---

## 4. Datos de geolocalización en los logs

Es la parte más sensible de la telemetría.

**Solo un evento lleva coordenadas.** De todos los tipos que escribe el
`Logger`, únicamente `heartbeat` incluye `pos: [lat, lng]`:

| Evento | Cadencia | Ubicación |
|---|---|---|
| `heartbeat` | cada 60 s | **`pos: [lat, lng]`** + `dist_m`, `segundos`, `activa` |
| `gps-lectura` | al pedir posición | solo `precision` (metros), **sin** coordenadas |
| `gps-error` | fallo de GPS | solo el código (`PERMISSION_DENIED`, etc.) |
| `carga-pagina` | una vez | `ref`, `pantalla`, `navegador` |
| resto | interacción | ninguno |

Además, **a todos** los eventos se les añaden `t` (hora ISO), `tipo` y
`pagina` (qué sección estaba abierta).

**Precisión:** `pos` se redondea a **5 decimales**
(`Math.round(x * 1e5) / 1e5`), que equivale a **≈ 1 m**. No es una
generalización: es una ubicación con precisión de puerta de entrada. Si el
GPS no ha dado permiso, `pos` es `null` y el `heartbeat` no lleva ubicación.

**Dónde queda:** bucket privado `logs`, en `<uuid>/parte-NNNN.json`. Cada
archivo acumula los eventos de una sesión, y ese identificador es aleatorio
en el cliente, **no** está vinculado a `auth.uid()`.

**Quién puede leerlo:** nadie desde el cliente — la política de la sección 3
no incluye `SELECT`. Solo el `service_role` desde la consola de Supabase.

**Cuánto se guarda:** el código **no borra nada**. No hay retención ni purga:
los archivos se acumulan hasta que se limpien desde el servidor.

**Riesgos:**

1. *Reidentificación por trayectoria.* `heartbeat` cada 60 s con `pos` a ~1 m
   permite reconstruir hacia dónde se mueve; dos o tres muestras bastan para
   inferir dónde vive. Es el riesgo mayor.
2. *Fingerprint combinado.* `carga-pagina` añade user agent, resolución y
   referrer, que junto con las coordenadas y las marcas de tiempo aumentan la
   trazabilidad.
3. *Retención indefinida.* El historial de ubicaciones crece sin límite.

**Mitigaciones propuestas (ninguna está aplicada hoy):** redondear `pos` a 3
decimales (≈ 110 m, un cambio de una línea en `resumenApp()` que no afecta al
mapa ni a la traza), no guardar `pos` cuando `activa` es `false`, y fijar una
ventana de retención con borrado servidor-side. La única mitigación **ya
activa** es que el bucket `logs` esté privado y sin política de `SELECT`.

---

## 5. Claves

- **`sb_publishable_...`**: clave pública de cliente, versionada a propósito
  en `supabase-config.js`. No protege nada por sí sola; contra ella están las
  políticas de las secciones 2 y 3.
- **`service_role`**: privilegios completos, salta RLS. Solo en servidor o
  Edge Functions, nunca en el navegador ni en el repositorio.

---

## Referencias

- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Storage: https://supabase.com/docs/guides/storage
- supabase-js: https://supabase.com/docs/reference/javascript
