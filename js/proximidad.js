// js/proximidad.js — Detección de proximidad: ¿el usuario está cerca de alguna ruta?
//
// Si está a menos de UMBRAL_RUTA_METROS aparece el prompt para iniciar trote o
// carrera, con un cooldown para no repetir el aviso spam.

import { estado } from './estado.js';
import { misRutas } from './datos.js';
import { distanciaARuta } from './util.js';
import { promptCercania, ppRuta, ppDist } from './dom.js';
import { ServicioBase } from './base.js';

const UMBRAL_RUTA_METROS = 50;     // radio para considerar "llegaste a la ruta"
const COOLDOWN_PROMPT_MS = 20000;  // evita repetir el mismo aviso inmediatamente

export class ProximityDetector extends ServicioBase {
    #umbralMetros = UMBRAL_RUTA_METROS;
    #cooldownMs = COOLDOWN_PROMPT_MS;

    constructor(store = estado, opciones = {}) {
        super(store);
        if (typeof opciones.umbralMetros === 'number') this.#umbralMetros = opciones.umbralMetros;
        if (typeof opciones.cooldownMs === 'number') this.#cooldownMs = opciones.cooldownMs;
    }

    /**
     * Busca la ruta más cercana y, si está dentro del umbral y no hay una sesión
     * activa ni un prompt abierto, muestra el aviso.
     */
    evaluarProximidad() {
        const posActual = this.estado.posActual;

        // Sin posición, con actividad en curso o con el prompt ya abierto → nada
        if (!posActual || this.estado.actividad.activa || this.estado.promptVisible) return;

        let idxMejor = -1;
        let minDist = Infinity;

        misRutas.forEach((ruta, i) => {
            const d = distanciaARuta(ruta, posActual);
            if (d < minDist) {
                minDist = d;
                idxMejor = i;
            }
        });

        if (idxMejor === -1 || minDist > this.#umbralMetros) {
            // Salió del radio: se puede volver a avisar luego
            this.estado.rutaDetectada = null;
            return;
        }

        // No spamear el mismo aviso
        const ahora = Date.now();
        if (idxMejor === this.estado.rutaDetectada &&
            ahora - this.estado.ultimaDeteccion < this.#cooldownMs) {
            return;
        }

        this.mostrarPrompt(idxMejor, minDist);
    }

    /** Muestra el prompt de inicio para la ruta detectada. */
    mostrarPrompt(idx, dist) {
        this.estado.rutaDetectada = idx;
        this.estado.ultimaDeteccion = Date.now();
        this.estado.promptVisible = true;

        ppRuta.innerText = misRutas[idx].nombre;
        ppDist.innerText = `A ${Math.round(dist)} m de la ruta`;
        promptCercania.classList.remove('proximity-hidden');
    }

    /** Cierra el prompt y permite volver a detectar más adelante. */
    ocultarPrompt() {
        this.estado.promptVisible = false;
        promptCercania.classList.add('proximity-hidden');
    }
}

// --- Instancia singleton y API pública delegando en ella ---

// Singleton: un solo detector para toda la aplicación.
export const proximityDetector = new ProximityDetector();

export function evaluarProximidad() {
    return proximityDetector.evaluarProximidad();
}

export function mostrarPrompt(idx, dist) {
    return proximityDetector.mostrarPrompt(idx, dist);
}

export function ocultarPrompt() {
    return proximityDetector.ocultarPrompt();
}