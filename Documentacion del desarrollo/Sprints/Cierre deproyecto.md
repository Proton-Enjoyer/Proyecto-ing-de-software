# Cierre del Proyecto — RunWell



1. Logros
---------
- Implementación completa del frontend modular (ES Modules) con carga segura vía HTTP.
- Mapa interactivo con Leaflet y rutas predefinidas (mock data en `js/datos.js`) mostrando rutas en Maracaibo (LUZ y Paseo Sur).
- Geolocalización con marcador de usuario, seguimiento continuo (`watchPosition`) y manejo de permisos/errores según la política: automático silencioso (consola) y acciones solicitadas por el usuario con mensajes en pantalla (`#alerta-gps`).
- Detección de proximidad a rutas (colisión punto-segmento ≤ 50 m) con prompt para iniciar actividad y cooldown de 20 s.
- Actividad tipo trote/carrera con cronómetro, traza dinámica de recorrido (línea punteada azul), HUD en vivo con tiempo, distancia y ritmo.
- Guardado y migración de historial en `localStorage` (clave `runwell-historial`) con compatibilidad hacia formatos antiguos.
- Sistema de tema (modo oscuro) persistente en `localStorage` (`runwell-tema`).
- Sistema de logs que intenta subir eventos a Supabase Storage (bucket `logs`) periódicamente y ante eventos relevantes (crash, cierre de pestaña), con fallos de subida silenciosos para no degradar UX.
- Estructura de código organizada y grafo de dependencias sin ciclos, facilitando mantenimiento y extensibilidad.

2. Dificultades encontradas
---------------------------
- Limitaciones del entorno sin backend: persistencia centralizada, autenticación y sincronización entre dispositivos no disponibles.
- Problemas con permisos de geolocalización en navegadores (diálogo de permiso que bloquea o expira). En particular, `timeout` en peticiones automáticas causaba alertas erróneas en Firefox.
- Precisión de la ubicación variable según hardware/entorno (GPS vs WiFi/IP), que complica la detección de proximidad y el cálculo de distancia precisa.
- Manejo de estados compartidos entre módulos para evitar efectos colaterales al importar (la regla de no tocar `estado` en carga obligó a diseño cuidadoso).
- Repetición intencional de listeners (p. ej. popups compartidos para inicio/fin) que puede llevar a eventos duplicados si no se documenta claramente.
- Pruebas limitadas en distintos dispositivos y navegadores (iOS/Safari, Android/Chrome, Firefox Desktop) — posibles bugs no detectados.
- Subida de logs dependiente de conexión y de un servicio externo (Supabase); las fallas se silencian, lo que dificulta la observabilidad remota.

3. Soluciones y decisiones clave
--------------------------------
- Política de geolocalización: peticiones automáticas sin `timeout` y con silencio en consola; interacciones a petición del usuario muestran avisos en pantalla. Evita alertas forzadas cuando el diálogo de permisos está abierto.
- Uso de `flyTo` con `{ duration: 1.5 }` para mantener feedback visual consistente del mapa.
- Cálculo de distancia con fórmula de Haversine encapsulada en `util.js` y uso de un `refrescarTraza()` que solo crece cuando hay actividad registrada.
- Mecanismo de migración `migrarDatosAntiguos()` para unir diferentes formatos de historial y evitar pérdida de datos entre entregas/PRs.
- Diseño modular y orden de importación que evita efectos secundarios en el arranque — solo ejecutar funciones que modifican `estado` en tiempo de ejecución.
- Implementación de cooldown y chequeos geométricos robustos (colisión punto-segmento en metros) para evitar prompts molestos.
- Logs subidos en background cada 60 s y en eventos críticos, con fallback de silenciamiento para UX; se documentó cómo probar localmente (`__probe_logs.html`).

4. Mantenimiento necesario
--------------------------
Recomendaciones de tareas de mantenimiento, su propósito y prioridad:

- Alta prioridad
  - Añadir cobertura de pruebas manuales y automatizadas en navegadores clave (Chrome, Firefox, Safari) y en dispositivos móviles (iOS, Android) para geolocalización y prompts.
  - Revisar y documentar los lugares con listeners duplicados (popups) y extraer una función utilitaria si se desea cambiar el comportamiento.
  - Monitorizar la cola de logs fallidos (si se implementa persistencia temporal) e introducir reintentos con backoff para las subidas a Supabase.

- Media prioridad
  - Limpieza y estandarización del formato de `runwell-historial` y añadir validación al leer del `localStorage`.
  - Añadir mensajes y UX claros cuando la precisión de la ubicación sea baja (p. ej. advertencia de "ubicación aproximada").
  - Incluir control granular de permisos y una guía en la app sobre cómo activar ubicación en cada navegador/plataforma.

- Baja prioridad
  - Refactorizar listeners compartidos y documentar convenciones de suscripción/detach para evitar fugas de memoria o duplicidad de eventos.
  - Preparar un plan para migrar logs a un sistema más observable (p. ej. integrar métricas/errores con Sentry o similar si se desea más diagnóstico).

5. Recomendaciones para futuras mejoras
--------------------------------------
- Backend ligero y autenticación: usar BaaS (Supabase/Auth) para guardar sesiones, historial centralizado, y permitir usuarios con perfiles y sincronización entre dispositivos.
- Export/Import de historial: permitir CSV/JSON para análisis offline o migración.
- Filtros y selección de rutas: UI para buscar/filtrar rutas por zona, distancia, dificultad y eventos asociados.
- Estadísticas y dashboard: agregados por semana/mes (distancia total, tiempo total, ritmo medio) y gráficos.
- Mejora de precisión: opción para calibrar la fuente de ubicación y algoritmos de filtrado de ruido (p. ej. Kalman filter) para suavizar la traza y obtener mediciones de distancia más fiables.
- Mejora de accesibilidad: asegurar que notificaciones y prompts sean accesibles (lector de pantalla) y que colores/contrast cumplen WCAG.
- Internacionalización: preparar strings y recursos para otros idiomas.

6. Conclusiones
---------------
RunWell cumplió los objetivos principales pedagógicos y funcionales: aplicar conceptos de geolocalización en web, manipulación de mapas con Leaflet, trabajo modular con ES Modules, y persistencia local. El proyecto muestra un equilibrio entre UX (política de permisos, feedback en pantalla) y robustez técnica (migración de datos, modularidad).

Las principales limitaciones son el entorno sin backend (sin sincronización ni autenticación) y la variabilidad intrínseca de la geolocalización en navegadores y dispositivos. Para convertir RunWell en un producto, las prioridades son: integrar backend para persistencia y cuentas, ampliar pruebas en dispositivos reales y mejorar la observabilidad (logs/errores remitidos y visibles).

Archivos relacionados
--------------------
- js/estado.js
- js/geolocalizacion.js
- js/actividad.js
- js/historial.js
- js/logs.js
- README.md

---

Autor: Equipo de desarrollo — RunWell
