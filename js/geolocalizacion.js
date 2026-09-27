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

// Detalle técnico del navegador, para poder diagnosticar fallos remotos
// (Vercel, otros navegadores) sin tener que abrir la consola
function detalle(error) {
    return error && error.message ? ` (${error.message})` : '';
}

function manejarErrorGeolocalizacion(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            mostrarErrorGPS('Permiso de ubicación bloqueado. Actívalo en el candado 🔒 de la barra → Ubicación → Permitir.');
            break;
        case error.POSITION_UNAVAILABLE:
            mostrarErrorGPS('Información de ubicación no disponible.' + detalle(error));
            break;
        case error.TIMEOUT:
            mostrarErrorGPS('La solicitud de ubicación expiró.' + detalle(error));
            break;
        default:
            mostrarErrorGPS('Error desconocido al obtener la ubicación.' + detalle(error));
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

    // Sin timeout y con errores en silencio (solo consola): estas peticiones se
    // hacen al cargar la página, mientras el navegador puede estar mostrando el
    // diálogo de permiso. Con timeout, las peticiones morían a los 10 s, Firefox
    // retiraba el diálogo (ya no había nada pendiente) y el usuario no podía
    // conceder el permiso; además saltaba una alerta sin que él hubiera pedido nada.
    navigator.geolocation.getCurrentPosition(
        (pos) => manejarPosicion(pos),
        (err) => console.warn('GPS (automático):', err.message),
        { enableHighAccuracy: true, maximumAge: 5000 }
    );

    estado.seguimientoId = navigator.geolocation.watchPosition(
        (pos) => manejarPosicion(pos),
        (err) => console.warn('GPS (seguimiento):', err.message),
        { enableHighAccuracy: true, maximumAge: 2000 }
    );
}

// Ubicación puntual (la usa el botón 📍 y al abrir el mapa)
export function obtenerUbicacion(centrar) {
    if (!navigator.geolocation) {
        mostrarErrorGPS('Tu navegador no soporta geolocalización');
        return;
    }
    // Timeout solo cuando lo pidió el usuario (📍): en la lectura automática al
    // abrir el mapa, el timeout mataba la petición si el diálogo de permiso
    // seguía abierto
    const opciones = { enableHighAccuracy: true, maximumAge: 5000 };
    if (centrar) opciones.timeout = 15000;

    navigator.geolocation.getCurrentPosition((pos) => {
        estado.posActual = [pos.coords.latitude, pos.coords.longitude];
        actualizarMarcadorUsuario();
        if (centrar && estado.mapa) {
            // { duration } acota el vuelo a 1,5 s: sin él, Leaflet calcula la
            // duración según la distancia (1000 * S * 0.8 ms) y en rutas largas
            // el mapa tarda varios segundos en moverse, como si no pasara nada
            estado.mapa.flyTo(estado.posActual, 15, { duration: 1.5 });
        }
    }, (error) => {
        // Regla: lo que pidió el usuario avisa en pantalla; lo automático va a consola
        if (centrar) manejarErrorGeolocalizacion(error);
        else console.warn('GPS (mapa):', error.message);
    }, opciones);
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
