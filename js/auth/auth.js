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

// Semana 9: solo entran los roles indicados; si no, vuelve a index.html
export function exigirRol(...rolesPermitidos) {
    const usuario = exigirSesion();
    if (!usuario) return null;
    if (!rolesPermitidos.includes(usuario.rol)) {
        alert('Tu perfil no tiene acceso a esta página.');
        window.location.href = 'index.html';
        return null;
    }
    return usuario;
}

// Semana 9: página de inicio de cada rol
export function rutaInicioSegunRol(rol) {
    const rutas = {
        cliente: 'registro.html',
        administrador: 'panel.html',
        empleado: 'panel.html',
        cajero: 'caja.html'
    };
    return rutas[rol] ?? 'index.html';
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
            const href = usuario.rol === 'cliente' ? 'consulta.html' : (usuario.rol === 'cajero' ? 'caja.html' : 'panel.html');
            const texto = usuario.rol === 'cliente' ? 'Mis pedidos' : (usuario.rol === 'cajero' ? 'Caja' : 'Panel');
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