// Geolocalización: permiso, seguimiento continuo y manejo de errores del GPS.

import { estado } from './estado.js';
import { evaluarProximidad } from './proximidad.js';
import { registrarPunto } from './actividad.js';
import { log } from './logs.js';

class GeolocationService {
    constructor(store = estado) {
        this.estado = store;
        this._watchId = null;
        // bind callbacks
        this._onPosition = this._onPosition.bind(this);
        this._onErrorSilent = this._onErrorSilent.bind(this);
    }

    // --- Alert helpers ---
    _crearAlerta() {
        let alerta = document.getElementById('alerta-gps');
        if (!alerta) {
            alerta = document.createElement('div');
            alerta.id = 'alerta-gps';
            document.body.appendChild(alerta);
        }
        return alerta;
    }

    mostrarAlertaGPS(mensaje, esInfo) {
        const alerta = this._crearAlerta();
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

    detalle(error) {
        return error && error.message ? ` (${error.message})` : '';
    }

    manejarErrorGeolocalizacion(error) {
        const codigos = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' };
        log('gps-error', { codigo: codigos[error.code] || `OTRO(${error.code})` });
        switch (error.code) {
            case error.PERMISSION_DENIED:
                this.mostrarErrorGPS('Permiso de ubicación bloqueado. Actívalo en el candado 🔒 de la barra → Ubicación → Permitir.');
                break;
            case error.POSITION_UNAVAILABLE:
                this.mostrarErrorGPS('Información de ubicación no disponible.' + this.detalle(error));
                break;
            case error.TIMEOUT:
                this.mostrarErrorGPS('La solicitud de ubicación expiró.' + this.detalle(error));
                break;
            default:
                this.mostrarErrorGPS('Error desconocido al obtener la ubicación.' + this.detalle(error));
                break;
        }
    }

    // Construye el icono del usuario para el marcador (usa avatar si existe)
    iconoUsuario() {
        let avatarUrl = "";
        const avatarImgNavbar = document.getElementById('user-avatar-img');
        if (avatarImgNavbar && avatarImgNavbar.src && avatarImgNavbar.src !== "" && !avatarImgNavbar.src.includes('placeholder')) {
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

    // --- Internals: llamadas del navegador ---
    _onPosition(pos) {
        this.manejarPosicion(pos);
    }

    _onErrorSilent(err) {
        console.warn('GPS (seguimiento):', err.message);
    }

    // Iniciar seguimiento continuo (getCurrentPosition + watchPosition)
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

        this._watchId = navigator.geolocation.watchPosition(
            this._onPosition,
            this._onErrorSilent,
            { enableHighAccuracy: true, maximumAge: 2000 }
        );

        this.estado.seguimientoId = this._watchId;
    }

    // Obtener una ubicación puntual (por ejemplo al pulsar el botón 📍)
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
            log('gps-lectura', {
                centrar: !!centrar,
                precision: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null
            });
            if (centrar && this.estado.mapa) {
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

    // Maneja cada actualización de posición del GPS
    manejarPosicion(pos) {
        // pos puede venir como GeolocationPosition o como array [lat,lng] en llamadas internas.
        let coords;
        if (Array.isArray(pos)) {
            coords = { latitude: pos[0], longitude: pos[1], accuracy: null };
        } else {
            coords = pos.coords;
        }

        // Filtro: si la imprecisión del GPS es mayor a 35 metros, ignoramos la lectura
        if (coords.accuracy && coords.accuracy > 35) {
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

    // Exponer watchId (opcional)
    get watchId() { return this._watchId; }
}

// Instancia singleton mantenida por el módulo
export const geolocationService = new GeolocationService();

// Compatibilidad con la API anterior: funciones exportadas que delegan
export function mostrarErrorGPS(mensaje) { return geolocationService.mostrarErrorGPS(mensaje); }
export function iniciarTracking() { return geolocationService.iniciarTracking(); }
export function obtenerUbicacion(centrar) { return geolocationService.obtenerUbicacion(centrar); }
export function manejarPosicion(pos) { return geolocationService.manejarPosicion(pos); }
export { GeolocationService };
