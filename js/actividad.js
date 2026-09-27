// Actividad (trote o carrera): cronómetro, panel en vivo, traza y popups.

import { estado } from './estado.js';
import { misRutas } from './datos.js';
import { formatoTiempo, ritmoMinPorKm, distanciaMetros } from './util.js';
import { hudPanel, hudTime, hudDist, hudRitmo } from './dom.js';
import { guardarActividad } from './historial.js';

export const TIPOS = { trote: '🏃 Trote', carrera: '⚡ Carrera' };

export function iniciarActividad(rutaIdx, tipo = 'trote') {
    if (estado.actividad.activa) detenerActividad();

    // Cada actividad empieza con traza y distancia en cero
    estado.trazaCoords = [];
    estado.distanciaTotal = 0;
    refrescarTraza();

    const actividad = estado.actividad;
    actividad.activa = true;
    actividad.rutaIdx = rutaIdx;
    actividad.tipo = tipo;
    actividad.seconds = 0;
    actividad.interval = setInterval(tickActividad, 1000);

    hudPanel.classList.remove('hud-hidden');
    actualizarPanelActividad();

    refrescarPopup(rutaIdx);
    console.info(`Actividad iniciada → ${TIPOS[tipo]} en ${misRutas[rutaIdx].nombre}`);
}

export function detenerActividad() {
    const actividad = estado.actividad;
    if (!actividad.activa) return;
    const idx = actividad.rutaIdx;
    clearInterval(actividad.interval);
    actividad.interval = null;
    actividad.activa = false;

    // Guardar la actividad finalizada en el historial (mismo formato
    // y misma clave que lee la sección Historial)
    guardarActividad({
        tipo: actividad.tipo === 'carrera' ? 'Carrera' : 'Trote',
        ruta: misRutas[idx] ? misRutas[idx].nombre : 'Ruta Libre',
        tiempo: formatoTiempo(actividad.seconds),
        distancia: (estado.distanciaTotal / 1000).toFixed(2),
        ritmo: ritmoMinPorKm(actividad.seconds, estado.distanciaTotal)
    });

    // Última actualización del panel y ocultarlo
    actualizarPanelActividad();
    hudPanel.classList.add('hud-hidden');

    refrescarPopup(idx);
    console.info(`Actividad detenida -> duración ${formatoTiempo(actividad.seconds)}`);
    actividad.tipo = null;
}

// Llama manejarPosicion() con cada lectura del GPS mientras hay actividad:
// acumula traza y distancia (antes vivía dentro de geolocalizacion.js)
export function registrarPunto(pos) {
    if (!estado.actividad.activa) return;

    const punto = [pos[0], pos[1], Date.now()];
    if (estado.trazaCoords.length > 0) {
        estado.distanciaTotal += distanciaMetros(estado.trazaCoords[estado.trazaCoords.length - 1], punto);
    }
    estado.trazaCoords.push(punto);
    refrescarTraza();
    actualizarPanelActividad();
}

function tickActividad() {
    estado.actividad.seconds++;
    const el = document.getElementById(`time-${estado.actividad.rutaIdx}`);
    if (el) el.innerText = formatoTiempo(estado.actividad.seconds);
    actualizarPanelActividad();
}

// Mantiene el panel flotante (tiempo, km y ritmo) al día
export function actualizarPanelActividad() {
    hudTime.innerText = formatoTiempo(estado.actividad.seconds);
    hudDist.innerText = (estado.distanciaTotal / 1000).toFixed(2);
    hudRitmo.innerText = ritmoMinPorKm(estado.actividad.seconds, estado.distanciaTotal);
}

// Sincroniza el popup de una ruta con el estado real de la actividad.
export function refrescarPopup(rutaIdx) {
    const root = estado.popupsRuta[rutaIdx];
    if (!root) return;
    const grupoInicio = root.querySelector(`#inicio-${rutaIdx}`);
    const box = root.querySelector(`#timer-box-${rutaIdx}`);
    const lblTipo = root.querySelector(`#tipo-${rutaIdx}`);
    const lblTime = root.querySelector(`#time-${rutaIdx}`);
    if (!grupoInicio || !box) return;

    const enEstaRuta = estado.actividad.activa && estado.actividad.rutaIdx === rutaIdx;
    grupoInicio.style.display = enEstaRuta ? 'none' : 'block';
    box.style.display = enEstaRuta ? 'block' : 'none';

    if (enEstaRuta) {
        if (lblTipo) lblTipo.innerText = TIPOS[estado.actividad.tipo] || '';
        if (lblTime) lblTime.innerText = formatoTiempo(estado.actividad.seconds);
    }
}

// Línea por donde fuiste corriendo (se redibuja con cada posición nueva)
export function refrescarTraza() {
    const mapa = estado.mapa;
    if (!mapa) return;
    if (estado.trazaLinea) {
        mapa.removeLayer(estado.trazaLinea);
        estado.trazaLinea = null;
    }
    if (estado.trazaCoords.length > 1) {
        estado.trazaLinea = L.polyline(estado.trazaCoords, {
            color: '#4285F4',
            weight: 4,
            opacity: 0.85,
            dashArray: '1 12',
            lineCap: 'round'
        }).addTo(mapa);
    }
}
