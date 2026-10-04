// Geolocalización: permiso, seguimiento continuo y manejo de errores del GPS.

import { estado } from './estado.js';
import { evaluarProximidad } from './proximidad.js';
import { registrarPunto } from './actividad.js';
import { log } from './logs.js';

// Alerta visual del GPS: error en rojo, información (coordenadas) en azul
// (los estilos viven en css/mapa.css, no en JS)
function mostrarAlertaGPS(mensaje, esInfo) {
    let alerta = document.getElementById('alerta-gps');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.id = 'alerta-gps';
        document.body.appendChild(alerta);
    }
    alerta.textContent = mensaje;
    alerta.classList.toggle('info', !!esInfo);
    alerta.classList.remove('oculta');
    clearTimeout(alerta._ocultar);
    alerta._ocultar = setTimeout(() => { alerta.classList.add('oculta'); }, 5000);
}

export function mostrarErrorGPS(mensaje) {
    mostrarAlertaGPS(mensaje, false);
}

// Lo que reportó el navegador (coordenadas/precisión): no es un error,
// pero el usuario lo pidió al pulsar 📍 y sirve para diagnosticar
function mostrarInfoGPS(mensaje) {
    mostrarAlertaGPS(mensaje, true);
}

// Detalle técnico del navegador, para poder diagnosticar fallos remotos
// (Vercel, otros navegadores) sin tener que abrir la consola
function detalle(error) {
    return error && error.message ? ` (${error.message})` : '';
}

function manejarErrorGeolocalizacion(error) {
    // Códigos reales de GeolocationPositionError: 1=permiso, 2=sin datos, 3=timeout
    const codigos = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' };
    log('gps-error', { codigo: codigos[error.code] || `OTRO(${error.code})` });
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

function iconoUsuario() {
    let avatarUrl = "";
    const avatarImgNavbar = document.getElementById('user-avatar-img');
    
    if (avatarImgNavbar && avatarImgNavbar.src && avatarImgNavbar.src !== "" && !avatarImgNavbar.src.includes('placeholder')) {
        avatarUrl = avatarImgNavbar.src;
    }

    // Si hay una foto válida, mostramos la imagen; si no, mostramos un círculo elegante con una letra/ícono por defecto
    const contenidoInterno = avatarUrl 
        ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
           <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--primary, #007bff); color: white; font-weight: bold; font-size: 16px;">👤</div>`
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
// Crea o mueve el marcador azul del usuario (compartido por el seguimiento
// continuo y por el botón 📍; antes estaba duplicado en ambas funciones).
// El popup muestra coordenadas y precisión para poder diagnosticar a simple
// vista si el navegador da una ubicación exacta o aproximada (± grande).
function actualizarMarcadorUsuario(precision) {
    if (!estado.mapa) return;
    const [lat, lng] = estado.posActual;
    const extras = Number.isFinite(precision)
        ? `<br>${lat.toFixed(5)}, ${lng.toFixed(5)} · ±${Math.round(precision)} m`
        : '';
    const texto = `Estás aquí${extras}`;
    if (estado.userMarker) {
        estado.userMarker.setLatLng(estado.posActual);
        estado.userMarker.setPopupContent(texto);
    } else {
        estado.userMarker = L.marker(estado.posActual, { icon: iconoUsuario() })
            .addTo(estado.mapa)
            .bindPopup(texto);
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
        actualizarMarcadorUsuario(pos.coords.accuracy);
        log('gps-lectura', {
            centrar: !!centrar,
            precision: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null
        });
        if (centrar && estado.mapa) {
            // { duration } acota el vuelo a 1,5 s: sin él, Leaflet calcula la
            // duración según la distancia (1000 * S * 0.8 ms) y en rutas largas
            // el mapa tarda varios segundos en moverse, como si no pasara nada
            estado.mapa.flyTo(estado.posActual, 15, { duration: 1.5 });
            // Decir qué reportó el navegador: si la precisión es de cientos de
            // metros, la ubicación es aproximada (WiFi/IP, sin GPS)
            const [lat, lng] = estado.posActual;
            const prec = Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null;
            mostrarInfoGPS(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}` +
                (prec !== null ? ` · precisión ±${prec} m` : '') +
                (prec !== null && prec > 100 ? ' (ubicación aproximada)' : ''));
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
    actualizarMarcadorUsuario(pos.coords.accuracy);

    // Acumular la traza (y la distancia) solo mientras dura la actividad
    registrarPunto(estado.posActual);

    // ¿Hay alguna ruta cerca? → dispara el prompt
    evaluarProximidad();
}
