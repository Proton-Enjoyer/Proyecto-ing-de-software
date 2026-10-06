// js/chatbot.js — Asistente flotante de respuestas rápidas.
//
// Chatbot es un servicio sin estado propio (no necesita el estado compartido):
// hereda de ServicioBase para poder publicar eventos al bus si hace falta.

import { ServicioBase } from './base.js';

const SUGERENCIAS = [
    "¿Cuál es la ruta más corta?",
    "Ver mi entrenamiento",
    "¿Cómo mido la distancia?"
];

export class Chatbot extends ServicioBase {
    constructor(store) {
        super(store);
    }

    /** Elementos del widget (se resuelven una sola vez). */
    #elementos() {
        return {
            toggleBtn: document.getElementById('chatbot-toggle-btn'),
            container: document.getElementById('chatbot-container'),
            closeBtn: document.getElementById('chatbot-close'),
            sendBtn: document.getElementById('chatbot-send'),
            inputField: document.getElementById('chatbot-input'),
            messagesContainer: document.getElementById('chatbot-messages')
        };
    }

    // --- Render de mensajes ---

    /** Añade un mensaje al hilo y deja el scroll al final. */
    #appendMensaje(clase, texto, contenedor) {
        const div = document.createElement('div');
        div.className = clase;
        div.innerText = texto;
        contenedor.appendChild(div);
        contenedor.scrollTop = contenedor.scrollHeight;
        return div;
    }

    /**
     * Procesa el texto del input: muestra el mensaje del usuario, un indicador
     * de escritura y luego la respuesta.
     */
    async enviarMensaje(el) {
        const texto = el.inputField.value.trim();

        if (!texto) return;

        // Mostrar mensaje del usuario
        this.#appendMensaje('user-msg', texto, el.messagesContainer);
        el.inputField.value = '';

        // Mostrar indicador de carga temporal del bot
        const loadingDiv = this.#appendMensaje('bot-msg', 'Escribiendo...', el.messagesContainer);

        let respuestaFinal = "";
        try {
            respuestaFinal = this.generarRespuestaLocal(texto);
        } catch (error) {
            respuestaFinal = "¡Hola! Como asistente de RunWell te ayudo con tus rutas y entrenamientos.";
        }

        loadingDiv.innerText = respuestaFinal;
        el.messagesContainer.scrollTop = el.messagesContainer.scrollHeight;
    }

    /** Respuesta por reglas (sin red): se decide por palabras clave. */
    generarRespuestaLocal(pregunta) {
        const p = pregunta.toLowerCase();

        if (p.includes('ruta') || p.includes('mapa') || p.includes('camino') || p.includes('corta')) {
            return "Analizando las rutas guardadas en RunWell... La ruta más eficiente actual registra 4.2 km con un tiempo estimado de 22 minutos. ¡Ideal para un trote constante!";
        } else if (p.includes('entreno') || p.includes('entrenamiento') || p.includes('ejercicio') || p.includes('rutina') || p.includes('hacer')) {
            return "Para tu sesión de hoy te sugiero un calentamiento dinámico de 5 minutos, seguido de carrera continua a ritmo moderado y estiramientos al finalizar.";
        } else if (p.includes('distancia') || p.includes('km') || p.includes('metro')) {
            return "El registro de distancia se actualiza en tiempo real mediante el GPS integrado de la aplicación web. Puedes ver el acumulado semanal en tu perfil.";
        } else if (p.includes('hola') || p.includes('saludos') || p.includes('ayuda')) {
            return "¡Hola! Soy tu asistente virtual de RunWell. Estoy aquí para ayudarte a gestionar tus trayectos, metas de salud y rutinas de entrenamiento.";
       } else {
            return "Hmm, no estoy seguro de eso. Pero puedo ayudarte con:\n• Rutas y mapas\n• Planes de entrenamiento\n• Distancias recorridas";
        }
    }

    /**
     * Consulta a Gemini. Se conserva como método (queda disponible para
     * conectar un modelo real), pero la app usa `generarRespuestaLocal`.
     */
    async consultarGemini(apiKey, mensajeUsuario) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Eres el asistente virtual de RunWell, una aplicación web de bienestar, rutas y seguimiento de actividades físicas. Responde de forma breve, amable y directa a la siguiente duda del usuario: ${mensajeUsuario}`
                        }]
                    }]
                })
            });

            const data = await response.json();

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            } else if (data.error) {
                console.error("Error devuelto por la API:", data.error.message);
                return "Ups, hubo un pequeño detalle con la clave. Revisa que esté activa en Google AI Studio.";
            }

            return this.generarRespuestaLocal(mensajeUsuario);
        } catch (error) {
            console.error('Error en la conexión con la API:', error);
            return this.generarRespuestaLocal(mensajeUsuario);
        }
    }

    /**
     * Chips de sugerencias rápidas. Evita duplicarse si ya están en el hilo
     * (comprobación por id, como antes).
     */
    crearSugerenciasRapidas(el) {
        if (document.getElementById('chatbot-chips')) return;

        const chipsContainer = document.createElement('div');
        chipsContainer.id = 'chatbot-chips';
        chipsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0;';

        SUGERENCIAS.forEach(texto => {
            const btn = document.createElement('button');
            btn.innerText = texto;
            btn.style.cssText = 'background: rgba(255, 204, 0, 0.2); border: 1px solid #ffcc00; color: #111; padding: 6px 10px; border-radius: 12px; font-size: 0.75rem; cursor: pointer; font-weight: 500;';

            btn.onmouseover = () => btn.style.opacity = '0.7';
            btn.onmouseout = () => btn.style.opacity = '1';

            btn.onclick = () => {
                el.inputField.value = texto;
                this.enviarMensaje(el);
                chipsContainer.remove();
            };

            chipsContainer.appendChild(btn);
        });

        el.messagesContainer.appendChild(chipsContainer);
        el.messagesContainer.scrollTop = el.messagesContainer.scrollHeight;
    }

    /** Conecta los listeners del widget. */
    inicializar() {
        const el = this.#elementos();

        if (!el.toggleBtn || !el.container) return;

        el.toggleBtn.addEventListener('click', () => {
            el.container.classList.toggle('hidden');
        });

        el.closeBtn.addEventListener('click', () => {
            el.container.classList.add('hidden');
        });

        el.sendBtn.addEventListener('click', () => {
            this.enviarMensaje(el);
        });

        el.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.enviarMensaje(el);
        });

        // Los chips se añaden poco después de cargar la página
        setTimeout(() => this.crearSugerenciasRapidas(el), 500);
    }
}

// Singleton del widget.
export const chatbot = new Chatbot();

export function inicializarChatbot() {
    return chatbot.inicializar();
}