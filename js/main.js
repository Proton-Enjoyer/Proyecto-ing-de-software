// js/main.js — Punto de entrada (composition root).
//
// Aquí se inician los servicios y se conectan con los botones del DOM.
// Ninguna otra clase crea dependencias: este es el único lugar que conoce a
// todas las piezas y las une.

import { estado } from './estado.js';
import * as dom from './dom.js';
import { abrirMapa, cerrarMapa } from './mapa.js';
import { iniciarTracking, obtenerUbicacion } from './geolocalizacion.js';
import { iniciarActividad } from './actividad.js';
import { ocultarPrompt } from './proximidad.js';
import { renderizarEventos } from './eventos.js';
import { mostrarSeccion, alternarMenuMovil, cerrarMenuMovil } from './navegacion.js';
import { renderizarHistorial, iniciarHistorial } from './historial.js';
import { iniciarTema } from './tema.js';
import { iniciarAutenticacion } from './auth.js';
import { iniciarLogs } from './logs.js';
import { inicializarChatbot } from './chatbot.js';

/**
 * Inicia la actividad desde el prompt de proximidad: abre esa ruta y arranca.
 */
function iniciarDesdePrompt(tipo) {
    const idx = estado.rutaDetectada;
    ocultarPrompt();
    if (idx === null) return;
    abrirMapa(idx);              // mostrar solo esa ruta
    iniciarActividad(idx, tipo); // arrancar cronómetro + traza
}

// --- Mapa ---
dom.btnVerRutas.addEventListener('click', () => abrirMapa());
dom.btnEmpezar.addEventListener('click', () => abrirMapa());
dom.btnCerrar.addEventListener('click', cerrarMapa);

// Botón para centrar el mapa en la ubicación del usuario
dom.btnUbicar.addEventListener('click', () => obtenerUbicacion(true));

// --- Prompt de proximidad: elegir qué iniciar ---
dom.ppTrote.addEventListener('click', () => iniciarDesdePrompt('trote'));
dom.ppCarrera.addEventListener('click', () => iniciarDesdePrompt('carrera'));
dom.ppIgnorar.addEventListener('click', ocultarPrompt);
dom.ppCerrar.addEventListener('click', ocultarPrompt);

// --- Navegación entre secciones ---
dom.btnInicio.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarSeccion('inicio');
});

dom.btnEventos.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarSeccion('eventos');
    renderizarEventos();
});

dom.btnHistorial.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarSeccion('historial');
    renderizarHistorial();
});

// --- Menú desplegable móvil ---
if (dom.menuToggle && dom.navItems) {
    dom.menuToggle.addEventListener('click', alternarMenuMovil);

    // Cerrar el menú al hacer clic en cualquier enlace interno
    dom.navItems.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', cerrarMenuMovil);
    });
}

// --- Arranque ---
iniciarLogs(); // primero: para capturar los errores de todo lo demás
iniciarTema();
iniciarHistorial();
iniciarTracking(); // esto dispara la detección de rutas
iniciarAutenticacion();
inicializarChatbot();