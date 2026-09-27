// Historial de actividades: guardado, lectura y renderizado (localStorage).

import { historialLista, borrarHistorialBtn } from './dom.js';

// Clave que usa renderizarHistorial / guardarActividad
const CLAVE = 'runwell_historial';
// NOTA (deuda técnica conocida): guardarEnHistorial() escribe en otra clave
// ('runwell-historial'), distinta a la que lee renderizarHistorial().
// Se conserva tal cual en la partición y se unifica en el commit de fixes.

// Obtener registros guardados
export function obtenerHistorial() {
    const datos = localStorage.getItem(CLAVE);
    return datos ? JSON.parse(datos) : [];
}

// Guardar una nueva actividad (formato que espera renderizarHistorial)
export function guardarActividad(tipo, rutaNombre, tiempoStr, distanciaKm, ritmoStr) {
    const historial = obtenerHistorial();
    const nuevaActividad = {
        id: Date.now(),
        tipo: tipo || 'Carrera',
        ruta: rutaNombre || 'Ruta Perímetro LUZ',
        fecha: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tiempo: tiempoStr || '00:00',
        distancia: distanciaKm || '0.00',
        ritmo: ritmoStr || '--:--'
    };

    historial.unshift(nuevaActividad);
    localStorage.setItem(CLAVE, JSON.stringify(historial));
}

// Guardar la sesión que se completa al detener la actividad (en curso)
export function guardarEnHistorial(sesion) {
    const historial = obtenerHistorial();
    historial.unshift(sesion);
    localStorage.setItem('runwell-historial', JSON.stringify(historial));
}

// Mostrar las tarjetas en la sección Historial
export function renderizarHistorial() {
    if (!historialLista) return;
    const historial = obtenerHistorial();
    historialLista.innerHTML = '';

    if (historial.length === 0) {
        historialLista.innerHTML = '<p style="text-align:center; grid-column:1/-1; opacity:0.7;">Aún no tienes actividades registradas.</p>';
        if (borrarHistorialBtn) borrarHistorialBtn.classList.add('hidden');
        return;
    }

    if (borrarHistorialBtn) borrarHistorialBtn.classList.remove('hidden');

    historial.forEach(item => {
        const card = document.createElement('div');
        card.className = 'plane-card';
        card.innerHTML = `
            <h3>${item.tipo} - ${item.ruta}</h3>
            <p style="font-size:0.85rem; opacity:0.8;">${item.fecha}</p>
            <div style="display:flex; justify-content:space-around; margin-top:1rem; text-align:center;">
                <div><strong>${item.tiempo}</strong><br><small>Tiempo</small></div>
                <div><strong>${item.distancia} km</strong><br><small>Distancia</small></div>
                <div><strong>${item.ritmo}</strong><br><small>Ritmo</small></div>
            </div>
        `;
        historialLista.appendChild(card);
    });
}

// Borrar historial (botón "Limpiar Historial")
export function iniciarHistorial() {
    if (!borrarHistorialBtn) return;
    borrarHistorialBtn.addEventListener('click', () => {
        if (confirm('¿Deseas borrar todo el historial?')) {
            localStorage.removeItem(CLAVE);
            renderizarHistorial();
        }
    });
}
