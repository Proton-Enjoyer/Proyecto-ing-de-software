// js/navegacion.js — Navegación entre secciones (Inicio / Eventos / Historial / Mapa)
// y menú desplegable móvil (hamburguesa).

import {
    heroSection,
    eventosSection,
    historialSection,
    mapContainer,
    navItems
} from './dom.js';
import { estado } from './estado.js';
import { ServicioBase } from './base.js';

export class Navegacion extends ServicioBase {
    constructor(store = estado) {
        super(store);
    }

    /** Muestra una sección y oculta las demás (fuente única del layout). */
    mostrarSeccion(cual) {
        this.registrar('ver-seccion', { seccion: cual });
        heroSection.classList.toggle('hidden', cual !== 'inicio');
        eventosSection.classList.toggle('hidden', cual !== 'eventos');
        historialSection.classList.toggle('hidden', cual !== 'historial');
        mapContainer.classList.toggle('map-active', cual === 'mapa');

        if (cual === 'mapa') window.scrollTo(0, 0);
        if (cual === 'inicio') heroSection.classList.add('fade-in');
        if (cual === 'eventos') eventosSection.classList.add('fade-in');
    }

    /** Abre o cierra el menú desplegable del móvil. */
    alternarMenuMovil() {
        navItems.classList.toggle('active');
    }

    /** Cierra el menú desplegable del móvil. */
    cerrarMenuMovil() {
        navItems.classList.remove('active');
    }
}

// Singleton: una sola navegación para toda la aplicación.
export const navegacion = new Navegacion();

export function mostrarSeccion(cual) {
    return navegacion.mostrarSeccion(cual);
}

export function alternarMenuMovil() {
    return navegacion.alternarMenuMovil();
}

export function cerrarMenuMovil() {
    return navegacion.cerrarMenuMovil();
}