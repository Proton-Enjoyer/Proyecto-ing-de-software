// Historial de actividades: guardado, lectura y renderizado (localStorage).
//
// Todas las sesiones usan UNA sola clave y UN solo formato de registro:
//     { id, tipo, ruta, fecha, tiempo, distancia, ritmo }
// Antes existían dos claves incompatibles ('runwell-historial' y
// 'runwell_historial'): las actividades reales se guardaban en una y la
// UI leía la otra, así que nunca se mostraban. migrarDatosAntiguos()
// las une al arrancar para no perder datos.

import { historialLista, borrarHistorialBtn } from './dom.js';
import { formatoTiempo } from './util.js';

const CLAVE = 'runwell-historial';   // clave canónica (misma nomenclatura que runwell-tema)
const CLAVE_LEGACY = 'runwell_historial';

function leerCrudo(clave) {
    try {
        return JSON.parse(localStorage.getItem(clave) || '[]');
    } catch (e) {
        console.warn(`Historial ilegible en "${clave}":`, e);
        return [];
    }
}

// Fecha legible: "27/9/2026 06:06 AM"
export function fechaCorta(d = new Date()) {
    return d.toLocaleDateString() + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Convierte registros de versiones anteriores al formato actual
function normalizar(item) {
    if (!item) return null;

    // Formato viejo de detenerActividad(): duracionSegundos + distanciaMetros
    if (item.tiempo === undefined) {
        const fecha = item.fecha ? new Date(item.fecha) : new Date();
        return {
            id: item.id ?? Date.now(),
            tipo: item.tipo ? item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1) : 'Carrera',
            ruta: item.ruta || 'Ruta Libre',
            fecha: fechaCorta(fecha),
            tiempo: formatoTiempo(item.duracionSegundos || 0),
            distancia: ((item.distanciaMetros || 0) / 1000).toFixed(2),
            ritmo: item.ritmo || '--:--'
        };
    }

    // Ya está en el formato actual: solo completamos faltantes
    return {
        id: item.id ?? Date.now(),
        tipo: item.tipo || 'Carrera',
        ruta: item.ruta || 'Ruta Libre',
        fecha: item.fecha || '—',
        tiempo: item.tiempo || '00:00',
        distancia: item.distancia || '0.00',
        ritmo: item.ritmo || '--:--'
    };
}

// Une las claves antiguas en la canónica (una sola vez, al arrancar)
function migrarDatosAntiguos() {
    const legado = leerCrudo(CLAVE_LEGACY);
    const actual = leerCrudo(CLAVE);
    const hayFormatoViejo = actual.some(item => item && item.tiempo === undefined);
    if (legado.length === 0 && !hayFormatoViejo) return;

    const unificado = [...actual, ...legado].map(normalizar).filter(Boolean);
    localStorage.setItem(CLAVE, JSON.stringify(unificado));
    localStorage.removeItem(CLAVE_LEGACY);
    console.info(`Historial unificado: ${unificado.length} sesiones en "${CLAVE}"`);
}

// Obtener registros guardados (siempre en el formato actual)
export function obtenerHistorial() {
    return leerCrudo(CLAVE).map(normalizar).filter(Boolean);
}

// Guardar una actividad finalizada
export function guardarActividad(sesion) {
    const historial = obtenerHistorial();
    historial.unshift({
        id: sesion.id ?? Date.now(),
        tipo: sesion.tipo || 'Carrera',
        ruta: sesion.ruta || 'Ruta Libre',
        fecha: sesion.fecha || fechaCorta(),
        tiempo: sesion.tiempo || '00:00',
        distancia: sesion.distancia || '0.00',
        ritmo: sesion.ritmo || '--:--'
    });
    localStorage.setItem(CLAVE, JSON.stringify(historial));
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

// Arranque: migrar datos viejos y habilitar el botón "Limpiar Historial"
export function iniciarHistorial() {
    migrarDatosAntiguos();

    if (!borrarHistorialBtn) return;
    borrarHistorialBtn.addEventListener('click', () => {
        if (confirm('¿Deseas borrar todo el historial?')) {
            localStorage.removeItem(CLAVE);
            localStorage.removeItem(CLAVE_LEGACY);
            renderizarHistorial();
        }
    });
}
