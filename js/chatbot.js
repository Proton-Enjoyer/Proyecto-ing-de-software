// js/chatbot.js

export function inicializarChatbot() {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const container = document.getElementById('chatbot-container');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const inputField = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');

    if (!toggleBtn || !container) return;

    // Abrir y cerrar la ventana del chat
    toggleBtn.addEventListener('click', () => {
        container.classList.toggle('hidden');
    });

    closeBtn.addEventListener('click', () => {
        container.classList.add('hidden');
    });

    // Función para enviar mensaje a Gemini
    async function enviarMensaje() {
        const texto = inputField.value.trim();
        if (!texto) return;

        // Renderizar el mensaje del usuario
        messagesContainer.innerHTML += `<div class="user-msg">${texto}</div>`;
        inputField.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mostrar indicador de carga
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'bot-msg';
        loadingDiv.innerText = 'Escribiendo...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // ¡IMPORTANTE! Coloca aquí tu API Key real de Google AI Studio
            const API_KEY = "AQ.Ab8RN6KDLUeCm8iHsl303P_S5u8INBPlxdcXonrnP_SepdKtZQ"; 
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Eres el asistente virtual de RunWell, una aplicación web de bienestar, rutas y seguimiento de actividades físicas. Responde de forma breve, concisa y amigable al usuario: ${texto}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                loadingDiv.innerText = data.candidates[0].content.parts[0].text;
            } else {
                console.error('Respuesta inesperada de la API:', data);
                loadingDiv.innerText = 'Ups, la API no devolvió una respuesta válida. Revisa tu API Key.';
            }
        } catch (error) {
            console.error('Error con Gemini API:', error);
            loadingDiv.innerText = 'Ups, ocurrió un error de conexión con el asistente.';
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', enviarMensaje);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensaje();
    });
}
