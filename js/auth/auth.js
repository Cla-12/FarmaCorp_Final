import { sql } from '../config/neon-config.js';

export async function registrarUsuario(nombre, correo, contrasena) {
    await sql`INSERT INTO usuarios (nombre, correo, contrasena) VALUES (${nombre}, ${correo}, ${contrasena})`;
}

export async function iniciarSesion(correo, contrasena) {
    const filas = await sql`
        SELECT id, nombre, rol, turno FROM usuarios
        WHERE correo = ${correo} AND contrasena = ${contrasena};
    `;
    if (filas.length === 0) return null;
    sessionStorage.setItem('usuario', JSON.stringify(filas[0]));
    return filas[0];
}

export function cerrarSesion() {
    sessionStorage.removeItem('usuario');
}

export function obtenerUsuario() {
    const guardado = sessionStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
}

// Si no hay sesión, redirige a login.html. Si hay sesión, devuelve el usuario.
export function exigirSesion() {
    const usuario = obtenerUsuario();
    if (!usuario) {
        window.location.href = 'login.html';
        return null;
    }
    return usuario;
}

// Estado de sesión en el encabezado (solo si la página tiene #auth-container)
const authContainer = document.getElementById('auth-container');

if (authContainer) {
    const usuario = obtenerUsuario();
    if (usuario) {
        // Enlace según el rol, justo antes del saludo (sin duplicar si la página ya lo trae)
        const itemAuth = authContainer.closest('li');
        const lista = authContainer.closest('ul');
        if (itemAuth && lista) {
            const href = usuario.rol === 'cliente' ? 'consulta.html' : 'panel.html';
            const texto = usuario.rol === 'cliente' ? 'Mis pedidos' : 'Panel';
            if (!lista.querySelector('a[href="' + href + '"]')) {
                const li = document.createElement('li');
                const enlace = document.createElement('a');
                enlace.href = href;
                enlace.textContent = texto;
                li.append(enlace);
                lista.insertBefore(li, itemAuth);
            }
        }

        const saludo = document.createElement('span');
        saludo.textContent = 'Hola, ' + usuario.nombre + ' ';

        const botonSalir = document.createElement('a');
        botonSalir.href = 'login.html';
        botonSalir.className = 'btn-login-header';
        botonSalir.textContent = 'Cerrar Sesión';
        botonSalir.addEventListener('click', () => cerrarSesion());

        authContainer.replaceChildren(saludo, botonSalir);
    }
}