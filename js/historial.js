// Historial de actividades: guardado, lectura y renderizado (localStorage).
//
// Formato canonical: { id, tipo, ruta, fecha, tiempo, distancia, ritmo }

import { historialLista, borrarHistorialBtn } from './dom.js';
import { formatoTiempo } from './util.js';

const CLAVE = 'runwell-historial';
const CLAVE_LEGACY = 'runwell_historial';

class HistoryRepository {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.clave = CLAVE;
    this.claveLegacy = CLAVE_LEGACY;
  }

  // Lectura cruda desde storage (array)
  _leerCrudo(clave) {
    try {
      return JSON.parse(this.storage.getItem(clave) || '[]');
    } catch (e) {
      console.warn(`Historial ilegible en "${clave}":`, e);
      return [];
    }
  }

  // Fecha legible: "27/9/2026 06:06 AM"
  fechaCorta(d = new Date()) {
    return d.toLocaleDateString() + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Normaliza formatos antiguos y actuales al formato canónico
  _normalizar(item) {
    if (!item) return null;

    // Formato viejo de detenerActividad(): duracionSegundos + distanciaMetros
    if (item.tiempo === undefined) {
      const fecha = item.fecha ? new Date(item.fecha) : new Date();
      return {
        id: item.id ?? Date.now(),
        tipo: item.tipo ? item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1) : 'Carrera',
        ruta: item.ruta || 'Ruta Libre',
        fecha: this.fechaCorta(fecha),
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

  // Une la clave legacy en la canónica (se ejecuta en inicio)
  migrarDatosAntiguos() {
    const legado = this._leerCrudo(this.claveLegacy);
    const actual = this._leerCrudo(this.clave);
    const hayFormatoViejo = actual.some(item => item && item.tiempo === undefined);
    if (legado.length === 0 && !hayFormatoViejo) return;

    const unificado = [...actual, ...legado].map(i => this._normalizar(i)).filter(Boolean);
    this.storage.setItem(this.clave, JSON.stringify(unificado));
    this.storage.removeItem(this.claveLegacy);
    console.info(`Historial unificado: ${unificado.length} sesiones en "${this.clave}"`);
  }

  // Devuelve el historial en formato canónico
  obtenerHistorial() {
    return this._leerCrudo(this.clave).map(i => this._normalizar(i)).filter(Boolean);
  }

  // Guarda una sesión al inicio del array
  guardarActividad(sesion) {
    const historial = this.obtenerHistorial();
    historial.unshift({
      id: sesion.id ?? Date.now(),
      tipo: sesion.tipo || 'Carrera',
      ruta: sesion.ruta || 'Ruta Libre',
      fecha: sesion.fecha || this.fechaCorta(),
      tiempo: sesion.tiempo || '00:00',
      distancia: sesion.distancia || '0.00',
      ritmo: sesion.ritmo || '--:--'
    });
    this.storage.setItem(this.clave, JSON.stringify(historial));
  }

  // Renderiza el historial en la sección correspondiente
  renderizarHistorial() {
    if (!historialLista) return;
    const historial = this.obtenerHistorial();
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

  // Inicialización: migración y hookup del botón limpiar
  iniciarHistorial() {
    this.migrarDatosAntiguos();

    if (!borrarHistorialBtn) return;
    borrarHistorialBtn.addEventListener('click', () => {
      if (confirm('¿Deseas borrar todo el historial?')) {
        this.storage.removeItem(this.clave);
        this.storage.removeItem(this.claveLegacy);
        this.renderizarHistorial();
      }
    });
  }
}

// Singleton para compatibilidad
export const historyRepo = new HistoryRepository();

// Funciones exportadas compatibles con la API actual
export function obtenerHistorial() { return historyRepo.obtenerHistorial(); }
export function guardarActividad(sesion) { return historyRepo.guardarActividad(sesion); }
export function renderizarHistorial() { return historyRepo.renderizarHistorial(); }
export function iniciarHistorial() { return historyRepo.iniciarHistorial(); }

// También exportamos la clase por si decides instanciar con otro storage en tests
export { HistoryRepository };
