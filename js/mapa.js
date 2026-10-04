// Mapa: apertura/cierre, dibujo de rutas, marcadores y popups (Leaflet).

import { estado } from './estado.js';
import { misRutas } from './datos.js';
import {
    iniciarActividad,
    detenerActividad,
    refrescarPopup,
    refrescarTraza
} from './actividad.js';
import { obtenerUbicacion } from './geolocalizacion.js';
import { mostrarSeccion } from './navegacion.js';
import { log } from './logs.js';

class MapController {
    constructor(store = estado) {
        this.estado = store;
        this._map = null; // referencia local al mapa (igual que estado.mapa)
    }

    _initMapIfNeeded() {
        if (this.estado.mapa) {
            this._map = this.estado.mapa;
            return;
        }
        // Centro por defecto en LUZ
        this._map = L.map('map').setView([10.686, -71.645], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this._map);
        this.estado.mapa = this._map;
    }

    _clearPreviousLayers() {
        if (!this._map) return;
        this._map.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                this._map.removeLayer(layer);
            }
        });
        // reset estado relacionado con capas/mapa
        this.estado.userMarker = null;
        this.estado.trazaLinea = null;
        this.estado.popupsRuta = {};
    }

    _flyToStartIfNeeded(rutaIndex) {
        if (!this._map) return;
        setTimeout(() => {
            this._map.invalidateSize();
            if (rutaIndex !== null && misRutas[rutaIndex]) {
                const coordInicio = misRutas[rutaIndex].coords[0];
                this._map.flyTo(coordInicio, 16, { duration: 1.5 });
            }
        }, 200);
    }

    _drawRoutes(rutaIndex = null) {
        if (!this._map) return;
        const allCoords = [];
        const rutasAProcesar = rutaIndex !== null ? [misRutas[rutaIndex]] : misRutas;

        rutasAProcesar.forEach((ruta, idx) => {
            // Determinar índice real en misRutas
            const currentIdx = rutaIndex !== null ? rutaIndex : idx;

            // Polilínea de la ruta
            L.polyline(ruta.coords, {
                color: '#FFFE42',
                weight: 6,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(this._map);

            allCoords.push(...ruta.coords);

            const estaActiva = this.estado.actividad && this.estado.actividad.activa && this.estado.actividad.rutaIdx === currentIdx;

            const markerStyle = L.divIcon({
                className: estaActiva ? 'custom-marker activo' : 'custom-marker',
                iconSize: [15, 15],
                iconAnchor: [7, 7]
            });

            // Contenido del popup: elegir tipo o ver el cronómetro
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
                <b>${ruta.nombre}</b><br>
                <div id="inicio-${currentIdx}">
                    <button class="popup-btn" data-tipo="trote">🏃 Trote</button>
                    <button class="popup-btn" data-tipo="carrera" style="margin-top:6px;">⚡ Carrera</button>
                </div>
                <div id="timer-box-${currentIdx}" style="display:none; margin-top:10px; text-align:center;">
                    <span id="tipo-${currentIdx}" class="popup-tipo"></span><br>
                    <span id="time-${currentIdx}" style="font-size: 1.5rem; font-weight: bold;">00:00</span><br>
                    <button id="stop-${currentIdx}" class="popup-btn" style="background-color: #ff4d4d; color: white;">Detener</button>
                </div>
            `;

            // Botones Trote / Carrera → inician la actividad
            const inicioGroup = popupContent.querySelector(`#inicio-${currentIdx}`);
            if (inicioGroup) {
                inicioGroup.querySelectorAll('button').forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        iniciarActividad(currentIdx, btn.dataset.tipo);
                    });
                });
            }

            // Botón Detener (proteger con condicional)
            const stopBtn = popupContent.querySelector(`#stop-${currentIdx}`);
            if (stopBtn) {
                stopBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    detenerActividad();
                });
            }

            // Registrar el popup para poder actualizarlo aunque esté cerrado
            this.estado.popupsRuta[currentIdx] = popupContent;

            // Reflejar el estado actual (por si esta ruta ya está activa)
            refrescarPopup(currentIdx);

            // Marcadores de inicio y fin estilizados (comparten el mismo popup)
            L.marker(ruta.coords[0], { icon: markerStyle }).addTo(this._map)
                .bindPopup(popupContent);
            L.marker(ruta.coords[ruta.coords.length - 1], { icon: markerStyle }).addTo(this._map)
                .bindPopup(popupContent);
        });

        if (allCoords.length > 0) {
            this._map.fitBounds(allCoords, { padding: [50, 50] });
        }
        this._map.invalidateSize();
    }

    abrirMapa(rutaIndex = null) {
        log('abrir-mapa', { ruta: rutaIndex });
        // Mostrar la sección 'mapa' (oculta otras secciones)
        mostrarSeccion('mapa');

        // Inicializar mapa si hace falta
        this._initMapIfNeeded();

        // Limpiar capas previas y estado relacionado
        this._clearPreviousLayers();

        // Forzar recálculo y posiblemente volar al inicio
        this._flyToStartIfNeeded(rutaIndex);

        // Dibujar rutas (una o todas)
        this._drawRoutes(rutaIndex);

        // Redibujar la traza si había una actividad en curso
        refrescarTraza();

        // Localizar al usuario sin centrar (el mapa se ajusta a las rutas)
        obtenerUbicacion(false);
    }

    cerrarMapa() {
        mostrarSeccion('inicio');
    }
}

// Exportar singleton mantenido por el módulo
export const mapController = new MapController();

// Compatibilidad con la API antigua
export function abrirMapa(rutaIndex = null) {
    return mapController.abrirMapa(rutaIndex);
}

export function cerrarMapa() {
    return mapController.cerrarMapa();
}

export { MapController };
