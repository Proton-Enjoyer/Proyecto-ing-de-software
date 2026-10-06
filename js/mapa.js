// js/mapa.js — Apertura/cierre, dibujo de rutas, marcadores y popups (Leaflet).

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
import { ServicioBase } from './base.js';

export class MapController extends ServicioBase {
    #map = null;              // referencia local al mapa (mismo objeto que estado.mapa)
    #markersRuta = {};        // marcadores creados por ruta (inicio y fin)

    constructor(store = estado) {
        super(store);
    }

    /**
     * Reabre el popup de una ruta tras redibujar el mapa.
     *
     * Hace falta porque iniciar o detener una actividad llama a `abrirMapa()`,
     * que borra y recrea los marcadores: el popup que el usuario tenía abierto
     * pertenecía al marcador eliminado y se cerraba. Con esto el botón
     * "Detener" queda a la vista sin que haya que volver a tocar un marcador.
     */
    abrirPopupRuta(rutaIdx) {
        const marcadores = this.#markersRuta[rutaIdx];
        const marcador = marcadores && marcadores[0];
        if (!marcador) return;
        // Se espera al mismo vuelo que usa #flyToStartIfNeeded para que el
        // popup no aparezca mientras el mapa todavía se está desplazando.
        setTimeout(() => {
            if (this.#map && this.#map.hasLayer(marcador)) marcador.openPopup();
        }, 200);
    }

    /** Crea el mapa de Leaflet la primera vez que se abre. */
    #initMapIfNeeded() {
        if (this.estado.mapa) {
            this.#map = this.estado.mapa;
            return;
        }
        // Centro por defecto en LUZ
        this.#map = L.map('map').setView([10.686, -71.645], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.#map);
        this.estado.mapa = this.#map;
    }

    /** Quita las capas de la apertura anterior y su estado asociado. */
    #clearPreviousLayers() {
        if (!this.#map) return;
        this.#map.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                this.#map.removeLayer(layer);
            }
        });
        // reset estado relacionado con capas/mapa
        this.estado.userMarker = null;
        this.estado.trazaLinea = null;
        this.estado.popupsRuta = {};
        this.#markersRuta = {};
    }

    /** Recalcula el tamaño del mapa y, si aplica, vuela al inicio de la ruta. */
    #flyToStartIfNeeded(rutaIndex) {
        if (!this.#map) return;
        setTimeout(() => {
            this.#map.invalidateSize();
            if (rutaIndex !== null && misRutas[rutaIndex]) {
                const coordInicio = misRutas[rutaIndex].coords[0];
                this.#map.flyTo(coordInicio, 16, { duration: 1.5 });
            }
        }, 200);
    }

    /**
     * Dibuja una ruta concreta o todas: polilínea, marcadores de inicio/fin y
     * el popup con los botones Trote / Carrera / Detener.
     */
    #drawRoutes(rutaIndex = null) {
        if (!this.#map) return;
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
            }).addTo(this.#map);

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
            const marcadorInicio = L.marker(ruta.coords[0], { icon: markerStyle })
                .addTo(this.#map)
                .bindPopup(popupContent);
            const marcadorFin = L.marker(ruta.coords[ruta.coords.length - 1], { icon: markerStyle })
                .addTo(this.#map)
                .bindPopup(popupContent);

            // Se guardan para poder reabrir el popup tras un redibujado
            this.#markersRuta[currentIdx] = [marcadorInicio, marcadorFin];
        });

        if (allCoords.length > 0) {
            this.#map.fitBounds(allCoords, { padding: [50, 50] });
        }
        this.#map.invalidateSize();
    }

    /** Abre el mapa con una ruta concreta (o con todas). */
    abrirMapa(rutaIndex = null) {
        this.registrar('abrir-mapa', { ruta: rutaIndex });
        // Mostrar la sección 'mapa' (oculta otras secciones)
        mostrarSeccion('mapa');

        this.#initMapIfNeeded();
        this.#clearPreviousLayers();
        this.#flyToStartIfNeeded(rutaIndex);
        this.#drawRoutes(rutaIndex);

        // Redibujar la traza si había una actividad en curso
        refrescarTraza();

        // Localizar al usuario sin centrar (el mapa se ajusta a las rutas)
        obtenerUbicacion(false);
    }

    /** Cierra el mapa y vuelve al inicio. */
    cerrarMapa() {
        mostrarSeccion('inicio');
    }
}

// --- Instancia singleton y API pública delegando en ella ---

// Singleton: un solo mapa para toda la aplicación.
export const mapController = new MapController();

export function abrirMapa(rutaIndex = null) {
    return mapController.abrirMapa(rutaIndex);
}

export function abrirPopupRuta(rutaIdx) {
    return mapController.abrirPopupRuta(rutaIdx);
}

export function cerrarMapa() {
    return mapController.cerrarMapa();
}