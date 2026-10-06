// js/actividad.js — Gestión de la actividad en curso (trote o carrera):
// cronómetro, panel HUD, traza del recorrido, popups y persistencia.
//
// La clase Actividad orchestra; el comportamiento específico de cada tipo de
// sesión vive en las subclases de TipoActividad (Trote / Carrera), que resuelven
// cómo se presenta el tipo. Así el orquestador no tiene condicionales por tipo.

import { abrirMapa, abrirPopupRuta } from './mapa.js';
import { estado } from './estado.js';
import { misRutas } from './datos.js';
import { formatoTiempo, ritmoMinPorKm, distanciaMetros } from './util.js';
import { hudPanel, hudTime, hudDist, hudRitmo } from './dom.js';
import { guardarActividad } from './historial.js';
import { supabase } from '../supabase.js';
import { ServicioBase } from './base.js';

/**
 * Comportamiento común de los tipos de sesión. La clase base define el
 * contrato; cada subclase aporta su etiqueta visible y su nombre canónico
 * (el que se guarda en el historial y en la nube).
 */
export class TipoActividad {
    #clave;
    #etiqueta;
    #nombre;

    constructor(clave, etiqueta, nombre) {
        this.#clave = clave;
        this.#etiqueta = etiqueta;
        this.#nombre = nombre;
    }

    /** Identificador interno: 'trote' o 'carrera'. */
    get clave() { return this.#clave; }

    /** Texto visible con emoji (se muestra en el popup y en la lista). */
    get etiqueta() { return this.#etiqueta; }

    /** Nombre canónico que se persiste ('Trote' / 'Carrera'). */
    get nombre() { return this.#nombre; }
}

export class Trote extends TipoActividad {
    constructor() {
        super('trote', '🏃 Trote', 'Trote');
    }
}

export class Carrera extends TipoActividad {
    constructor() {
        super('carrera', '⚡ Carrera', 'Carrera');
    }
}

// Registro de tipos disponibles. Agregar un tipo nuevo = agregar una subclase
// y su entrada aquí; el resto del flujo no cambia.
const REGISTRO_TIPOS = new Map([
    ['trote', new Trote()],
    ['carrera', new Carrera()]
]);

/** Etiquetas visibles por clave (mapa de texto, como antes). */
export const TIPOS = Object.fromEntries(
    [...REGISTRO_TIPOS].map(([clave, tipo]) => [clave, tipo.etiqueta])
);

/** Resuelve el tipo de sesión a partir de su clave (con 'trote' por defecto). */
export function tipoDeActividad(clave = 'trote') {
    return REGISTRO_TIPOS.get(clave) || REGISTRO_TIPOS.get('trote');
}

export class Actividad extends ServicioBase {
    constructor(store = estado) {
        super(store);
    }

    // --- Ciclo de vida de la sesión ---

    /**
     * Arranca una sesión: pone el cronómetro a cero, abre el mapa en la ruta y
     * muestra el panel HUD.
     */
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

        this.registrar('iniciar-actividad', {
            actividad: tipo,
            ruta: misRutas[rutaIdx] ? misRutas[rutaIdx].nombre : null
        });

        hudPanel.classList.remove('hud-hidden');
        this.actualizarPanelActividad();

        this.refrescarPopup(rutaIdx);
        console.info(`Actividad iniciada → ${tipoDeActividad(tipo).etiqueta} en ${misRutas[rutaIdx].nombre}`);
        abrirMapa(rutaIdx);
        // abrirMapa recrea los marcadores, así que el popup se cierra solo:
        // se reabre para que el cronómetro y el botón "Detener" sigan a la vista.
        abrirPopupRuta(rutaIdx);
    }

    /**
     * Cierra la sesión: frena el cronómetro, guarda el resultado en el historial
     * local y lo sincroniza con Supabase.
     */
    detenerActividad() {
        const actividad = this.estado.actividad;
        if (!actividad.activa) return;

        const idx = actividad.rutaIdx;
        const tipo = tipoDeActividad(actividad.tipo);
        clearInterval(actividad.interval);
        actividad.interval = null;
        actividad.activa = false;

        this.registrar('fin-actividad', {
            actividad: actividad.tipo,
            tiempo: formatoTiempo(actividad.seconds),
            distancia_km: parseFloat((this.estado.distanciaTotal / 1000).toFixed(2))
        });

        const registro = {
            tipo: tipo.nombre,
            ruta: misRutas[idx] ? misRutas[idx].nombre : 'Ruta Libre',
            tiempo: formatoTiempo(actividad.seconds),
            distancia: (this.estado.distanciaTotal / 1000).toFixed(2),
            ritmo: ritmoMinPorKm(actividad.seconds, this.estado.distanciaTotal)
        };

        // Guardado local (mismo formato y clave que lee la sección Historial)
        guardarActividad(registro);

        // Guardado en la nube con Supabase
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('actividades')
                    .insert([
                        {
                            tipo: registro.tipo,
                            tiempo: registro.tiempo,
                            distancia: parseFloat(registro.distancia)
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
        // Igual que al iniciar, el redibujado cierra el popup: se reabre el de
        // la ruta para que el usuario vea otra vez las opciones Trote / Carrera.
        abrirPopupRuta(idx);
    }

    // --- Datos del GPS durante la sesión ---

    /**
     * Acumula traza y distancia con cada lectura del GPS mientras hay sesión
     * activa (antes vivía dentro de geolocalizacion.js).
     */
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

    /** Tick del cronómetro: un segundo más y refresco del popup. */
    tickActividad() {
        this.estado.actividad.seconds++;
        const el = document.getElementById(`time-${this.estado.actividad.rutaIdx}`);
        if (el) el.innerText = formatoTiempo(this.estado.actividad.seconds);
        this.actualizarPanelActividad();
    }

    /** Mantiene el panel flotante (tiempo, km y ritmo) al día. */
    actualizarPanelActividad() {
        hudTime.innerText = formatoTiempo(this.estado.actividad.seconds);
        hudDist.innerText = (this.estado.distanciaTotal / 1000).toFixed(2);
        hudRitmo.innerText = ritmoMinPorKm(this.estado.actividad.seconds, this.estado.distanciaTotal);
    }

    // --- Popups y traza ---

    /** Sincroniza el popup de una ruta con el estado real de la actividad. */
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
            if (lblTipo) lblTipo.innerText = tipoDeActividad(this.estado.actividad.tipo).etiqueta;
            if (lblTime) lblTime.innerText = formatoTiempo(this.estado.actividad.seconds);
        }
    }

    /** Línea por donde fuiste corriendo (se redibuja con cada posición nueva). */
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

// --- Instancia singleton y API pública delegando en ella ---

// Singleton: una sola sesión activa, compartida por toda la aplicación.
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