// js/servicios/auth.js — Autenticación contra Supabase: registro, login, logout y avatar.
//
// AuthService es un servicio sin estado propio (no necesita el estado
// compartido): hereda de ServicioBase para poder publicar eventos al bus.

import { supabase } from '../supabase/supabase.js';
import { ServicioBase } from '../core/base.js';
import { AVATAR_POR_DEFECTO, BUCKET_AVATARES } from '../core/recursos.js';

export class AuthService extends ServicioBase {
    constructor(store) {
        super(store);
    }

    /** Elementos del modal de autenticación (se resuelven al inicializar). */
    #elementos() {
        return {
            authModal: document.getElementById('auth-modal'),
            closeAuthModal: document.getElementById('close-auth-modal'),
            loginFormContainer: document.getElementById('login-form-container'),
            registerFormContainer: document.getElementById('register-form-container'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            switchToRegister: document.getElementById('switch-to-register'),
            switchToLogin: document.getElementById('switch-to-login'),
            loginNavBtn: document.getElementById('login-nav-btn'),
            registerNavBtn: document.getElementById('register-nav-btn'),
            logoutNavBtn: document.getElementById('logout-nav-btn'),
            logoutLi: document.getElementById('logout-li'),
            userAvatarContainer: document.getElementById('user-avatar-container'),
            userAvatarImg: document.getElementById('user-avatar-img')
        };
    }

    // --- Modal ---

    /** Abre el modal usando la clase "hidden" que emplea el HTML/CSS. */
    #abrirModal(authModal) {
        if (authModal) {
            authModal.classList.remove('hidden');
            authModal.style.display = 'flex';
            authModal.setAttribute('aria-hidden', 'false');
        }
    }

    /** Cierra el modal restaurando la clase "hidden" y los atributos ARIA. */
    #cerrarModal(authModal) {
        if (authModal) {
            authModal.classList.add('hidden');
            authModal.style.display = 'none';
            authModal.setAttribute('aria-hidden', 'true');
        }
    }

    // --- Sesión ---

    /** Refleja en la navbar si hay sesión activa y actualiza el avatar. */
    async actualizarUIUsuario(el) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            if (el.loginNavBtn) el.loginNavBtn.style.display = 'none';
            if (el.registerNavBtn) el.registerNavBtn.style.display = 'none';
            if (el.logoutLi) el.logoutLi.classList.remove('hidden');

            const metadata = session.user.user_metadata;
            if (el.userAvatarContainer && el.userAvatarImg) {
                if (metadata && metadata.avatar_url) {
                    el.userAvatarImg.src = metadata.avatar_url;
                } else {
                    el.userAvatarImg.src = AVATAR_POR_DEFECTO;
                }
                el.userAvatarImg.style.display = 'block';
                el.userAvatarContainer.style.display = 'block';
            }
        } else {
            if (el.loginNavBtn) el.loginNavBtn.style.display = 'block';
            if (el.registerNavBtn) el.registerNavBtn.style.display = 'block';
            if (el.logoutLi) el.logoutLi.classList.add('hidden');
            if (el.userAvatarContainer) el.userAvatarContainer.style.display = 'none';
        }
    }

    // --- Acciones de los formularios ---

    /** Registra un usuario y sube su foto de perfil al bucket `avatars`. */
    async registrarUsuario(el) {
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
                    .from(BUCKET_AVATARES)
                    .upload(fileName, avatarFile);

                if (!uploadError) {
                    const { data: publicURLData } = supabase.storage
                        .from(BUCKET_AVATARES)
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

            this.registrarEvento('registro');
            alert('¡Registro exitoso! Por favor inicia sesión.');
            el.registerForm.reset();
            if (el.registerFormContainer) el.registerFormContainer.classList.add('hidden');
            if (el.loginFormContainer) el.loginFormContainer.classList.remove('hidden');
        } catch (err) {
            alert('Error en el registro: ' + err.message);
        }
    }

    /** Inicia sesión con correo y contraseña. */
    async iniciarSesion(el) {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.registrarEvento('login');
            alert('¡Bienvenido de nuevo!');
            this.#cerrarModal(el.authModal);
            el.loginForm.reset();
            this.actualizarUIUsuario(el);
        } catch (err) {
            alert('Error al iniciar sesión: ' + err.message);
        }
    }

    /** Cierra la sesión activa. */
    async cerrarSesion(el) {
        await supabase.auth.signOut();
        this.registrarEvento('logout');
        this.actualizarUIUsuario(el);
        alert('Has cerrado sesión correctamente.');
    }

    /** Publica un evento de autenticación en el bus. */
    registrarEvento(tipo) {
        this.registrar(tipo);
    }

    // --- Arranque ---

    /** Conecta todos los listeners del modal y verifica la sesión actual. */
    iniciarAutenticacion() {
        const el = this.#elementos();

        // Botón de cerrar (la 'X')
        if (el.closeAuthModal) {
            el.closeAuthModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.#cerrarModal(el.authModal);
            });
        }

        // Cerrar al hacer clic en el fondo oscuro del modal
        if (el.authModal) {
            el.authModal.addEventListener('click', (e) => {
                if (e.target === el.authModal) {
                    this.#cerrarModal(el.authModal);
                }
            });
        }

        if (el.loginNavBtn) {
            el.loginNavBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (el.loginFormContainer) el.loginFormContainer.classList.remove('hidden');
                if (el.registerFormContainer) el.registerFormContainer.classList.add('hidden');
                this.#abrirModal(el.authModal);
            });
        }

        if (el.registerNavBtn) {
            el.registerNavBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (el.registerFormContainer) el.registerFormContainer.classList.remove('hidden');
                if (el.loginFormContainer) el.loginFormContainer.classList.add('hidden');
                this.#abrirModal(el.authModal);
            });
        }

        if (el.switchToRegister) {
            el.switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                if (el.loginFormContainer) el.loginFormContainer.classList.add('hidden');
                if (el.registerFormContainer) el.registerFormContainer.classList.remove('hidden');
            });
        }

        if (el.switchToLogin) {
            el.switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (el.registerFormContainer) el.registerFormContainer.classList.add('hidden');
                if (el.loginFormContainer) el.loginFormContainer.classList.remove('hidden');
            });
        }

        // Formularios
        if (el.registerForm) {
            el.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registrarUsuario(el);
            });
        }

        if (el.loginForm) {
            el.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.iniciarSesion(el);
            });
        }

        // Cerrar sesión
        if (el.logoutNavBtn) {
            el.logoutNavBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.cerrarSesion(el);
            });
        }

        // Verificar sesión al cargar
        this.actualizarUIUsuario(el);
    }
}

// Singleton: una sesión de autenticación por navegador.
export const authService = new AuthService();

export function iniciarAutenticacion() {
    return authService.iniciarAutenticacion();
}