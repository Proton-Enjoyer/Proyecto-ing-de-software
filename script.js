// 1. Datos mock (Tus rutas preparadas en Maracaibo siguiendo calles)
const misRutas = [
    {
        nombre: "Ruta LUZ - Nueva Ciencias",
        coords: [
            [10.671893881362836, -71.63622347755296],
            [10.671813398748995, -71.63610647876394],
            [10.67150871437498, -71.63637557597866],
            [10.67156045325246, -71.63679092167965],
            [10.671715669832091, -71.63715361792558],
            [10.671843497051393, -71.63745431124875],
            [10.67210984546982, -71.63799362932379],
            [10.67248598885211, -71.63882295189116],
            [10.672592562722313, -71.63895053997791],
            [10.6730251268708, -71.63896967819093],
            [10.673827563089782, -71.63835087597022],
            [10.673495304603199, -71.63808932039235]
        ],
        plan: { dia: "Viernes", hora: "08:00 AM" }
    },
    {
        nombre: "Ruta Perímetro LUZ",
        coords: [
            [10.669815170813704, -71.64113766750178],
            [10.671003378718003, -71.64267512009474],
            [10.671438712357302, -71.64364449698635],
            [10.671674304416552, -71.644207360988],
            [10.672211070431374, -71.64525572392643]
        ],
        plan: { dia: "Sábado", hora: "04:00 PM" }
    },
    {
        nombre: "Ruta LUZ - Paseo Sur",
        coords: [
            [10.671680655435987, -71.63715233680365],
            [10.666837170435821, -71.64067925181816]
        ],
        plan: { dia: "Domingo", hora: "10:00 AM" }
    },
    {
        nombre: "Ruta LUZ - Detalle Curvo",
        coords: [
            [10.670835799990027, -71.63568818653437],
            [10.669963300577994, -71.63653793963348],
            [10.66818226224542, -71.63840347505828],
            [10.666550863589826, -71.6400862388954],
            [10.665653027026393, -71.63895397269178]
        ],
        plan: { dia: "Viernes", hora: "03:30 PM" }
    }
];

// 2. Elementos del DOM
const mapContainer = document.getElementById('map-container');
const btnVerRutas = document.getElementById('hero-btn');
const btnCerrar = document.getElementById('close-map');
const btnEventos = document.getElementById('eventos-btn');
const heroSection = document.querySelector('.hero');
const eventosSection = document.getElementById('planes-section');
const btnEmpezar = document.getElementById('cta-btn');
const btnInicio = document.getElementById('inicio-btn');
const btnUbicar = document.getElementById('locate-btn');
const btnTheme = document.getElementById('theme-toggle');

// Prompt de proximidad (aparece cuando estás cerca de una ruta)
const promptCercania = document.getElementById('proximity-prompt');
const ppRuta = document.getElementById('pp-ruta');
const ppDist = document.getElementById('pp-dist');
const ppTrote = document.getElementById('pp-trote');
const ppCarrera = document.getElementById('pp-carrera');
const ppIgnorar = document.getElementById('pp-ignorar');
const ppCerrar = document.getElementById('pp-close');

// Panel flotante con distancia y ritmo en vivo mientras hay actividad
const hudPanel = document.getElementById('hud-actividad');
const hudTime = document.getElementById('hud-time');
const hudDist = document.getElementById('hud-dist');
const hudRitmo = document.getElementById('hud-ritmo');

// 3. Estado global
let mapa;
let userMarker = null;
let userIcon = null;

// Seguimiento de posición (permanente mientras la pestaña esté abierta)
let posActual = null;      // última posición conocida [lat, lng]
let seguimientoId = null;  // watchId del GPS

// Trazado del recorrido (la línea por donde pasaste)
let trazaCoords = [];
let trazaLinea = null;

// Distancia acumulada durante la actividad actual (metros)
let distanciaTotal = 0;

// Actividad en curso (trote o carrera)
const TIPOS = { trote: '🏃 Trote', carrera: '⚡ Carrera' };
const actividad = {
    activa: false,
    rutaIdx: null,
    tipo: null,
    seconds: 0,
    interval: null
};

// Detección de proximidad: ¿el usuario está sobre/ cerca de una ruta?
const UMBRAL_RUTA_METROS = 50;    // radio para considerar "llegaste a la ruta"
const COOLDOWN_PROMPT_MS = 20000; // evita repetir el mismo aviso inmediatamente
let rutaDetectada = null;
let ultimaDeteccion = 0;
let promptVisible = false;

