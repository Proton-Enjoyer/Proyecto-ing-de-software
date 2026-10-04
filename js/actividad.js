// Actividad (trote o carrera): cronómetro, panel en vivo, traza y popups.

import { abrirMapa } from './mapa.js';
import { estado } from './estado.js';
import { misRutas } from './datos.js';
import { formatoTiempo, ritmoMinPorKm, distanciaMetros } from './util.js';
import { hudPanel, hudTime, hudDist, hudRitmo } from './dom.js';
import { guardarActividad } from './historial.js';
import { supabase } from '../supabase.js';
import { log } from './logs.js';

export const TIPOS = { trote: '🏃 Trote', carrera: '⚡ Carrera' };

class Actividad {
    constructor(store = estado) {
        this.estado = store;
    }

    iniciarActividad(rutaIdx, tipo = 'trote') {
        if (this.estado.actividad.activa) {
            this.detenerActividad();
        }

        // Cada actividad empieza con traza y distancia en cero
        this.estado.trazaCoords = [];
        this.estado.distanciaTotal = 0;
        this.refrescarTraza();

        const actividad = this.estado.actividad;
        actividad.activa = true;
        actividad.rutaIdx = rutaIdx;
        actividad.tipo = tipo;
        actividad.seconds = 0;
        actividad.interval = setInterval(() => this.tickActividad(), 1000);

        log('iniciar-actividad', {
            actividad: tipo,
            ruta: misRutas[rutaIdx] ? misRutas[rutaIdx].nombre : null
        });

        hudPanel.classList.remove('hud-hidden');
        this.actualizarPanelActividad();

        this.refrescarPopup(rutaIdx);
        console.info(`Actividad iniciada → ${TIPOS[tipo]} en ${misRutas[rutaIdx].nombre}`);
        abrirMapa(rutaIdx);
    }

    detenerActividad() {
        const actividad = this.estado.actividad;
        if (!actividad.activa) return;

        const idx = actividad.rutaIdx;
        clearInterval(actividad.interval);
        actividad.interval = null;
        actividad.activa = false;

        log('fin-actividad', {
            actividad: actividad.tipo,
            tiempo: formatoTiempo(actividad.seconds),
            distancia_km: parseFloat((this.estado.distanciaTotal / 1000).toFixed(2))
        });

        // Guardar la actividad finalizada en el historial (mismo formato
        // y misma clave que lee la sección Historial)
        guardarActividad({
            tipo: actividad.tipo === 'carrera' ? 'Carrera' : 'Trote',
            ruta: misRutas[idx] ? misRutas[idx].nombre : 'Ruta Libre',
            tiempo: formatoTiempo(actividad.seconds),
            distancia: (this.estado.distanciaTotal / 1000).toFixed(2),
            ritmo: ritmoMinPorKm(actividad.seconds, this.estado.distanciaTotal)
        });

        // Guardado en la nube con Supabase
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('actividades')
                    .insert([
                        {
                            tipo: actividad.tipo === 'carrera' ? 'Carrera' : 'Trote',
                            tiempo: formatoTiempo(actividad.seconds),
                            distancia: parseFloat((this.estado.distanciaTotal / 1000).toFixed(2))
                        }
                    ]);

                if (error) {
                    console.error('Error al guardar en Supabase:', error.message);
                } else {
                    console.log('¡Sincronizado en Supabase con éxito!', data);
                }
            } catch (err) {
                console.error('Error de red:', err);
            }
        })();

        // Última actualización del panel y ocultarlo
        this.actualizarPanelActividad();
        hudPanel.classList.add('hud-hidden');

        this.refrescarPopup(idx);
        console.info(`Actividad detenida -> duración ${formatoTiempo(actividad.seconds)}`);
        actividad.tipo = null;
        abrirMapa();
    }

    // Llama manejarPosicion() con cada lectura del GPS mientras hay actividad:
    // acumula traza y distancia (antes vivía dentro de geolocalizacion.js)
    registrarPunto(pos) {
        if (!this.estado.actividad.activa) return;

        const punto = [pos[0], pos[1], Date.now()];
        if (this.estado.trazaCoords.length > 0) {
            this.estado.distanciaTotal += distanciaMetros(
                this.estado.trazaCoords[this.estado.trazaCoords.length - 1],
                punto
            );
        }
        this.estado.trazaCoords.push(punto);
        this.refrescarTraza();
        this.actualizarPanelActividad();
    }

    tickActividad() {
        this.estado.actividad.seconds++;
        const el = document.getElementById(`time-${this.estado.actividad.rutaIdx}`);
        if (el) el.innerText = formatoTiempo(this.estado.actividad.seconds);
        this.actualizarPanelActividad();
    }

    // Mantiene el panel flotante (tiempo, km y ritmo) al día
    actualizarPanelActividad() {
        hudTime.innerText = formatoTiempo(this.estado.actividad.seconds);
        hudDist.innerText = (this.estado.distanciaTotal / 1000).toFixed(2);
        hudRitmo.innerText = ritmoMinPorKm(this.estado.actividad.seconds, this.estado.distanciaTotal);
    }

    // Sincroniza el popup de una ruta con el estado real de la actividad.
    refrescarPopup(rutaIdx) {
        const root = this.estado.popupsRuta[rutaIdx];
        if (!root) return;
        const grupoInicio = root.querySelector(`#inicio-${rutaIdx}`);
        const box = root.querySelector(`#timer-box-${rutaIdx}`);
        const lblTipo = root.querySelector(`#tipo-${rutaIdx}`);
        const lblTime = root.querySelector(`#time-${rutaIdx}`);
        if (!grupoInicio || !box) return;

        const enEstaRuta = this.estado.actividad.activa && this.estado.actividad.rutaIdx === rutaIdx;
        grupoInicio.style.display = enEstaRuta ? 'none' : 'block';
        box.style.display = enEstaRuta ? 'block' : 'none';

        if (enEstaRuta) {
            if (lblTipo) lblTipo.innerText = TIPOS[this.estado.actividad.tipo] || '';
            if (lblTime) lblTime.innerText = formatoTiempo(this.estado.actividad.seconds);
        }
    }

    // Línea por donde fuiste corriendo (se redibuja con cada posición nueva)
    refrescarTraza() {
        const mapa = this.estado.mapa;
        if (!mapa) return;
        if (this.estado.trazaLinea) {
            mapa.removeLayer(this.estado.trazaLinea);
            this.estado.trazaLinea = null;
        }
        if (this.estado.trazaCoords.length > 1) {
            this.estado.trazaLinea = L.polyline(this.estado.trazaCoords, {
                color: '#4285F4',
                weight: 4,
                opacity: 0.85,
                dashArray: '1 12',
                lineCap: 'round'
            }).addTo(mapa);
        }
    }
}

export const actividad = new Actividad();

export function iniciarActividad(rutaIdx, tipo = 'trote') {
    return actividad.iniciarActividad(rutaIdx, tipo);
}

export function detenerActividad() {
    return actividad.detenerActividad();
}

export function registrarPunto(pos) {
    return actividad.registrarPunto(pos);
}

export function actualizarPanelActividad() {
    return actividad.actualizarPanelActividad();
}

export function refrescarPopup(rutaIdx) {
    return actividad.refrescarPopup(rutaIdx);
}

export function refrescarTraza() {
    return actividad.refrescarTraza();
}

export { Actividad };