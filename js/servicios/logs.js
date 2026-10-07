// js/servicios/logs.js — Captura de eventos y crashes de la página, con subida a Supabase.
//
// Logger es un suscriptor del bus de eventos: los servicios publican con
// `registrar(...)` y este servicio los guarda en un buffer. También se suscribe
// a los eventos globales del navegador (error, unhandledrejection, pagehide),
// que es donde entran los crashes.
//
// Los eventos se suben como JSON por sesión al bucket `logs` de Supabase Storage:
// cada `intervaloMs`, de inmediato ante un crash y al cerrar la pestaña
// (`fetch` con `keepalive`). Si la subida falla, los eventos se conservan en el
// buffer y se reintentan; el fallo es silencioso en pantalla (solo consola) para
// no degradar la experiencia del usuario.

import { supabase } from '../supabase/supabase.js';
import { SUPABASE_URL, SUPABASE_KEY } from '../supabase/supabase-config.js';
import { estado } from '../core/estado.js';
import { ServicioBase, bus, EVENTO } from '../core/base.js';

const BUCKET = 'logs';
const DEFAULT_INTERVALO_MS = 60_000; // subida automática cada X milisegundos
const DEFAULT_MAX_BUFFER = 300;      // tope de eventos en memoria si la subida falla

export class Logger extends ServicioBase {
    #bucket;
    #intervaloMs;
    #maxBuffer;
    #sesion;
    #buffer = [];
    #parte = 0;
    #subiendo = false;
    #intervalId = null;
    #started = false;
    #desuscribirBus;

    // Callbacks de los eventos globales del navegador, ya enlazados a `this`.
    #onErrorEvent = (e) => this.#manejarErrorEvent(e);
    #onUnhandledRejection = (e) => this.#manejarRechazo(e);
    #onPageHide = () => this.subir(true);

