// js/core/estado.js — Estado compartido de la aplicación.
//
// Contiene los datos que varios módulos necesitan leer y escribir a la vez:
// referencias de Leaflet, la última posición del GPS, la traza del recorrido,
// la actividad en curso y los flags de proximidad.
//
// El estado NO crea comportamiento de negocio: solo guarda datos y ofrece
// transiciones simples y consistentes. El comportamiento vive en los servicios
// (Actividad, ProximityDetector, ...), que reciben esta instancia por el
// constructor.

import { EmisorEventos, EVENTO } from './base.js';

export class StateStore extends EmisorEventos {
    // --- Mapa y marcadores (Leaflet) ---
    #mapa = null;
    #userMarker = null;
    #userIcon = null;

    // --- Seguimiento de posición (GPS) ---
    #posActual = null;      // última posición conocida [lat, lng]
    #seguimientoId = null;  // watchId del GPS

    // --- Trazado del recorrido (la línea por donde pasaste) ---
    #trazaCoords = [];
    #trazaLinea = null;

    // --- Distancia acumulada durante la actividad actual (metros) ---
    #distanciaTotal = 0;

    // --- Actividad en curso (trote o carrera) ---
    #actividad = null;

    // --- Detección de proximidad ---
    #rutaDetectada = null;
    #ultimaDeteccion = 0;
    #promptVisible = false;

    // --- Popups de Leaflet registrados por ruta ---
    // El popup vive fuera del `document` hasta que se abre, así que lo guardamos
    // para poder actualizar su UI aunque esté cerrado (si no, iniciar actividad
    // desde el prompt dejaría el popup desfasado). `js/servicios/eventos.js` reutiliza estos
    // nodos para abrir el popup tras "Ver Ruta en Mapa".
    #popupsRuta = {};

    constructor() {
        super();
        this.#actividad = this.#actividadVacia();
    }

    /** Objeto de actividad en su estado inicial. */
    #actividadVacia() {
        return {
            activa: false,
            rutaIdx: null,
            tipo: null,
            seconds: 0,
            interval: null
        };
    }

    // --- Mapa ---

    get mapa() { return this.#mapa; }
    set mapa(v) { this.#mapa = v; }

    get userMarker() { return this.#userMarker; }
    set userMarker(v) { this.#userMarker = v; }

    get userIcon() { return this.#userIcon; }
    set userIcon(v) { this.#userIcon = v; }

    // --- GPS ---

    get posActual() { return this.#posActual; }
    set posActual(v) { this.#posActual = v; }

    get seguimientoId() { return this.#seguimientoId; }
    set seguimientoId(v) { this.#seguimientoId = v; }

    // --- Traza ---

    get trazaCoords() { return this.#trazaCoords; }
    set trazaCoords(v) { this.#trazaCoords = v; }

    get trazaLinea() { return this.#trazaLinea; }
    set trazaLinea(v) { this.#trazaLinea = v; }

    get distanciaTotal() { return this.#distanciaTotal; }
    set distanciaTotal(v) { this.#distanciaTotal = v; }

    // --- Actividad en curso ---

    get actividad() { return this.#actividad; }
    set actividad(v) { this.#actividad = v; }

    // --- Proximidad ---

    get rutaDetectada() { return this.#rutaDetectada; }
    set rutaDetectada(v) { this.#rutaDetectada = v; }

    get ultimaDeteccion() { return this.#ultimaDeteccion; }
    set ultimaDeteccion(v) { this.#ultimaDeteccion = v; }

    get promptVisible() { return this.#promptVisible; }
    set promptVisible(v) { this.#promptVisible = v; }

    // --- Popups por ruta ---

    get popupsRuta() { return this.#popupsRuta; }
    set popupsRuta(v) { this.#popupsRuta = v; }

    // --- Transiciones de la actividad ---

    /** Deja la actividad en su estado inicial (sin timer activo). */
    resetActividad() {
        if (this.#actividad.interval) {
            clearInterval(this.#actividad.interval);
        }
        this.#trazaCoords = [];
        this.#distanciaTotal = 0;
        this.#actividad = this.#actividadVacia();
    }

    /** Marca la actividad como iniciada para una ruta y un tipo. */
    iniciarActividad(rutaIdx, tipo) {
        this.#actividad.activa = true;
        this.#actividad.rutaIdx = rutaIdx;
        this.#actividad.tipo = tipo;
        this.#actividad.seconds = 0;
        this.#trazaCoords = [];
        this.#distanciaTotal = 0;
        this.emitir(EVENTO, { tipo: 'estado-actividad-iniciada' });
    }

    /** Marca la actividad como detenida y libera el timer. */
    detenerActividad() {
        this.#actividad.activa = false;
        this.#actividad.tipo = null;
        if (this.#actividad.interval) {
            clearInterval(this.#actividad.interval);
            this.#actividad.interval = null;
        }
    }

    // --- Popups por ruta ---

    setRutaDetectada(rutaIdx) {
        this.#rutaDetectada = rutaIdx;
    }

    setPopupRuta(rutaIdx, popup) {
        this.#popupsRuta[rutaIdx] = popup;
    }

    getPopupRuta(rutaIdx) {
        return this.#popupsRuta[rutaIdx];
    }
}

// Instancia única compartida por todos los módulos ( Singleton ).
// Vive en este módulo porque es el que no depende de nadie.
export const estado = new StateStore();