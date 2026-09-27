// Sección de Eventos: tarjetas por ruta y botón "Ver Ruta en Mapa".

import { misRutas } from './datos.js';
import { estado } from './estado.js';
import { eventosGrid } from './dom.js';
import { abrirMapa } from './mapa.js';

// Renderizar eventos dinámicamente
export function renderizarEventos() {
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
            abrirMapa(index);

            if (misRutas[index] && estado.mapa) {
                const coordInicio = misRutas[index].coords[0];
                estado.mapa.flyTo(coordInicio, 16, { duration: 1.5 });

                setTimeout(() => {
                    // (antes se usaba "ventanasEmergentesRuta", un nombre que
                    // no existía en ningún lado: ReferenceError y no abría)
                    if (estado.popupsRuta[index]) {
                        L.popup()
                            .setLatLng(coordInicio)
                            .setContent(estado.popupsRuta[index])
                            .openOn(estado.mapa);
                    }
                }, 400);
            }
        });

        card.appendChild(btnUnirse);
        eventosGrid.appendChild(card);
    });
}
