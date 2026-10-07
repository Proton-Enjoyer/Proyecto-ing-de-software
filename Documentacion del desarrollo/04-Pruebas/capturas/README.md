# Evidencias — principales funcionalidades (punto 8)

Capturas de pantalla de RunWell, tomadas el **2026-10-06** sobre la app
servida por HTTP. PNG sin editar, ~1020×767.

## Capturas

| # | Archivo | Funcionalidad |
|---|---|---|
| 1 | [`01-inicio.png`](01-inicio.png) | Portada y navegación (hero, menú, switch de tema) |
| 2 | [`02-mapa-con-rutas.png`](02-mapa-con-rutas.png) | Mapa interactivo con las rutas de Maracaibo y sus marcadores |
| 3 | [`03-eventos-programados.png`](03-eventos-programados.png) | Sección de eventos: día/hora por ruta con "Ver Ruta en Mapa" |
| 4 | [`04-geolocalizacion.png`](04-geolocalizacion.png) | Geolocalización: marcador del usuario, 📍 y coordenadas/precisión |
| 5 | [`05-historial-de-sesiones.png`](05-historial-de-sesiones.png) | Historial de sesiones: tipo, fecha, tiempo, distancia, ritmo |
| 6 | [`06-modo-oscuro.png`](06-modo-oscuro.png) | Modo oscuro persistente |
| 7 | [`07-chatbot.png`](07-chatbot.png) | Asistente: ventana con chips y respuesta |

## No incluidas

Quedaron fuera de la lista original; si se añaden más adelante van con el
siguiente número en esta misma carpeta:

- Actividad en vivo con panel HUD (tiempo/distancia/ritmo y "Detener").
- Modal de registro / inicio de sesión.
- Aviso de proximidad (≤ 50 m) y alerta de permiso GPS denegado.

## Cómo tomar una captura nueva

```bash
python3 -m http.server 8000
# → http://localhost:8000  (los módulos ES no cargan en file://)
```

Ventana de ~1400×900, sin barras de desarrollador, PNG sin editar. Tema,
sesión e historial persisten en `localStorage`: para una captura "limpia",
usa una ventana de navegación privada.

## Estado

- [x] Capturas tomadas y colocadas en esta carpeta (7)
- [x] Índice con los nombres reales de los archivos
- [x] Commit del punto 8
