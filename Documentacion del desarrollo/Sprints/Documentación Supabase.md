# Seguridad en Supabase — Proyecto (documentación)

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
