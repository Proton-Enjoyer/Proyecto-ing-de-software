// Estado global compartido por todos los módulos.
// Un único objeto mutable centraliza el estado (mapa, GPS, actividad…)
// y evita el acoplamiento oculto de las variables globales sueltas.

export const estado = {
    // Mapa y marcadores (Leaflet)
    mapa: null,
    userMarker: null,
    userIcon: null,

    // Seguimiento de posición (GPS)
    posActual: null,      // última posición conocida [lat, lng]
    seguimientoId: null,  // watchId del GPS

    // Trazado del recorrido (la línea por donde pasaste)
    trazaCoords: [],
    trazaLinea: null,

    // Distancia acumulada durante la actividad actual (metros)
    distanciaTotal: 0,

    // Actividad en curso (trote o carrera)
    actividad: {
        activa: false,
        rutaIdx: null,
        tipo: null,
        seconds: 0,
        interval: null
    },

    // Detección de proximidad: ¿el usuario está sobre/ cerca de una ruta?
    rutaDetectada: null,
    ultimaDeteccion: 0,
    promptVisible: false,

    // Popups de Leaflet registrados por ruta (se llenan al dibujarlos en
    // abrirMapa). El popup vive fuera del `document` hasta que se abre,
    // así que los guardamos aquí para poder actualizarlos aunque estén cerrados.
    popupsRuta: {}
};
