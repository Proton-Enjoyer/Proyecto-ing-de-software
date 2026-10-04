// Detección de proximidad: ¿el usuario está cerca de alguna ruta?
// Si está a menos de UMBRAL_RUTA_METROS aparece el prompt para iniciar
// trote o carrera (con cooldown para no spamear el aviso).

import { estado } from './estado.js';
import { misRutas } from './datos.js';
import { distanciaARuta } from './util.js';
import { promptCercania, ppRuta, ppDist } from './dom.js';

const UMBRAL_RUTA_METROS = 50;    // radio para considerar "llegaste a la ruta"
const COOLDOWN_PROMPT_MS = 20000;  // evita repetir el mismo aviso inmediatamente

class ProximityDetector {
    constructor(store = estado) {
        this.estado = store;
    }

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

        if (idxMejor === -1 || minDist > UMBRAL_RUTA_METROS) {
            this.estado.rutaDetectada = null; // salió del radio: se puede volver a avisar luego
            return;
        }

        // No spamear el mismo aviso
        const ahora = Date.now();
        if (idxMejor === this.estado.rutaDetectada && ahora - this.estado.ultimaDeteccion < COOLDOWN_PROMPT_MS) {
            return;
        }

        this.mostrarPrompt(idxMejor, minDist);
    }

    mostrarPrompt(idx, dist) {
        this.estado.rutaDetectada = idx;
        this.estado.ultimaDeteccion = Date.now();
        this.estado.promptVisible = true;

        ppRuta.innerText = misRutas[idx].nombre;
        ppDist.innerText = `A ${Math.round(dist)} m de la ruta`;
        promptCercania.classList.remove('proximity-hidden');
    }

    ocultarPrompt() {
        this.estado.promptVisible = false;
        promptCercania.classList.add('proximity-hidden');
    }
}

// Singleton para mantener el uso actual del proyecto
export const proximityDetector = new ProximityDetector();

// Compatibilidad con la API actual: se mantienen las mismas funciones exportadas
export function evaluarProximidad() {
    return proximityDetector.evaluarProximidad();
}

export function mostrarPrompt(idx, dist) {
    return proximityDetector.mostrarPrompt(idx, dist);
}

export function ocultarPrompt() {
    return proximityDetector.ocultarPrompt();
}

export { ProximityDetector };
