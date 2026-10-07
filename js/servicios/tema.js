// js/servicios/tema.js — Modo oscuro persistente en localStorage (clave `runwell-tema`).

import { btnTheme } from '../core/dom.js';
import { ServicioBase } from '../core/base.js';

const CLAVE_TEMA = 'runwell-tema';

export class Tema extends ServicioBase {
    #clave = CLAVE_TEMA;
    #boton;

    constructor(boton = btnTheme) {
        super();
        this.#boton = boton;
    }

    /** Aplica el tema guardado (si hay) y conecta el switch. */
    iniciar() {
        if (localStorage.getItem(this.#clave) === 'oscuro') {
            document.body.classList.add('dark-theme');
            this.#boton.checked = true;
        }

        this.#boton.addEventListener('change', () => {
            document.body.classList.toggle('dark-theme', this.#boton.checked);
            localStorage.setItem(this.#clave, this.#boton.checked ? 'oscuro' : 'claro');
        });
    }
}

// Singleton del tema.
export const tema = new Tema();

export function iniciarTema() {
    return tema.iniciar();
}