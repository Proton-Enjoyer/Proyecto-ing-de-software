# Correcciones del profesor (transferencia)

Fuente: mensaje del profesor, anterior a los commits de Wil.
Pendiente de resolver **antes de la aprobación para transferencia**.

> La clave `sb_publishable_...` de Supabase es una clave pública de cliente: su
> presencia en el frontend no constituye por sí sola un secreto. Pero la
> seguridad debe quedar respaldada por las políticas RLS y de Storage.
>
> **No** crear retrospectivamente Issues, PRs o GitHub Actions que no hayan
> formado parte del proceso real.
>
> No tocar los `.docx`: los arregla el usuario.

## Lista

- [ ] **1. README y documentación al día con `main`** — se indica que el sistema
      no usa backend, pero la app ya integra Supabase (auth, persistencia, Storage).
- [ ] **2. Planificación completa** — actividades, hitos, responsabilidades,
      cronograma/Gantt y análisis de riesgos.
- [ ] **3. Especificación final de requisitos** — necesidades, requisitos
      funcionales, no funcionales, actores y requisitos de datos.
- [ ] **4. UML actualizado del sistema final** — mínimo diagrama de clases y de
      casos de uso.
- [ ] **5. Revisión de POO** — clases, encapsulación, herencia, relaciones de dominio.
- [ ] **6. Documentar solo los patrones de diseño realmente implementados.**
- [ ] **7. Documentación de pruebas y resultados, con evidencia verificable.**
- [ ] **8. Capturas/evidencias de las principales funcionalidades.**
- [x] **9. Cierre del proyecto** — logros, dificultades, soluciones,
      mantenimiento, recomendaciones y conclusiones.
      → `Sprints/Cierre de proyecto.md` ya tenía las 6 secciones; se
      actualizó el contenido al sistema actual: desaparece *"entorno sin
      backend"*, las entidades viejas (*Geolocalizador, Gestor de
      Actividad…*) se sustituyen por las clases reales, y se añaden a los
      logros la integración con Supabase (auth, avatares, `actividades`,
      logs), el refactor POO, la seguridad verificada y los arneses.
      Añadidos a mantenimiento la retención de `logs` y el cuidado de las
      políticas RLS.
- [x] **10. Seguridad de Supabase** — políticas RLS y de Storage, más el manejo
      de los datos de geolocalización almacenados en `logs`.
      → `Documentación Supabase.md` (396 → 155 líneas): esquema real
      (tabla `actividades`, buckets `avatars`/`logs`; desaparecen las
      inventadas `runs`/`profiles`/`routes`), SQL de políticas y la sección
      de geolocalización (solo `heartbeat` lleva `pos`, a 5 decimales ≈ 1 m,
      cada 60 s, sin retención). `README.md` corregido.
      **Aplicado en el SQL Editor y verificado** (2026-10-06):
      - `actividades`: RLS activo, 1 política (`actividades_insert`); la
        consulta con la clave pública devuelve `[]` (antes devolvía filas).
      - `storage.objects`: RLS activo, 3 políticas (`avatars_insert`,
        `logs_insert`, `rw_avatars_select`). Retiradas las legacy
        `rw_logs_select`/`rw_logs_update`/`rw_avatars_update` (dejaban los
        logs con GPS legibles con la clave pública) y los `INSERT`
        duplicados (`rw_*_insert`, `Permitir subida de avatares 1oj01fe_0`).
      - Sondeo externo sin sesión: log `404`, listado de `logs` `[]`,
        avatar público `200`, `actividades` `[]`.
- [x] **11. Enlaces rotos + limpiar `index.html`** — verificado: Wil lo limpió
      en `9987bbc` (243 → 211 líneas); hoy 0 IDs duplicados, 0 TODOs, 2
      `<script>`, todos los recursos referenciados existen, sin enlaces rotos
      en los `.md`.

## Estado conocido

- **5 (POO)**: hecho y commiteado en `6a2a377`. 17 clases, jerarquía real.
- **1 (README)**: `README.md` y `AGENTS.md` ya actualizados en `6a2a377`
  (Supabase y estructura). Falta revisar el resto de la documentación.
- **6 (patrones)**: los patrones ya existen en el código, falta escribirlos.
- **7 (pruebas)**: los arneses existen pero son temporales e ignorados por git;
  no hay evidencia versionada.
