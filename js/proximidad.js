// Detección de proximidad: ¿el usuario está cerca de alguna ruta?
// Si está a menos de UMBRAL_RUTA_METROS aparece el prompt para iniciar
// trote o carrera (con cooldown para no spamear el aviso).

import { estado } from './estado.js';
import { misRutas } from './datos.js';
import { distanciaARuta } from './util.js';
import { promptCercania, ppRuta, ppDist } from './dom.js';

const UMBRAL_RUTA_METROS = 50;    // radio para considerar "llegaste a la ruta"
const COOLDOWN_PROMPT_MS = 20000; // evita repetir el mismo aviso inmediatamente

// Colisión: ¿está el usuario sobre alguna ruta?
export function evaluarProximidad() {
    const posActual = estado.posActual;

    // Sin posición, con actividad en curso o con el prompt ya abierto → nada
    if (!posActual || estado.actividad.activa || estado.promptVisible) return;

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
        estado.rutaDetectada = null; // salió del radio: se puede volver a avisar luego
        return;
    }

    // No spamear el mismo aviso
    const ahora = Date.now();
    if (idxMejor === estado.rutaDetectada && ahora - estado.ultimaDeteccion < COOLDOWN_PROMPT_MS) {
        return;
    }

    mostrarPrompt(idxMejor, minDist);
}

export function mostrarPrompt(idx, dist) {
    estado.rutaDetectada = idx;
    estado.ultimaDeteccion = Date.now();
    estado.promptVisible = true;
    ppRuta.innerText = misRutas[idx].nombre;
    ppDist.innerText = `A ${Math.round(dist)} m de la ruta`;
    promptCercania.classList.remove('proximity-hidden');
}

export function ocultarPrompt() {
    estado.promptVisible = false;
    promptCercania.classList.add('proximity-hidden');
}
