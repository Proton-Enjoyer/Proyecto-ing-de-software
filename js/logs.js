// Logs de la página: qué pasa y qué hace la app.
//
// - Captura crashes (errores JS no manejados, promesas rechazadas, recursos rotos)
// - Registra eventos de uso (secciones, mapa, actividad, login, GPS)
// - Sube todo a Supabase Storage (bucket "logs") cada INTERVALO_MS, de forma
//   inmediata al producirse un crash y al cerrar la pestaña.
//
// Regla del proyecto: los fallos de subida son silenciosos en pantalla
// (solo consola); los logs jamás interrumpen al usuario.

import { supabase } from '../supabase.js';
import { SUPABASE_URL, SUPABASE_KEY } from '../supabase-config.js';
import { estado } from './estado.js';

const BUCKET = 'logs';
const INTERVALO_MS = 60_000; // subida automática cada X milisegundos
const MAX_BUFFER = 300;      // tope de eventos en memoria si la subida falla

const sesion = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

let buffer = [];
let parte = 0;   // número de archivo dentro de la sesión (avanza si la subida sale bien)
let subiendo = false;

// Registra un evento. Nunca lanza errores (aunque falle el detalle).
export function log(tipo, detalle = {}) {
    try {
        buffer.push({
            t: new Date().toISOString(),
            tipo,
            pagina: (location.hash || '') + location.pathname,
            ...detalle
        });
        if (buffer.length > MAX_BUFFER) buffer.shift();
    } catch (e) {
        console.warn('[logs]', e);
    }
}

// Estado de la app para el heartbeat ("qué está haciendo la app ahora")
function resumenApp() {
    try {
        const act = estado.actividad;
        return {
            activa: act.activa,
            tipo: act.tipo,
            segundos: act.seconds,
            dist_m: Math.round(estado.distanciaTotal),
            pos: estado.posActual
                ? [Math.round(estado.posActual[0] * 1e5) / 1e5,
                   Math.round(estado.posActual[1] * 1e5) / 1e5]
                : null
        };
    } catch (e) {
        return {};
    }
}

// Sube el buffer como un JSON por parte (logs/{sesion}/parte-0000.json).
// Si la subida falla, los eventos vuelven al buffer y se reintentan después.
async function subir(useKeepalive = false) {
    if (subiendo || buffer.length === 0) return;
    subiendo = true;

    const eventos = buffer.splice(0);
    const nombre = `${sesion}/parte-${String(parte).padStart(4, '0')}.json`;
    // Con sangría: el archivo se lee bonito al descargarlo desde el dashboard
    const cuerpo = JSON.stringify({ sesion, eventos }, null, 2);
    let ok = false;

    try {
        if (useKeepalive) {
            // Al cerrar/recargar la pestaña: fetch directo con keepalive para
            // que el navegador complete la petición aunque la página desaparezca
            const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${nombre}`, {
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
            if (!r.ok) console.warn('[logs] subida rechazada:', r.status);
        } else {
            const { error } = await supabase.storage.from(BUCKET)
                .upload(nombre, new Blob([cuerpo], { type: 'application/json' }),
                    { upsert: true, contentType: 'application/json' });
            ok = !error;
            if (error) console.warn('[logs] subida rechazada:', error.message);
        }
    } catch (e) {
        console.warn('[logs] subida fallida:', e && e.message);
    }

    if (ok) {
        parte++;
        console.info(`[logs] ${eventos.length} eventos → ${nombre}`);
    } else {
        // Devolver los eventos al buffer (se conservan los más recientes)
        buffer = [...eventos, ...buffer].slice(-MAX_BUFFER);
    }
    subiendo = false;
}

// Arranca la captura: crashes, heartbeat y subida periódica.
export function iniciarLogs() {
    // Errores JS no manejados y recursos rotos (script/imagen/css)
    addEventListener('error', (e) => {
        if (e.target && e.target !== window && (e.target.src || e.target.href)) {
            log('crash-recurso', {
                etiqueta: e.target.tagName,
                src: String(e.target.src || e.target.href).slice(-120)
            });
        } else {
            log('crash', {
                msg: String((e && (e.message || e.error)) || 'sin mensaje'),
                archivo: String((e && e.filename) || '').split('/').pop(),
                linea: e.lineno,
                col: e.colno
            });
        }
        subir(); // subir de inmediato ante un crash
    }, true);

    // Promesas rechazadas sin catch
    addEventListener('unhandledrejection', (e) => {
        const r = e.reason;
        log('crash-promesa', { msg: String((r && (r.message || r)) || r) });
        subir();
    });

    log('carga-pagina', {
        ref: document.referrer || null,
        pantalla: `${screen.width}x${screen.height}`,
        navegador: navigator.userAgent.slice(0, 80)
    });

    // Cada X tiempo: heartbeat con el estado + subida
    setInterval(() => {
        log('heartbeat', resumenApp());
        subir();
    }, INTERVALO_MS);

    // Al cerrar o recargar: último intento que sobrevive a la muerte de la página
    addEventListener('pagehide', () => subir(true));

    console.info(`[logs] activo · subida cada ${INTERVALO_MS / 1000} s · sesión ${sesion}`);
}

// Depuración desde la consola del navegador: __logs.ver(), __logs.log('x')
globalThis.__logs = {
    log,
    subir,
    iniciar: iniciarLogs,
    ver: () => ({ sesion, parte, subiendo, buf: buffer.slice() })
};