    constructor(store = estado, opciones = {}) {
        const {
            bucket = BUCKET,
            intervaloMs = DEFAULT_INTERVALO_MS,
            maxBuffer = DEFAULT_MAX_BUFFER
        } = opciones;
        super(store);

        this.#bucket = bucket;
        this.#intervaloMs = intervaloMs;
        this.#maxBuffer = maxBuffer;
        this.#sesion = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `s-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

        // El logger también es un suscriptor del bus de eventos de la app.
        this.#desuscribirBus = bus.suscribir(EVENTO, (evento) => this.log(
            evento.tipo,
            evento
        ));
    }

    // --- Buffer de eventos ---

    /**
     * Registra un evento. Nunca lanza errores: el logging no puede romper la app.
     */
    log(tipo, detalle = {}) {
        try {
            this.#buffer.push({
                ...detalle,
                t: new Date().toISOString(),
                tipo,
                pagina: (location.hash || '') + location.pathname
            });
            if (this.#buffer.length > this.#maxBuffer) this.#buffer.shift();
        } catch (e) {
            console.warn('[logger] error al loggear:', e);
        }
    }

    /** Estado de la app para el heartbeat. */
    resumenApp() {
        try {
            const act = this.estado.actividad || {};
            return {
                activa: !!act.activa,
                actividad: act.tipo,
                segundos: act.seconds,
                dist_m: Math.round(this.estado.distanciaTotal || 0),
                pos: this.estado.posActual
                    ? [Math.round(this.estado.posActual[0] * 1e5) / 1e5,
                       Math.round(this.estado.posActual[1] * 1e5) / 1e5]
                    : null
            };
        } catch (e) {
            return {};
        }
    }

    // --- Subida a Supabase Storage ---

    /**
     * Sube el buffer como JSON. Con `useKeepalive` usa `fetch` para poder subir
     * durante el cierre de la pestaña.
     */
    async subir(useKeepalive = false) {
        if (this.#subiendo || this.#buffer.length === 0) return;
        this.#subiendo = true;

        const eventos = this.#buffer.splice(0);
        const nombre = `${this.#sesion}/parte-${String(this.#parte).padStart(4, '0')}.json`;
        const cuerpo = JSON.stringify({ sesion: this.#sesion, eventos }, null, 2);
        let ok = false;

        try {
            if (useKeepalive) {
                const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${this.#bucket}/${nombre}`, {
                    method: 'POST',
                    headers: {
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'x-upsert': 'true'
                    },
                    body: cuerpo,
                    keepalive: true
                });
                ok = r.ok;
                if (!r.ok) console.warn('[logger] subida rechazada:', r.status);
            } else {
                const { error } = await supabase.storage.from(this.#bucket)
                    .upload(nombre, new Blob([cuerpo], { type: 'application/json' }),
                        { upsert: true, contentType: 'application/json' });
                ok = !error;
                if (error) console.warn('[logger] subida rechazada:', error.message);
            }
        } catch (e) {
            console.warn('[logger] subida fallida:', e && e.message);
        }

        if (ok) {
            this.#parte++;
            console.info(`[logger] ${eventos.length} eventos → ${nombre}`);
        } else {
            // Devolver los eventos al buffer (se conservan los más recientes)
            this.#buffer = [...eventos, ...this.#buffer].slice(-this.#maxBuffer);
        }
        this.#subiendo = false;
    }

    // --- Eventos globales del navegador (crashes) ---

    #manejarErrorEvent(e) {
        try {
            if (e.target && e.target !== window && (e.target.src || e.target.href)) {
                this.log('crash-recurso', {
                    etiqueta: e.target.tagName,
                    src: String(e.target.src || e.target.href).slice(-120)
                });
            } else {
                this.log('crash', {
                    msg: String((e && (e.message || e.error)) || 'sin mensaje'),
                    archivo: String((e && e.filename) || '').split('/').pop(),
                    linea: e.lineno,
                    col: e.colno
                });
            }
            // Subir inmediatamente en caso de crash
            this.subir();
        } catch (ex) {
            console.warn('[logger] fallo manejando error event', ex);
        }
    }

    #manejarRechazo(e) {
        try {
            const r = e.reason;
            this.log('crash-promesa', { msg: String((r && (r.message || r)) || r) });
            this.subir();
        } catch (ex) {
            console.warn('[logger] fallo manejando unhandledrejection', ex);
        }
    }

    // --- Arranque y ciclo de vida ---

    /** Inicia la captura de crashes y el heartbeat periódico. */
    iniciar() {
        if (this.#started) return;
        this.#started = true;

        addEventListener('error', this.#onErrorEvent, true);
        addEventListener('unhandledrejection', this.#onUnhandledRejection);

        this.log('carga-pagina', {
            ref: document.referrer || null,
            pantalla: `${screen.width}x${screen.height}`,
            navegador: navigator.userAgent.slice(0, 80)
        });

        // Heartbeat periódico
        this.#intervalId = setInterval(() => {
            this.log('heartbeat', this.resumenApp());
            this.subir();
        }, this.#intervaloMs);

        addEventListener('pagehide', this.#onPageHide);

        console.info(`[logger] activo · subida cada ${this.#intervaloMs / 1000} s · sesión ${this.#sesion}`);
    }

    /** Detiene el heartbeat y la captura de eventos del navegador. */
    detener() {
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = null;
        }
        removeEventListener('error', this.#onErrorEvent, true);
        removeEventListener('unhandledrejection', this.#onUnhandledRejection);
        removeEventListener('pagehide', this.#onPageHide);
        if (this.#desuscribirBus) this.#desuscribirBus();
        this.#started = false;
    }

    /** Estado del logger, para depuración desde la consola. */
    ver() {
        return {
            sesion: this.#sesion,
            parte: this.#parte,
            subiendo: this.#subiendo,
            buf: this.#buffer.slice()
        };
    }
}

// --- Instancia singleton y API pública delegando en ella ---

// Singleton: el logger es único en la aplicación.
export const logger = new Logger();

// Compatibilidad con la API de funciones que usan el resto de módulos.
export function log(tipo, detalle = {}) {
    return logger.log(tipo, detalle);
}

export function subir(useKeepalive = false) {
    return logger.subir(useKeepalive);
}

export function iniciarLogs() {
    return logger.iniciar();
}

// Utilidad de depuración desde la consola del navegador.
globalThis.__logs = {
    log: (tipo, detalle = {}) => logger.log(tipo, detalle),
    subir: (useKeepalive = false) => logger.subir(useKeepalive),
    iniciar: () => logger.iniciar(),
    ver: () => logger.ver()
};