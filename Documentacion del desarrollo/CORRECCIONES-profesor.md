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

- [x] **1. README y documentación al día con `main`** — auditoría de los 7
      `.md` + `Introduccion.txt` + el árbol de estructura. Corregido:
      `AGENTS.md` presentaba *Registro/login* como **pendiente** cuando ya
      existe (`js/auth.js`), citaba un archivo que no existía en `docs/` y
      mencionaba GitHub Pages como
      despliegue (es Vercel); `README.md` no tenía `css/chatbot.css` en el
      árbol ni el registro/login entre las funcionalidades, y tenía una
      errata de puntuación; `Introduccion.txt` dejaba el registro/login
      como futuro y le faltaba el punto tras "sin frameworks". Añadida una
      sección "Documentación" al README como índice. El diagrama de casos
      de uso (41 nodos) queda como imagen `docs/diagrama-casos-uso.png`
      (punto 4), exportada desde código Mermaid. Verificado que ningún `.md`
      del repo queda con "sin backend", entidades viejas
      (*Geolocalizador*, *Usuario*, *Coach*…), tablas inventadas
      (`runs`/`profiles`/`routes`) ni enlaces rotos. El `RunWELL.pdf` del
      usuario ya describe bien Supabase/Vercel; solo le falta mencionar
      auth (asunto suyo, no del repo).
- [ ] **2. Planificación completa** — actividades, hitos, responsabilidades,
      cronograma/Gantt y análisis de riesgos.
- [ ] **3. Especificación final de requisitos** — necesidades, requisitos
      funcionales, no funcionales, actores y requisitos de datos.
- [x] **4. UML actualizado del sistema final** — mínimo diagrama de clases y de
      casos de uso. Los dos diagramas se generaron desde código Mermaid (fuente
      verificada con render) y quedaron como imagen en `Sprints/Diagrama de
      clases Final.png` (18 clases reales, 15 herencias, el `bus` singleton) y
      `Sprints/Diagrama de Casos de Uso Final.png`. Se descartó la fuente en
      `.md` a pedido del usuario: los UML viven como imágenes. Se eliminó el
      diagrama de clases anterior (`Diagrama Clases de Diseño, Runwell.png`),
      subido antes del refactor POO: dibujaba la arquitectura vieja y contradecía
      el código.
- [x] **5. Revisión de POO** — clases, encapsulación, herencia, relaciones de
      dominio. Hecho en `6a2a377`: 18 clases reales, 15 herencias, estado
      compartido inyectado; verificado por los 58 checks de `__poo.html`.
- [x] **6. Documentar solo los patrones de diseño realmente implementados.**
      → `Sprints/Patrones de diseño.md`: Observer, Repository, singleton por
      módulo, herencia/polimorfismo con encapsulación e inyección de
      dependencias — cada uno con su archivo, su porqué y su verificación en
      el código. Sección aparte con los que **no** están implementados
      (Template Method, Strategy, Factory, Facade, MVC) para que nadie los
      asuma. Puntero en `README.md`. Verificado que ningún `.docx` ni
      `RunWELL.pdf` menciona patrones: no hay nada que corregir en los
      documentos del usuario. De paso se corrigió el "9 servicios heredan de
      `ServicioBase`" → **10**, que repetían `README.md`, `AGENTS.md` y
      `Cierre de proyecto.md`.
- [x] **7. Documentación de pruebas y resultados, con evidencia verificable.**
      → `Sprints/Pruebas.md`: qué se probó (tabla arnés → alcance → checks),
      cómo reproducirlo, entorno de la corrida y — honestamente — lo que
      **no** cubre (solo Firefox desktop, GPS mockeado, sin pruebas de carga
      ni de accesibilidad). Evidencia cruda check por check en
      `Sprints/Pruebas/evidencia/` (salida sin editar, una corrida por
      archivo + `resumen.json`). Para que la evidencia sea reproducible, los
      arneses `__*.html` dejan de estar ignorados por git y se versionan
      junto a `pruebas/servidor.py` y `pruebas/correr.py`: dos comandos
      repiten la pasada. Nueva sección "Pruebas" en `README.md`; `AGENTS.md`
      al día (y sin la mención a *Template Method*, que el punto 6 excluye).
      **Pasada 2026-10-06: 156/156 checks (geo 23, popup 30, e2e 37, POO 58,
      logs 8), 0 fallos, 0 errores de consola.**
- [x] **8. Capturas/evidencias de las principales funcionalidades.**
      → Carpeta nueva `Sprints/Evidencias/` con **7 capturas PNG** (portada,
      mapa con rutas, eventos, geolocalización, historial, modo oscuro,
      chatbot) y un `README.md` índice: nombre de archivo, qué muestra cada
      una, cómo tomar capturas nuevas y estado. Nombres normalizados
      (kebab-case, sin typos). Quedaron fuera el panel HUD de la actividad
      en vivo y el modal de login — consta en la sección "No incluidas"
      del índice por si se añaden después.
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

- **Hechos**: 1 (`1c33ed2`), 4 (PNG nuevos, pendiente de commit), 5
  (`6a2a377`), 6 (`97d7d06`), 7 (`870f1f8`), 8 (`55f8438`), 9 (`15f1ac2`),
  10 (`fdd6785`), 11 (verificado, sin cambios que commitear).
- **Pendientes**: 2 (planificación/Gantt/riesgos) y 3 (especificación de
  requisitos) — los resuelve el usuario en sus `.docx`, con los avisos ya
  señalados: Metodologías desactualizado (sigue con `Usuario`/`Coach`/
  `PlanEntrenamiento`), RF01/RF05 vs. auth real y matriz de riesgos titulada
  "Sistema de Gestión de Rutinas Wellness con POO e IA" en vez de RunWell.
- **Último commit del ciclo**: borrar `CORRECCIONES-profesor.md`.
- El `docs/` original quedó vacío (los UML ahora son PNG en `Sprints/`).
