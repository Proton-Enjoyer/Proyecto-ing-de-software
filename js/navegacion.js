// Navegación entre secciones (Inicio / Eventos / Historial / Mapa)
// y menú desplegable móvil (hamburguesa).

import {
    heroSection,
    eventosSection,
    historialSection,
    mapContainer,
    navItems
} from './dom.js';
import { log } from './logs.js';

// Muestra una sección y oculta las demás (fuente única de verdad del layout)
export function mostrarSeccion(cual) {
    log('ver-seccion', { seccion: cual });
    heroSection.classList.toggle('hidden', cual !== 'inicio');
    eventosSection.classList.toggle('hidden', cual !== 'eventos');
    historialSection.classList.toggle('hidden', cual !== 'historial');
    mapContainer.classList.toggle('map-active', cual === 'mapa');

    if (cual === 'mapa') window.scrollTo(0, 0);
    if (cual === 'inicio') heroSection.classList.add('fade-in');
    if (cual === 'eventos') eventosSection.classList.add('fade-in');
}

// Menú móvil
export function alternarMenuMovil() {
    navItems.classList.toggle('active');
}

export function cerrarMenuMovil() {
    navItems.classList.remove('active');
}
