// Geolocalización: permiso, seguimiento continuo y manejo de errores del GPS.

import { estado } from './estado.js';
import { evaluarProximidad } from './proximidad.js';
import { registrarPunto } from './actividad.js';

// Muestra una alerta visual si falla el GPS
// (los estilos viven en css/mapa.css, no en JS)
export function mostrarErrorGPS(mensaje) {
    let alerta = document.getElementById('alerta-gps');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.id = 'alerta-gps';
        document.body.appendChild(alerta);
    }
    alerta.textContent = mensaje;
    alerta.classList.remove('oculta');
    setTimeout(() => { alerta.classList.add('oculta'); }, 5000);
}

function manejarErrorGeolocalizacion(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            mostrarErrorGPS('Permiso de ubicación denegado. Actívalo en tu navegador.');
            break;
        case error.POSITION_UNAVAILABLE:
            mostrarErrorGPS('Información de ubicación no disponible.');
            break;
        case error.TIMEOUT:
            mostrarErrorGPS('La solicitud de ubicación expiró.');
            break;
        default:
            mostrarErrorGPS('Error desconocido al obtener la ubicación.');
            break;
    }
}

// Icono del usuario (se crea al usarlo, cuando Leaflet ya cargó)
function iconoUsuario() {
    if (!estado.userIcon) {
        estado.userIcon = L.divIcon({
            className: 'user-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }
    return estado.userIcon;
}

// Crea o mueve el marcador azul del usuario (compartido por el seguimiento
// continuo y por el botón 📍; antes estaba duplicado en ambas funciones)
function actualizarMarcadorUsuario() {
    if (!estado.mapa) return;
    if (estado.userMarker) {
        estado.userMarker.setLatLng(estado.posActual);
    } else {
        estado.userMarker = L.marker(estado.posActual, { icon: iconoUsuario() })
            .addTo(estado.mapa)
            .bindPopup('Estás aquí');
    }
}

// Pide permiso y deja el GPS corriendo de forma continua
export function iniciarTracking() {
    if (!navigator.geolocation) {
        mostrarErrorGPS('Tu navegador no soporta geolocalización');
        return;
    }
    if (estado.seguimientoId !== null) return;

    navigator.geolocation.getCurrentPosition(
        (pos) => manejarPosicion(pos),
        (error) => manejarErrorGeolocalizacion(error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    estado.seguimientoId = navigator.geolocation.watchPosition(
        (pos) => manejarPosicion(pos),
        (error) => manejarErrorGeolocalizacion(error),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
}

// Ubicación puntual (la usa el botón 📍 y al abrir el mapa)
export function obtenerUbicacion(centrar) {
    if (!navigator.geolocation) {
        mostrarErrorGPS('Tu navegador no soporta geolocalización');
        return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
        estado.posActual = [pos.coords.latitude, pos.coords.longitude];
        actualizarMarcadorUsuario();
        if (centrar && estado.mapa) {
            estado.mapa.flyTo(estado.posActual, 15);
        }
    }, (error) => {
        // Antes era un console.warn invisible para el usuario
        manejarErrorGeolocalizacion(error);
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
}

// Se ejecuta con CADA actualización del GPS
export function manejarPosicion(pos) {
    // Filtro: si la imprecisión del GPS es mayor a 35 metros, ignoramos la lectura
    if (pos.coords.accuracy && pos.coords.accuracy > 35) {
        console.warn(`Lectura descartada por baja precisión (${Math.round(pos.coords.accuracy)}m)`);
        return;
    }

    estado.posActual = [pos.coords.latitude, pos.coords.longitude];

    // Mover (o crear) el marcador del usuario en el mapa
    actualizarMarcadorUsuario();

    // Acumular la traza (y la distancia) solo mientras dura la actividad
    registrarPunto(estado.posActual);

    // ¿Hay alguna ruta cerca? → dispara el prompt
    evaluarProximidad();
}
