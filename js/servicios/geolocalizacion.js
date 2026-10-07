// js/servicios/geolocalizacion.js — Permiso, seguimiento continuo y manejo de errores del GPS.
//
// Regla de errores que respeta toda la clase: lo automático es silencio
// (consola) y lo que pide el usuario avisa (alerta en pantalla `#alerta-gps`).

import { estado } from '../core/estado.js';
import { evaluarProximidad } from './proximidad.js';
import { registrarPunto } from './actividad.js';
import { ServicioBase } from '../core/base.js';
import { AVATAR_POR_DEFECTO } from '../core/recursos.js';

// Lecturas con imprecisión mayor a este valor se descartan.
const MAX_PRECISION_ACEPTADA_M = 35;

export class GeolocationService extends ServicioBase {
    #watchId = null;

    // Callbacks del navegador, enlazados a `this` una sola vez.
    #onPosition = (pos) => this.manejarPosicion(pos);
    #onErrorSilent = (err) => console.warn('GPS (seguimiento):', err.message);

    constructor(store = estado) {
        super(store);
    }

    get watchId() { return this.#watchId; }

    // --- Alertas en pantalla ---

    /** Crea #alerta-gps la primera vez que hace falta. */
    #crearAlerta() {
        let alerta = document.getElementById('alerta-gps');
        if (!alerta) {
            alerta = document.createElement('div');
            alerta.id = 'alerta-gps';
            document.body.appendChild(alerta);
        }
        return alerta;
    }

    /** Muestra el toast con coordenadas/errores y lo oculta a los 5 s. */
    mostrarAlertaGPS(mensaje, esInfo) {
        const alerta = this.#crearAlerta();
        alerta.textContent = mensaje;
        alerta.classList.toggle('info', !!esInfo);
        alerta.classList.remove('oculta');
        clearTimeout(alerta._ocultar);
        alerta._ocultar = setTimeout(() => { alerta.classList.add('oculta'); }, 5000);
    }

    mostrarErrorGPS(mensaje) {
        this.mostrarAlertaGPS(mensaje, false);
    }

    mostrarInfoGPS(mensaje) {
        this.mostrarAlertaGPS(mensaje, true);
    }

