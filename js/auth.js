import { supabase } from '../supabase.js';
import { log } from './logs.js';

export function iniciarAutenticacion() {
    const authModal = document.getElementById('auth-modal');
    const closeAuthModal = document.getElementById('close-auth-modal');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');

    const loginNavBtn = document.getElementById('login-nav-btn');
    const registerNavBtn = document.getElementById('register-nav-btn');
    const logoutNavBtn = document.getElementById('logout-nav-btn');
    const logoutLi = document.getElementById('logout-li');
    const userAvatarContainer = document.getElementById('user-avatar-container');
    const userAvatarImg = document.getElementById('user-avatar-img');

    // Funciones para abrir y cerrar modal
    function abrirModal() {
        if (authModal) {
            authModal.style.display = 'flex';
            authModal.classList.remove('map-hidden');
        }
    }

    function cerrarModal() {
        if (authModal) {
            authModal.style.display = 'none';
            authModal.classList.add('map-hidden');
        }
    }

    // Botón de cerrar (la 'X')
    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarModal();
        });
    }

    // Cerrar al hacer clic en el fondo oscuro del modal
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                cerrarModal();
            }
        });
    }

    if (loginNavBtn) {
        loginNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginFormContainer) loginFormContainer.classList.remove('hidden');
            if (registerFormContainer) registerFormContainer.classList.add('hidden');
            abrirModal();
        });
    }

    if (registerNavBtn) {
        registerNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerFormContainer) registerFormContainer.classList.remove('hidden');
            if (loginFormContainer) loginFormContainer.classList.add('hidden');
            abrirModal();
        });
    }

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginFormContainer) loginFormContainer.classList.add('hidden');
            if (registerFormContainer) registerFormContainer.classList.remove('hidden');
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerFormContainer) registerFormContainer.classList.add('hidden');
            if (loginFormContainer) loginFormContainer.classList.remove('hidden');
        });
    }

    // Manejo de Sesión Actual en UI
    async function actualizarUIUsuario() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            if (loginNavBtn) loginNavBtn.style.display = 'none';
            if (registerNavBtn) registerNavBtn.style.display = 'none';
            if (logoutLi) logoutLi.classList.remove('hidden');

            const metadata = session.user.user_metadata;
            if (userAvatarContainer && userAvatarImg) {
                if (metadata && metadata.avatar_url) {
                    userAvatarImg.src = metadata.avatar_url;
                } else {
                    userAvatarImg.src = "https://via.placeholder.com/80";
                }
                userAvatarImg.style.display = 'block';
                userAvatarContainer.style.display = 'block';
            }
        } else {
            if (loginNavBtn) loginNavBtn.style.display = 'block';
            if (registerNavBtn) registerNavBtn.style.display = 'block';
            if (logoutLi) logoutLi.classList.add('hidden');
            if (userAvatarContainer) userAvatarContainer.style.display = 'none';
        }
    }

    // Registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;
            const nombre = document.getElementById('reg-nombre').value;
            const apellido = document.getElementById('reg-apellido').value;
            const avatarFile = document.getElementById('reg-avatar').files[0];

            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden.');
                return;
            }

            let avatarUrl = '';
            try {
                if (avatarFile) {
                    const fileExt = avatarFile.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(fileName, avatarFile);

                    if (!uploadError) {
                        const { data: publicURLData } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(fileName);
                        avatarUrl = publicURLData.publicUrl;
                    }
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: nombre,
                            last_name: apellido,
                            avatar_url: avatarUrl
                        }
                    }
                });

                if (error) throw error;

                log('registro');
                alert('¡Registro exitoso! Por favor inicia sesión.');
                registerForm.reset();
                if (registerFormContainer) registerFormContainer.classList.add('hidden');
                if (loginFormContainer) loginFormContainer.classList.remove('hidden');
            } catch (err) {
                alert('Error en el registro: ' + err.message);
            }
        });
    }

    // Inicio de Sesión
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                log('login');
                alert('¡Bienvenido de nuevo!');
                cerrarModal();
                loginForm.reset();
                actualizarUIUsuario();
            } catch (err) {
                alert('Error al iniciar sesión: ' + err.message);
            }
        });
    }

    // Cerrar Sesión
    if (logoutNavBtn) {
        logoutNavBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            log('logout');
            actualizarUIUsuario();
            alert('Has cerrado sesión correctamente.');
        });
    }

    // Verificar sesión al cargar
    actualizarUIUsuario();
}