// Popups de Leaflet registrados por ruta (se llenan al dibujarlos en abrirMapa).
// El popup vive fuera del `document` hasta que se abre, así que lo buscamos aquí.
let popupsRuta = {};

// Icono del usuario (se crea al usarlo, cuando Leaflet ya cargó)
function iconoUsuario() {
    if (!userIcon) {
        userIcon = L.divIcon({
            className: 'user-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }
    return userIcon;
}

// --- Utilidades ---
function formatoTiempo(totalSeg) {
    const mins = Math.floor(totalSeg / 60);
    const secs = totalSeg % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Distancia en metros entre dos puntos [lat, lng] (fórmula de Haversine)
function distanciaMetros(a, b) {
    const R = 6371000;
    const rad = (grados) => grados * Math.PI / 180;
    const dLat = rad(b[0] - a[0]);
    const dLng = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Ritmo en min/km ("05:42"); sin distancia o sin tiempo → "--:--"
function ritmoMinPorKm(segundos, metros) {
    if (metros < 5 || segundos <= 0) return '--:--';
    const segPorKm = segundos / (metros / 1000);
    return formatoTiempo(Math.round(segPorKm));
}

// Distancia de un punto P a un segmento A→B (todo en metros, sistema local)
function distPuntoSegmento(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    let t = len2 === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));          // t recortado al segmento
    return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

// Distancia mínima en metros entre el usuario y la polilínea de una ruta.
// Proyectamos grados → metros alrededor de la posición del usuario (preciso
// para distancias cortas, que es lo que nos importa aquí).
function distanciaARuta(ruta, pos) {
    const mLat = 111320;                                     // metros por grado de latitud
    const mLng = 111320 * Math.cos(pos[0] * Math.PI / 180);  // metros por grado de longitud
    let min = Infinity;
    for (let i = 0; i < ruta.coords.length - 1; i++) {
        const a = ruta.coords[i];
        const b = ruta.coords[i + 1];
        // El usuario queda en el origen (0,0) del sistema local
        const ax = (a[1] - pos[1]) * mLng, ay = (a[0] - pos[0]) * mLat;
        const bx = (b[1] - pos[1]) * mLng, by = (b[0] - pos[0]) * mLat;
        const d = distPuntoSegmento(0, 0, ax, ay, bx, by);
        if (d < min) min = d;
    }
    return min;
}

// 3.1 Geolocalización: pide permiso y deja el GPS corriendo de forma continua
// Muestra una alerta visual si falla el GPS
function mostrarErrorGPS(mensaje) {
  let alerta = document.getElementById('alerta-gps');
  if (!alerta) {
    alerta = document.createElement('div');
    alerta.id = 'alerta-gps';
    alerta.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 2000;
      background: #ff4d4d; color: white; padding: 12px 18px;
      border-radius: 8px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 0.9rem; transition: opacity 0.3s;
    `;
    document.body.appendChild(alerta);
  }
  alerta.textContent = mensaje;
  alerta.style.opacity = '1';
  setTimeout(() => { alerta.style.opacity = '0'; }, 5000);
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

function iniciarTracking() {
  if (!navigator.geolocation) {
    mostrarErrorGPS('Tu navegador no soporta geolocalización');
    return;
  }
  if (seguimientoId !== null) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => manejarPosicion(pos),
    (error) => manejarErrorGeolocalizacion(error),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );

  seguimientoId = navigator.geolocation.watchPosition(
    (pos) => manejarPosicion(pos),
    (error) => manejarErrorGeolocalizacion(error),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function detenerElSeguimiento() {
  if (seguimientoId !== null) {
    navigator.geolocation.clearWatch(seguimientoId);
    seguimientoId = null;
  }
}

function obtenerUbicacion(central) {
  if (!navigator.geolocation) {
    mostrarErrorGPS('Tu navegador no soporta geolocalización');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      posActual = [pos.coords.latitude, pos.coords.longitude];
      if (marcadorUsuario) {
        marcadorUsuario.setLatLng(posActual);
      } else if (mapa) {
        marcadorUsuario = L.marker(posActual, { icon: iconoUsuario() })
          .addTo(mapa)
          .bindPopup('Estás aquí');
      }

      if (central && mapa) {
        mapa.flyTo(posActual, 15);
      }
    },
    (error) => manejarErrorGeolocalizacion(error),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

// Se ejecuta con CADA actualización del GPS
function manejarPosicion(pos) {
   // Filtro: si la imprecisión del GPS es mayor a 35 metros, ignoramos la lectura
  if (pos.coords.accuracy && pos.coords.accuracy > 35) {
    console.warn(`Lectura descartada por baja precisión (${Math.round(pos.coords.accuracy)}m)`);
    return;
  }

  posActual = [pos.coords.latitude, pos.coords.longitude];

    // Mover (o crear) el marcador del usuario en el mapa
    if (mapa) {
        if (userMarker) {
            userMarker.setLatLng(posActual);
        } else {
            userMarker = L.marker(posActual, { icon: iconoUsuario() })
                .addTo(mapa)
                .bindPopup('Estás aquí');
        }
    }

    // Acumular la traza (y la distancia) solo mientras dura la actividad
    if (actividad.activa) {
        const punto = [posActual[0], posActual[1], Date.now()];
        if (trazaCoords.length > 0) {
            distanciaTotal += distanciaMetros(trazaCoords[trazaCoords.length - 1], punto);
        }
        trazaCoords.push(punto);
        refrescarTraza();
        actualizarPanelActividad();
    }

    // ¿Hay alguna ruta cerca? → dispara el prompt
    evaluarProximidad();
}

// Ubicación puntual (la usa el botón 📍 y al abrir el mapa)
function obtenerUbicacion(centrar) {
    if (!navigator.geolocation) {
        console.warn('Geolocalización no soportada por el navegador');
        return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
        posActual = [pos.coords.latitude, pos.coords.longitude];
        if (userMarker) {
            userMarker.setLatLng(posActual);
        } else if (mapa) {
            userMarker = L.marker(posActual, { icon: iconoUsuario() })
                .addTo(mapa)
                .bindPopup('Estás aquí');
        }
        if (centrar && mapa) {
            mapa.flyTo(posActual, 15);
        }
    }, (err) => {
        console.warn('Error de geolocalización:', err.message);
    }, { enableHighAccuracy: true, maximumAge: 5000 });
}

// 3.2 Colisión: ¿está el usuario sobre alguna ruta?
function evaluarProximidad() {
    // Sin posición, con actividad en curso o con el prompt ya abierto → nada
    if (!posActual || actividad.activa || promptVisible) return;

    let idxMejor = -1;
    let minDist = Infinity;
    misRutas.forEach((ruta, i) => {
        const d = distanciaARuta(ruta, posActual);
        if (d < minDist) {
            minDist = d;
            idxMejor = i;
        }
    });

    if (idxMejor === -1 || minDist > UMBRAL_RUTA_METROS) {
        rutaDetectada = null; // salió del radio: se puede volver a avisar luego
        return;
    }

    // No spamear el mismo aviso
    const ahora = Date.now();
    if (idxMejor === rutaDetectada && ahora - ultimaDeteccion < COOLDOWN_PROMPT_MS) {
        return;
    }

    mostrarPrompt(idxMejor, minDist);
}

function mostrarPrompt(idx, dist) {
    rutaDetectada = idx;
    ultimaDeteccion = Date.now();
    promptVisible = true;
    ppRuta.innerText = misRutas[idx].nombre;
    ppDist.innerText = `A ${Math.round(dist)} m de la ruta`;
    promptCercania.classList.remove('proximity-hidden');
}

function ocultarPrompt() {
    promptVisible = false;
    promptCercania.classList.add('proximity-hidden');
}

function iniciarDesdePrompt(tipo) {
    const idx = rutaDetectada;
    ocultarPrompt();
    if (idx === null) return;
    abrirMapa(idx);                 // mostrar solo esa ruta
    iniciarActividad(idx, tipo);    // arrancar cronómetro + traza
}

// 3.3 Actividad (trote o carrera) con cronómetro
function iniciarActividad(rutaIdx, tipo = 'trote') {
    if (actividad.activa) detenerActividad();

    // Cada actividad empieza con traza y distancia en cero
    trazaCoords = [];
    distanciaTotal = 0;
    refrescarTraza();

    actividad.activa = true;
    actividad.rutaIdx = rutaIdx;
    actividad.tipo = tipo;
    actividad.seconds = 0;
    actividad.interval = setInterval(tickActividad, 1000);

    hudPanel.classList.remove('hud-hidden');
    actualizarPanelActividad();

    refrescarPopup(rutaIdx);
    console.info(`Actividad iniciada → ${TIPOS[tipo]} en ${misRutas[rutaIdx].nombre}`);
}

function detenerActividad() {
  if (!actividad.activa) return;
  const idx = actividad.rutaIdx;
  clearInterval(actividad.interval);
  actividad.interval = null;
  actividad.activa = false;

  // Guardar la actividad finalizada en el historial de localStorage
  guardarEnHistorial({
    ruta: misRutas[idx] ? misRutas[idx].nombre : 'Ruta Libre',
    tipo: actividad.tipo,
    duracionSegundos: actividad.seconds,
    distanciaMetros: distanciaTotal,
    ritmo: ritmoMinPorKm(actividad.seconds, distanciaTotal),
    fecha: new Date().toISOString()
  });

  // Última actualización del panel y ocultarlo
  actualizarPanelActividad();
  hudPanel.classList.add('hud-hidden');

  refrescarPopup(idx);
  console.info(`Actividad detenida -> duración ${formatoTiempo(actividad.seconds)}`);
  actividad.tipo = null;
}

// Funciones para gestionar el almacenamiento persistente
function guardarEnHistorial(sesion) {
  const historial = obtenerHistorial();
  historial.unshift(sesion);
  localStorage.setItem('runwell-historial', JSON.stringify(historial));
}

function obtenerHistorial() {
  const datos = localStorage.getItem('runwell-historial');
  return datos ? JSON.parse(datos) : [];
}

function tickActividad() {
    actividad.seconds++;
    const el = document.getElementById(`time-${actividad.rutaIdx}`);
    if (el) el.innerText = formatoTiempo(actividad.seconds);
    actualizarPanelActividad();
}

// Mantiene el panel flotante (tiempo, km y ritmo) al día
function actualizarPanelActividad() {
    hudTime.innerText = formatoTiempo(actividad.seconds);
    hudDist.innerText = (distanciaTotal / 1000).toFixed(2);
    hudRitmo.innerText = ritmoMinPorKm(actividad.seconds, distanciaTotal);
}

// Sincroniza el popup de una ruta con el estado real de la actividad.
function refrescarPopup(rutaIdx) {
    const root = popupsRuta[rutaIdx];
    if (!root) return;
    const grupoInicio = root.querySelector(`#inicio-${rutaIdx}`);
    const box = root.querySelector(`#timer-box-${rutaIdx}`);
    const lblTipo = root.querySelector(`#tipo-${rutaIdx}`);
    const lblTime = root.querySelector(`#time-${rutaIdx}`);
    if (!grupoInicio || !box) return;

    const enEstaRuta = actividad.activa && actividad.rutaIdx === rutaIdx;
    grupoInicio.style.display = enEstaRuta ? 'none' : 'block';
    box.style.display = enEstaRuta ? 'block' : 'none';

    if (enEstaRuta) {
        if (lblTipo) lblTipo.innerText = TIPOS[actividad.tipo] || '';
        if (lblTime) lblTime.innerText = formatoTiempo(actividad.seconds);
    }
}

// Línea por donde fuiste corriendo (se redibuja con cada posición nueva)
function refrescarTraza() {
    if (!mapa) return;
    if (trazaLinea) {
        mapa.removeLayer(trazaLinea);
        trazaLinea = null;
    }
    if (trazaCoords.length > 1) {
        trazaLinea = L.polyline(trazaCoords, {
            color: '#4285F4',
            weight: 4,
            opacity: 0.85,
            dashArray: '1 12',
            lineCap: 'round'
        }).addTo(mapa);
    }
}

// 4. Abrir mapa y dibujar rutas
function abrirMapa(rutaIndex = null) {
    mapContainer.classList.add('map-active');

    // Inicializar mapa solo la primera vez
    if (!mapa) {
        // Centro en la Facultad Experimental de Ciencias, LUZ
        mapa = L.map('map').setView([10.686, -71.645], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    }

    // Limpiar capas previas
    mapa.eachLayer((layer) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            mapa.removeLayer(layer);
        }
    });
    // FIX: esos marcadores ya no están en el mapa, así que reiniciamos las
    // referencias. Si no, manejarPosicion() movería marcadores "fantasma"
    // y el punto azul del usuario desaparecía al reabrir el mapa.
    userMarker = null;
    trazaLinea = null;
    popupsRuta = {};

    // Dibujar rutas y ajustar vista
    const allCoords = [];

    // Marcadores personalizados con CSS
    const markerStyle = L.divIcon({
        className: 'custom-marker',
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });

    const rutasAProcesar = rutaIndex !== null ? [misRutas[rutaIndex]] : misRutas;

    rutasAProcesar.forEach((ruta, idx) => {
        // Polilínea de la ruta
        L.polyline(ruta.coords, {
            color: '#FFFE42', // Color primario
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(mapa);

        allCoords.push(...ruta.coords);

        const currentIdx = rutaIndex !== null ? rutaIndex : idx;

        // Contenido del popup: elegir tipo o ver el cronómetro
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
            <b>${ruta.nombre}</b><br>
            <div id="inicio-${currentIdx}">
                <button class="popup-btn" data-tipo="trote">🏃 Trote</button>
                <button class="popup-btn" data-tipo="carrera" style="margin-top:6px;">⚡ Carrera</button>
            </div>
            <div id="timer-box-${currentIdx}" style="display:none; margin-top:10px; text-align:center;">
                <span id="tipo-${currentIdx}" class="popup-tipo"></span><br>
                <span id="time-${currentIdx}" style="font-size: 1.5rem; font-weight: bold;">00:00</span><br>
                <button id="stop-${currentIdx}" class="popup-btn" style="background-color: #ff4d4d; color: white;">Detener</button>
            </div>
        `;

        // Botones Trote / Carrera → inician la actividad
        popupContent.querySelectorAll(`#inicio-${currentIdx} button`).forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                iniciarActividad(currentIdx, btn.dataset.tipo);
            });
        });

        // Botón Detener
        popupContent.querySelector(`#stop-${currentIdx}`).addEventListener('click', (e) => {
            e.stopPropagation();
            detenerActividad();
        });

        // Registrar el popup: así podemos actualizarlo aunque esté cerrado
        popupsRuta[currentIdx] = popupContent;

        // Reflejar el estado actual (por si esta ruta ya está activa)
        refrescarPopup(currentIdx);

        // Marcadores de inicio y fin estilizados (comparten el mismo popup)
        L.marker(ruta.coords[0], { icon: markerStyle }).addTo(mapa)
            .bindPopup(popupContent);
        L.marker(ruta.coords[ruta.coords.length - 1], { icon: markerStyle }).addTo(mapa)
            .bindPopup(popupContent);
    });

    if (allCoords.length > 0) {
        mapa.fitBounds(allCoords, { padding: [50, 50] });
    }
    mapa.invalidateSize();

    // Redibujar la traza si había una actividad en curso
    refrescarTraza();

    // Localizar al usuario sin centrar (el mapa se ajusta a las rutas)
    obtenerUbicacion(false);
}

// 5. Listeners generales
btnVerRutas.addEventListener('click', () => abrirMapa());

btnCerrar.addEventListener('click', () => {
    mapContainer.classList.remove('map-active');
});

// Botón para centrar el mapa en la ubicación del usuario
btnUbicar.addEventListener('click', () => obtenerUbicacion(true));

// Prompt de proximidad: elegir qué iniciar
ppTrote.addEventListener('click', () => iniciarDesdePrompt('trote'));
ppCarrera.addEventListener('click', () => iniciarDesdePrompt('carrera'));
ppIgnorar.addEventListener('click', ocultarPrompt);
ppCerrar.addEventListener('click', ocultarPrompt);

// 6. Ocultar sección Hero y mostrar Eventos con animación
btnEventos.addEventListener('click', (e) => {
    e.preventDefault();
    heroSection.classList.add('hidden');
    eventosSection.classList.remove('hidden');
    eventosSection.classList.add('fade-in');

    // Renderizar eventos dinámicamente
    const eventosGrid = document.querySelector('.planes-grid');
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

  if (misRutas[index] && mapa) {
    const coordInicio = misRutas[index].coords[0];
    mapa.flyTo(coordInicio, 16);

    setTimeout(() => {
      if (ventanasEmergentesRuta[index]) {
        L.popup()
          .setLatLng(coordInicio)
          .setContent(ventanasEmergentesRuta[index])
          .openOn(mapa);
      }
    }, 400);
  }
});
        card.appendChild(btnUnirse);
        eventosGrid.appendChild(card);
    });
});

// 7. Funcionalidad botón Inicio (reset)
btnInicio.addEventListener('click', (e) => {
    e.preventDefault();
    heroSection.classList.remove('hidden');
    heroSection.classList.add('fade-in');
    eventosSection.classList.add('hidden');
    mapContainer.classList.remove('map-active');
});

// 8. Funcionalidad botón empezar (ir al mapa directamente)
btnEmpezar.addEventListener('click', () => {
    abrirMapa();
});

// 9. Modo Oscuro (persiste al recargar)
if (localStorage.getItem('runwell-tema') === 'oscuro') {
    document.body.classList.add('dark-theme');
    btnTheme.checked = true;
}

btnTheme.addEventListener('change', () => {
    document.body.classList.toggle('dark-theme', btnTheme.checked);
    localStorage.setItem('runwell-tema', btnTheme.checked ? 'oscuro' : 'claro');
});

// 10. Arrancar el seguimiento de ubicación (esto dispara la detección de rutas)
iniciarTracking();