    /** Sufijo con el mensaje técnico del navegador, si lo hay. */
    #detalle(error) {
        return error && error.message ? ` (${error.message})` : '';
    }

    /** Traduce un error de geolocalización a un mensaje para el usuario. */
    manejarErrorGeolocalizacion(error) {
        const codigos = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' };
        this.registrar('gps-error', { codigo: codigos[error.code] || `OTRO(${error.code})` });
        switch (error.code) {
            case error.PERMISSION_DENIED:
                this.mostrarErrorGPS('Permiso de ubicación bloqueado. Actívalo en el candado 🔒 de la barra → Ubicación → Permitir.');
                break;
            case error.POSITION_UNAVAILABLE:
                this.mostrarErrorGPS('Información de ubicación no disponible.' + this.#detalle(error));
                break;
            case error.TIMEOUT:
                this.mostrarErrorGPS('La solicitud de ubicación expiró.' + this.#detalle(error));
                break;
            default:
                this.mostrarErrorGPS('Error desconocido al obtener la ubicación.' + this.#detalle(error));
                break;
        }
    }

    // --- Marcador del usuario ---

    /**
     * Construye el icono del marcador del usuario (con el avatar si existe).
     * Se crea de forma perezosa para no depender del orden de carga de Leaflet.
     */
    iconoUsuario() {
        let avatarUrl = "";
        const avatarImgNavbar = document.getElementById('user-avatar-img');
        if (avatarImgNavbar && avatarImgNavbar.src && avatarImgNavbar.src !== AVATAR_POR_DEFECTO) {
            avatarUrl = avatarImgNavbar.src;
        }

        const contenidoInterno = avatarUrl
            ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
               <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--primary, #007bff); color: white; font-weight: bold; font-size: 16px;"></div>`
            : `<div style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--primary, #007bff); color: white; font-weight: bold; font-size: 16px;">👤</div>`;

        return L.divIcon({
            className: 'user-avatar-marker',
            html: `<div style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                overflow: hidden;
                border: 3px solid var(--primary, #007bff);
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                background: white;
                transform: translate(-50%, -50%);
            ">
                ${contenidoInterno}
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    }

    /** Mueve (o crea) el marcador del usuario y actualiza su popup. */
    actualizarMarcadorUsuario(precision) {
        if (!this.estado.mapa) return;
        const [lat, lng] = this.estado.posActual;
        const extras = Number.isFinite(precision)
            ? `<br>${lat.toFixed(5)}, ${lng.toFixed(5)} · ±${Math.round(precision)} m`
            : '';
        const texto = `Estás aquí${extras}`;
        if (this.estado.userMarker) {
            this.estado.userMarker.setLatLng(this.estado.posActual);
            this.estado.userMarker.setPopupContent(texto);
        } else {
            this.estado.userMarker = L.marker(this.estado.posActual, { icon: this.iconoUsuario() })
                .addTo(this.estado.mapa)
                .bindPopup(texto);
        }
    }

    // --- Seguimiento ---

    /**
     * Arranca el seguimiento continuo.
     *
     * Las peticiones automáticas van SIN `timeout`: con `timeout: 10000` morían
     * a los 10 s mientras el diálogo de permiso seguía abierto, Firefox retiraba
     * el diálogo y saltaba una alerta sin que el usuario hubiera pedido nada.
     */
    iniciarTracking() {
        if (!navigator.geolocation) {
            this.mostrarErrorGPS('Tu navegador no soporta geolocalización');
            return;
        }
        if (this.estado.seguimientoId !== null) return;

        // Lectura inicial silenciosa (sin notificar al usuario)
        navigator.geolocation.getCurrentPosition(
            (pos) => this.manejarPosicion(pos),
            (err) => console.warn('GPS (automático):', err.message),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );

        this.#watchId = navigator.geolocation.watchPosition(
            this.#onPosition,
            this.#onErrorSilent,
            { enableHighAccuracy: true, maximumAge: 2000 }
        );

        this.estado.seguimientoId = this.#watchId;
    }

    /** Detiene el seguimiento continuo. */
    detenerTracking() {
        if (this.#watchId === null) return;
        navigator.geolocation.clearWatch(this.#watchId);
        this.#watchId = null;
        this.estado.seguimientoId = null;
    }

    /**
     * Obtiene una ubicación puntual (por ejemplo al pulsar el botón 📍).
     * Con `centrar`=vuelo al punto y muestra el toast de diagnóstico.
     */
    obtenerUbicacion(centrar) {
        if (!navigator.geolocation) {
            this.mostrarErrorGPS('Tu navegador no soporta geolocalización');
            return;
        }
        const opciones = { enableHighAccuracy: true, maximumAge: 5000 };
        if (centrar) opciones.timeout = 15000;

        navigator.geolocation.getCurrentPosition((pos) => {
            this.estado.posActual = [pos.coords.latitude, pos.coords.longitude];
            this.actualizarMarcadorUsuario(pos.coords.accuracy);
            this.registrar('gps-lectura', {
                centrar: !!centrar,
                precision: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null
            });
            if (centrar && this.estado.mapa) {
                // `duration: 1.5` evita que Leaflet calcule un vuelo de varios
                // segundos según la distancia (sensación de "no hace nada").
                this.estado.mapa.flyTo(this.estado.posActual, 15, { duration: 1.5 });
                const [lat, lng] = this.estado.posActual;
                const prec = Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null;
                this.mostrarInfoGPS(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}` +
                    (prec !== null ? ` · precisión ±${prec} m` : '') +
                    (prec !== null && prec > 100 ? ' (ubicación aproximada)' : ''));
            }
        }, (error) => {
            if (centrar) this.manejarErrorGeolocalizacion(error);
            else console.warn('GPS (mapa):', error.message);
        }, opciones);
    }

    /**
     * Maneja cada actualización de posición: filtra por precisión, actualiza el
     * estado, mueve el marcador, acumula la traza y dispara la proximidad.
     */
    manejarPosicion(pos) {
        // pos puede venir como GeolocationPosition o como array [lat,lng] en
        // llamadas internas.
        let coords;
        if (Array.isArray(pos)) {
            coords = { latitude: pos[0], longitude: pos[1], accuracy: null };
        } else {
            coords = pos.coords;
        }

        // Filtro: si la imprecisión del GPS es mayor a 35 metros, ignoramos la lectura
        if (coords.accuracy && coords.accuracy > MAX_PRECISION_ACEPTADA_M) {
            console.warn(`Lectura descartada por baja precisión (${Math.round(coords.accuracy)}m)`);
            return;
        }

        this.estado.posActual = [coords.latitude, coords.longitude];

        // Mover (o crear) el marcador del usuario en el mapa
        this.actualizarMarcadorUsuario(coords.accuracy);

        // Acumular la traza (y la distancia) solo mientras dura la actividad
        registrarPunto(this.estado.posActual);

        // ¿Hay alguna ruta cerca? → dispara el prompt
        evaluarProximidad();
    }
}

// --- Instancia singleton y API pública delegando en ella ---

// Singleton: un único seguimiento GPS para toda la aplicación.
export const geolocationService = new GeolocationService();

export function mostrarErrorGPS(mensaje) {
    return geolocationService.mostrarErrorGPS(mensaje);
}

export function iniciarTracking() {
    return geolocationService.iniciarTracking();
}

export function detenerTracking() {
    return geolocationService.detenerTracking();
}

export function obtenerUbicacion(centrar) {
    return geolocationService.obtenerUbicacion(centrar);
}

export function manejarPosicion(pos) {
    return geolocationService.manejarPosicion(pos);
}