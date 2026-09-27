// js/chatbot.js

export function inicializarChatbot() {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const container = document.getElementById('chatbot-container');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const inputField = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');

    if (!toggleBtn || !container) return;

    toggleBtn.addEventListener('click', () => {
        container.classList.toggle('hidden');
    });

    closeBtn.addEventListener('click', () => {
        container.classList.add('hidden');
    });

    async function enviarMensaje() {
        const inputField = document.getElementById('chatbot-input');
        const messagesContainer = document.getElementById('chatbot-messages');
        const texto = inputField.value.trim();
        
        if (!texto) return;

        // Mostrar mensaje del usuario
        const userDiv = document.createElement('div');
        userDiv.className = 'user-msg';
        userDiv.innerText = texto;
        messagesContainer.appendChild(userDiv);
        
        inputField.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mostrar indicador de carga temporal del bot
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'bot-msg';
        loadingDiv.innerText = 'Escribiendo...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        let respuestaFinal = "";
        try {
            respuestaFinal = generarRespuestaLocal(texto);
        } catch (error) {
            respuestaFinal = "¡Hola! Como asistente de RunWell te ayudo con tus rutas y entrenamientos.";
        }

        loadingDiv.innerText = respuestaFinal;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function consultarGemini(apiKey, mensajeUsuario) {
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
            
            return generarRespuestaLocal(mensajeUsuario);
        } catch (error) {
            console.error('Error en la conexión con la API:', error);
            return generarRespuestaLocal(mensajeUsuario);
        }
    }
function generarRespuestaLocal(pregunta) {
        const p = pregunta.toLowerCase();
        
        if (p.includes('ruta') || p.includes('mapa') || p.includes('camino') || p.includes('corta')) {
            return "Analizando las rutas guardadas en RunWell... La ruta más eficiente actual registra 4.2 km con un tiempo estimado de 22 minutos. ¡Ideal para un trote constante!";
        } else if (p.includes('entreno') || p.includes('ejercicio') || p.includes('rutina') || p.includes('hacer')) {
            return "Para tu sesión de hoy te sugiero un calentamiento dinámico de 5 minutos, seguido de carrera continua a ritmo moderado y estiramientos al finalizar.";
        } else if (p.includes('distancia') || p.includes('km') || p.includes('metro')) {
            return "El registro de distancia se actualiza en tiempo real mediante el GPS integrado de la aplicación web. Puedes ver el acumulado semanal en tu perfil.";
        } else if (p.includes('hola') || p.includes('saludos') || p.includes('ayuda')) {
            return "¡Hola! Soy tu asistente virtual de RunWell. Estoy aquí para ayudarte a gestionar tus trayectos, metas de salud y rutinas de entrenamiento.";
       } else {
            return "Hmm, no estoy seguro de eso. Pero puedo ayudarte con:\n• Rutas y mapas\n• Planes de entrenamiento\n• Distancias recorridas";
        }
    }

    sendBtn.addEventListener('click', enviarMensaje);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensaje();
    });
}
function crearSugerenciasRapidas() {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        // Evitar duplicar los botones si ya existen
        if (document.getElementById('chatbot-chips')) return;

        const chipsContainer = document.createElement('div');
        chipsContainer.id = 'chatbot-chips';
        chipsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0;';

        const sugerencias = [
            "¿Cuál es la ruta más corta?",
            "Ver mi entrenamiento",
            "¿Cómo mido la distancia?"
        ];

        sugerencias.forEach(texto => {
            const btn = document.createElement('button');
            btn.innerText = texto;
            btn.style.cssText = 'background: rgba(255, 204, 0, 0.2); border: 1px solid #ffcc00; color: #111; padding: 6px 10px; border-radius: 12px; font-size: 0.75rem; cursor: pointer; font-weight: 500;';
            
            btn.onmouseover = () => btn.style.opacity = '0.7';
            btn.onmouseout = () => btn.style.opacity = '1';
            
            btn.onclick = () => {
                document.getElementById('chatbot-input').value = texto;
                enviarMensaje();
                chipsContainer.remove();
            };

            chipsContainer.appendChild(btn);
        });

        messagesContainer.appendChild(chipsContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Llamar a los botones justo al cargar o abrir el chat
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(crearSugerenciasRapidas, 500);
    });
