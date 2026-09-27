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

// Abrir mapa y dibujar rutas
export function abrirMapa(rutaIndex = null) {
    // Oculta las demás secciones y muestra el mapa (también hace scrollTo(0,0))
    mostrarSeccion('mapa');

    // Inicializar mapa solo la primera vez
    if (!estado.mapa) {
        // Centro en la Facultad Experimental de Ciencias, LUZ
        estado.mapa = L.map('map').setView([10.686, -71.645], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(estado.mapa);
    }

    const mapaActivo = estado.mapa;

    // Limpiar capas previas
    mapaActivo.eachLayer((layer) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            mapaActivo.removeLayer(layer);
        }
    });

    estado.userMarker = null;
    estado.trazaLinea = null;
    estado.popupsRuta = {};

    // Forzar recálculo del lienzo de Leaflet para evitar descuadres en móviles
    setTimeout(() => {
        mapaActivo.invalidateSize();
        if (rutaIndex !== null && misRutas[rutaIndex]) {
            const coordInicio = misRutas[rutaIndex].coords[0];
            mapaActivo.flyTo(coordInicio, 16, { duration: 1.5 });
        }
    }, 200);

    // Dibujar rutas y ajustar vista
    const allCoords = [];

    // Marcadores personalizados con CSS
    const markerStyle = L.divIcon({
        className: 'custom-marker',
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });

    const rutasAProcesar = rutaIndex !== null ? [misRutas[rutaIndex]] : misRutas;

    rutasAProcesar.forEach((ruta, idx) => {
        // Polilínea de la ruta
        L.polyline(ruta.coords, {
            color: '#FFFE42', // Color primario
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(mapaActivo);

        allCoords.push(...ruta.coords);

        const currentIdx = rutaIndex !== null ? rutaIndex : idx;

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
        popupContent.querySelectorAll(`#inicio-${currentIdx} button`).forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                iniciarActividad(currentIdx, btn.dataset.tipo);
            });
        });

        // Botón Detener
        popupContent.querySelector(`#stop-${currentIdx}`).addEventListener('click', (e) => {
            e.stopPropagation();
            detenerActividad();
        });

        // Registrar el popup: así podemos actualizarlo aunque esté cerrado
        estado.popupsRuta[currentIdx] = popupContent;

        // Reflejar el estado actual (por si esta ruta ya está activa)
        refrescarPopup(currentIdx);

        // Marcadores de inicio y fin estilizados (comparten el mismo popup)
        L.marker(ruta.coords[0], { icon: markerStyle }).addTo(mapaActivo)
            .bindPopup(popupContent);
        L.marker(ruta.coords[ruta.coords.length - 1], { icon: markerStyle }).addTo(mapaActivo)
            .bindPopup(popupContent);
    });

    if (allCoords.length > 0) {
        mapaActivo.fitBounds(allCoords, { padding: [50, 50] });
    }
    mapaActivo.invalidateSize();

    // Redibujar la traza si había una actividad en curso
    refrescarTraza();

    // Localizar al usuario sin centrar (el mapa se ajusta a las rutas)
    obtenerUbicacion(false);
}

// Cerrar el mapa y volver a la portada.
// NOTA: aquí antes se guardaba una sesión falsa ("Carrera - Ruta Perímetro
// LUZ") cada vez que se cerraba el mapa, aunque no hubiera actividad.
// Ahora solo se guarda en detenerActividad(), con datos reales.
export function cerrarMapa() {
    mostrarSeccion('inicio');
}
