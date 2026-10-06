# Casos de uso — RunWell (sistema final)

Diagrama de casos de uso del sistema **tal como está implementado hoy**. Lo
pendiente (filtrado de rutas, dashboard de estadísticas) queda fuera del
diagrama y se lista aparte al final, para no dibujar funcionalidades que no
existen.

## Diagrama

```mermaid
flowchart LR
    corredor(("Corredor"))
    supabase[("Supabase<br/>(BaaS externo)")]

    subgraph consulta["Consulta (también sin sesión)"]
        uc_rutas(["Ver rutas predefinidas"])
        uc_eventos(["Ver eventos programados"])
        uc_mapa(["Ver ruta en el mapa"])
        uc_tema(["Cambiar tema claro/oscuro"])
        uc_chat(["Consultar al asistente"])
    end

    subgraph cuenta["Cuenta"]
        uc_registro(["Registrarse"])
        uc_login(["Iniciar sesión"])
        uc_avatar(["Subir avatar"])
        uc_logout(["Cerrar sesión"])
    end

    subgraph actividad["Actividad de running"]
        uc_geo(["Centrarse en mi ubicación (📍)"])
        uc_prox(["Recibir aviso de proximidad ≤ 50 m"])
        uc_iniciar(["Iniciar actividad: trote o carrera"])
        uc_detener(["Detener actividad y guardar sesión"])
    end

    subgraph historial["Historial"]
        uc_ver(["Ver historial de sesiones"])
        uc_limpiar(["Limpiar historial"])
    end

    corredor --> uc_rutas & uc_eventos & uc_mapa & uc_tema & uc_chat
    corredor --> uc_registro & uc_login & uc_avatar & uc_logout
    corredor --> uc_geo & uc_prox & uc_iniciar & uc_detener
    corredor --> uc_ver & uc_limpiar

    uc_prox -. "ofrece iniciar" .-> uc_iniciar
    uc_registro -. "da acceso a" .-> uc_login

    uc_login --> supabase
    uc_avatar --> supabase
    uc_detener -. "copia en la tabla<br/>actividades" .-> supabase
    uc_logs(["Envío automático de logs<br/>y crashes (cada 60 s)"]) --> supabase
```

## Actores

| Actor | Rol |
|---|---|
| **Corredor** | Usuario de la app: consulta rutas, corre con cronómetro, gestiona su historial y su cuenta. Puede usarla sin sesión (consulta y actividad local) o con sesión (avatar y copia en la nube). |
| **Supabase** | Sistema externo (BaaS): auth, tabla `actividades`, buckets `avatars` y `logs`. No hay servidor propio: es el único componente fuera del frontend. |

## Casos de uso y su estado

| Caso de uso | Notas de implementación |
|---|---|
| Ver rutas predefinidas | `js/datos.js` (mock data de Maracaibo) dibujado por `MapController` |
| Ver eventos programados | Sección Eventos, `EventosController` |
| Ver ruta en el mapa | Abre el mapa y centra la ruta; reabre su popup |
| Centrarse en mi ubicación (📍) | `GeolocationService`; muestra toast y popup con coordenadas y precisión |
| Recibir aviso de proximidad | ≤ 50 m a una ruta, colisión punto-segmento, cooldown de 20 s |
| Iniciar actividad (trote/carrera) | Desde el popup de la ruta o desde el aviso de proximidad; `TipoActividad` → `Trote`/`Carrera` |
| Detener actividad y guardar sesión | Guarda en `runwell-historial` y copia a la tabla `actividades` |
| Ver / limpiar historial | `HistoryRepository`, con migración de claves antiguas |
| Registrarse / iniciar sesión / cerrar sesión | `AuthService`, modal en `index.html` |
| Subir avatar | Bucket `avatars` (política de `INSERT` anónimo antes del `signUp`) |
| Cambiar tema | `Tema`, persistido en `runwell-tema` |
| Consultar al asistente | `Chatbot` (chips + respuestas sobre rutas y actividad) |
| Envío automático de logs | `Logger`: eventos, crashes y heartbeat cada 60 s al bucket `logs` |

## Pendiente (fuera del diagrama a propósito)

- Filtrado/selección de rutas por zona, distancia o dificultad.
- Dashboard de estadísticas e historial de progreso (agregados por semana/mes).

Son los casos de uso que el alcance actual no cubre; aparecer como
"planeados" en la documentación, pero **no** deben dibujarse como si
existieran.
