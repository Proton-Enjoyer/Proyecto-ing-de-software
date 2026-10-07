// js/core/base.js — abstracciones compartidas del dominio.
//
// Este módulo NO importa nada del proyecto: es la capa base de la que heredan
// el bus de eventos, los servicios, el estado y los repositorios. Al no tener
// dependencias, cualquier módulo puede importarlo sin crear ciclos.
//
// Contiene:
//   bus             : bus único de eventos (Observer) de la aplicación.
//   EmisorEventos   : base del patrón Observer (suscribir / emitir / notificar).
//   ServicioBase    : base común de los servicios (estado compartido + eventos).
//   Repositorio     : contrato abstracto de persistencia.

/**
 * Observer: objeto que mantiene el registro de sus suscriptores y los notifica
 * cuando ocurre un evento. Quien produce el evento no necesita saber quién
 * escucha, así que los servicios no dependen del logger (ni al revés).
 */
export class EmisorEventos {
    // Privado de verdad: nadie fuera de la clase puede tocar la lista.
    #oyentes = new Map();

    /**
     * Registra un oyente para un evento.
     * @returns {Function} función para cancelar la suscripción.
     */
    suscribir(evento, oyente) {
        if (typeof oyente !== 'function') return () => {};
        if (!this.#oyentes.has(evento)) this.#oyentes.set(evento, new Set());
        this.#oyentes.get(evento).add(oyente);
        return () => this.cancelar(evento, oyente);
    }

    /** Da de baja a un oyente de un evento. */
    cancelar(evento, oyente) {
        const grupo = this.#oyentes.get(evento);
        if (!grupo) return;
        grupo.delete(oyente);
        if (grupo.size === 0) this.#oyentes.delete(evento);
    }

    /**
     * Notifica a los suscriptores del evento. Itera sobre una copia para que un
     * suscriptor pueda cancelar su suscripción durante la notificación, y aísla
     * los fallos: un suscriptor que lanza no rompe la emisión para los demás.
     */
    emitir(evento, datos) {
        const grupo = this.#oyentes.get(evento);
        if (!grupo || grupo.size === 0) return;
        for (const oyente of [...grupo]) {
            try {
                oyente(datos);
            } catch (e) {
                console.warn(`[eventos] el suscriptor de "${evento}" falló`, e);
            }
        }
    }
}

/**
 * Bus de eventos de la aplicación (Mediator). Es el único punto por el que un
 * servicio publica eventos, de modo que los servicios no se conocen entre sí:
 * el Logger se suscribe aquí una vez y recibe los eventos de todos.
 */
export const bus = new EmisorEventos();

/** Evento único que usan los servicios para reportar lo que hacen. */
export const EVENTO = 'evento';

/**
 * Base de todos los servicios de la aplicación.
 *
 * Aporta el acceso al estado compartido (siempre inyectado por el constructor,
 * nunca creado aquí: es el único punto de instanciación) y el método `registrar`
 * con el que un servicio publica un evento sin conocer al logger.
 */
export class ServicioBase extends EmisorEventos {
    #store;

    constructor(store) {
        super();
        this.#store = store;
    }

    /** Estado compartido de la aplicación. */
    get estado() {
        return this.#store;
    }

    set estado(store) {
        this.#store = store;
    }

    /** Publica un evento de la aplicación (quien escucha es el Logger). */
    registrar(tipo, detalle = {}) {
        bus.emitir(EVENTO, { tipo, ...detalle });
    }
}

/**
 * Contrato de persistencia. Una subclase implementa guardar / leer / limpiar
 * sobre un almacenamiento concreto (localStorage, Supabase, memoria...).
 */
export class Repositorio {
    constructor(nombre) {
        this.nombre = nombre;
    }

    guardar() {
        throw new Error(`${this.constructor.name} debe implementar guardar()`);
    }

    leer() {
        throw new Error(`${this.constructor.name} debe implementar leer()`);
    }

    limpiar() {
        throw new Error(`${this.constructor.name} debe implementar limpiar()`);
    }
}