// Logs de la página: captura de crashes, eventos y subida a Supabase Storage.
// Ahora encapsulado en una clase Logger para mejor testabilidad y organización.

import { supabase } from '../supabase.js';
import { SUPABASE_URL, SUPABASE_KEY } from '../supabase-config.js';
import { estado } from './estado.js';

const BUCKET = 'logs';
const DEFAULT_INTERVALO_MS = 60_000; // subida automática cada X milisegundos
const DEFAULT_MAX_BUFFER = 300;      // tope de eventos en memoria si la subida falla

class Logger {
    constructor({ bucket = BUCKET, intervaloMs = DEFAULT_INTERVALO_MS, maxBuffer = DEFAULT_MAX_BUFFER } = {}) {
        this.bucket = bucket;
        this.intervaloMs = intervaloMs;
        this.maxBuffer = maxBuffer;

        this.sesion = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `s-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

        this.buffer = [];
        this.parte = 0;
        this.subiendo = false;
        this._intervalId = null;
        this._started = false;

        // Bind public methods for convenience
        this.log = this.log.bind(this);
        this.subir = this.subir.bind(this);
        this.iniciar = this.iniciar.bind(this);
        this._onErrorEvent = this._onErrorEvent.bind(this);
        this._onUnhandledRejection = this._onUnhandledRejection.bind(this);
        this._onPageHide = this._onPageHide.bind(this);
    }

    // Registra un evento. Nunca lanza errores.
    log(tipo, detalle = {}) {
        try {
            this.buffer.push({
                ...detalle,
                t: new Date().toISOString(),
                tipo,
                pagina: (location.hash || '') + location.pathname
            });
            if (this.buffer.length > this.maxBuffer) this.buffer.shift();
        } catch (e) {
            console.warn('[logger] error al loggear:', e);
        }
    }

    // Estado de la app para el heartbeat
    resumenApp() {
        try {
            const act = estado.actividad || {};
            return {
                activa: !!act.activa,
                actividad: act.tipo,
                segundos: act.seconds,
                dist_m: Math.round(estado.distanciaTotal || 0),
                pos: estado.posActual
                    ? [Math.round(estado.posActual[0] * 1e5) / 1e5,
                       Math.round(estado.posActual[1] * 1e5) / 1e5]
                    : null
            };
        } catch (e) {
            return {};
        }
    }

    // Sube el buffer como JSON; si useKeepalive=true usa fetch keepalive
    async subir(useKeepalive = false) {
        if (this.subiendo || this.buffer.length === 0) return;
        this.subiendo = true;

        const eventos = this.buffer.splice(0);
        const nombre = `${this.sesion}/parte-${String(this.parte).padStart(4, '0')}.json`;
        const cuerpo = JSON.stringify({ sesion: this.sesion, eventos }, null, 2);
        let ok = false;

        try {
            if (useKeepalive) {
                const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${this.bucket}/${nombre}`, {
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
                const { error } = await supabase.storage.from(this.bucket)
                    .upload(nombre, new Blob([cuerpo], { type: 'application/json' }),
                        { upsert: true, contentType: 'application/json' });
                ok = !error;
                if (error) console.warn('[logger] subida rechazada:', error.message);
            }
        } catch (e) {
            console.warn('[logger] subida fallida:', e && e.message);
        }

        if (ok) {
            this.parte++;
            console.info(`[logger] ${eventos.length} eventos → ${nombre}`);
        } else {
            // Devolver los eventos al buffer (se conservan los más recientes)
            this.buffer = [...eventos, ...this.buffer].slice(-this.maxBuffer);
        }
        this.subiendo = false;
    }

    // Handlers de eventos globales
    _onErrorEvent(e) {
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

    _onUnhandledRejection(e) {
        try {
            const r = e.reason;
            this.log('crash-promesa', { msg: String((r && (r.message || r)) || r) });
            this.subir();
        } catch (ex) {
            console.warn('[logger] fallo manejando unhandledrejection', ex);
        }
    }

    _onPageHide() {
        // Intento final con keepalive
        this.subir(true);
    }

    // Inicia la captura y heartbeat
    iniciar() {
        if (this._started) return;
        this._started = true;

        addEventListener('error', this._onErrorEvent, true);
        addEventListener('unhandledrejection', this._onUnhandledRejection);

        this.log('carga-pagina', {
            ref: document.referrer || null,
            pantalla: `${screen.width}x${screen.height}`,
            navegador: navigator.userAgent.slice(0, 80)
        });

        // Heartbeat periódico
        this._intervalId = setInterval(() => {
            this.log('heartbeat', this.resumenApp());
            this.subir();
        }, this.intervaloMs);

        addEventListener('pagehide', this._onPageHide);

        console.info(`[logger] activo · subida cada ${this.intervaloMs / 1000} s · sesión ${this.sesion}`);
    }

    // Debug / inspección
    ver() {
        return {
            sesion: this.sesion,
            parte: this.parte,
            subiendo: this.subiendo,
            buf: this.buffer.slice()
        };
    }
}

// Singleton
export const logger = new Logger();

// API compatible con la versión previa
export function log(tipo, detalle = {}) { return logger.log(tipo, detalle); }
export function subir(useKeepalive = false) { return logger.subir(useKeepalive); }
export function iniciarLogs() { return logger.iniciar(); }

// Exponer utilidad para depuración desde la consola
globalThis.__logs = {
    log: logger.log,
    subir: logger.subir,
    iniciar: logger.iniciar,
    ver: () => logger.ver()
};
