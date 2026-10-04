class StateStore {
    constructor() {
        // Mapa y marcadores (Leaflet)
        this.mapa = null;
        this.userMarker = null;
        this.userIcon = null;

        // Seguimiento de posición (GPS)
        this.posActual = null;      // última posición conocida [lat, lng]
        this.seguimientoId = null;  // watchId del GPS

        // Trazado del recorrido (la línea por donde pasaste)
        this.trazaCoords = [];
        this.trazaLinea = null;

        // Distancia acumulada durante la actividad actual (metros)
        this.distanciaTotal = 0;

        // Actividad en curso (trote o carrera)
        this.actividad = {
            activa: false,
            rutaIdx: null,
            tipo: null,
            seconds: 0,
            interval: null
        };

        // Detección de proximidad: ¿el usuario está sobre/ cerca de una ruta?
        this.rutaDetectada = null;
        this.ultimaDeteccion = 0;
        this.promptVisible = false;

        // Popups de Leaflet registrados por ruta (se llenan al dibujarlos en
        // abrirMapa). El popup vive fuera del `document` hasta que se abre,
        // así que los guardamos aquí para poder actualizarlos aunque estén cerrados.
        this.popupsRuta = {};
    }

    resetActividad() {
        this.trazaCoords = [];
        this.distanciaTotal = 0;
        this.actividad = {
            activa: false,
            rutaIdx: null,
            tipo: null,
            seconds: 0,
            interval: null
        };
    }

    iniciarActividad(rutaIdx, tipo) {
        this.actividad.activa = true;
        this.actividad.rutaIdx = rutaIdx;
        this.actividad.tipo = tipo;
        this.actividad.seconds = 0;
        this.trazaCoords = [];
        this.distanciaTotal = 0;
    }

    detenerActividad() {
        this.actividad.activa = false;
        this.actividad.tipo = null;
        if (this.actividad.interval) {
            clearInterval(this.actividad.interval);
            this.actividad.interval = null;
        }
    }

    setRutaDetectada(rutaIdx) {
        this.rutaDetectada = rutaIdx;
    }

    setPopupRuta(rutaIdx, popup) {
        this.popupsRuta[rutaIdx] = popup;
    }

    getPopupRuta(rutaIdx) {
        return this.popupsRuta[rutaIdx];
    }
}

export const estado = new StateStore();
export { StateStore };