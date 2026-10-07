// js/servicios/eventos.js — Sección de Eventos: tarjetas por ruta y botón "Ver Ruta en Mapa".

import { misRutas } from '../core/datos.js';
import { estado } from '../core/estado.js';
import { eventosGrid } from '../core/dom.js';
import { abrirMapa } from './mapa.js';
import { ServicioBase } from '../core/base.js';

export class EventosController extends ServicioBase {
    constructor(store = estado) {
        super(store);
    }

    /** Renderiza una tarjeta por ruta con su día/hora y botón al mapa. */
    renderizarEventos() {
        eventosGrid.innerHTML = '';
        misRutas.forEach((ruta, index) => {
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <h3>${ruta.nombre}</h3>
                <p>${ruta.plan.dia} - ${ruta.plan.hora}</p>
            `;

            const btnUnirse = document.createElement('button');
            btnUnirse.innerText = "Ver Ruta en Mapa";
            btnUnirse.addEventListener('click', () => {
                this.abrirRutaEnMapa(index);
            });

            card.appendChild(btnUnirse);
            eventosGrid.appendChild(card);
        });
    }

    /** Abre el mapa en una ruta y abre su popup tras el vuelo. */
    abrirRutaEnMapa(index) {
        abrirMapa(index);

        if (misRutas[index] && this.estado.mapa) {
            const coordInicio = misRutas[index].coords[0];
            this.estado.mapa.flyTo(coordInicio, 16, { duration: 1.5 });

            setTimeout(() => {
                // (antes se usaba "ventanasEmergentesRuta", un nombre que
                // no existía en ningún lado: ReferenceError y no abría)
                if (this.estado.popupsRuta[index]) {
                    L.popup()
                        .setLatLng(coordInicio)
                        .setContent(this.estado.popupsRuta[index])
                        .openOn(this.estado.mapa);
                }
            }, 400);
        }
    }
}

// Singleton: una sola vista de eventos.
export const eventosController = new EventosController();

export function renderizarEventos() {
    return eventosController.renderizarEventos();
}