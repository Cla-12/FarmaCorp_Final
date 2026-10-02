import { registrarUsuario, iniciarSesion } from './auth.js';

const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');
const tabLogin = document.getElementById('tab-login');
const tabRegistro = document.getElementById('tab-registro');

function mostrarFormulario(cual) {
    const esLogin = cual === 'login';
    tabLogin.classList.toggle('activo', esLogin);
    formLogin.classList.toggle('activo', esLogin);
    tabRegistro.classList.toggle('activo', !esLogin);
    formRegistro.classList.toggle('activo', !esLogin);
}

tabLogin.addEventListener('click', () => mostrarFormulario('login'));
tabRegistro.addEventListener('click', () => mostrarFormulario('registro'));

formLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const correo = document.getElementById('correo-login').value.trim();
    const contrasena = document.getElementById('contrasena-login').value;

    try {
        const usuario = await iniciarSesion(correo, contrasena);
        if (!usuario) {
            alert('Correo o contraseña incorrectos.');
            return;
        }
        // Redirección según el rol
        if (usuario.rol === 'cliente') {
            window.location.href = 'registro.html';
        } else {
            window.location.href = 'panel.html';
        }
    } catch (error) {
        console.error(error);
        alert('No se pudo conectar con la base de datos. Intenta de nuevo.');
    }
});

formRegistro.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const contrasena = document.getElementById('contrasena').value;

    if (nombre.length < 3 || nombre.length > 120) {
        alert('El nombre debe tener entre 3 y 120 caracteres.');
        return;
    }
    if (contrasena.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        await registrarUsuario(nombre, correo, contrasena);
        alert('Cuenta creada correctamente. Ahora inicia sesión.');
        formRegistro.reset();
        mostrarFormulario('login');
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            alert('Ese correo ya está registrado.');
        } else {
            alert('No se pudo crear la cuenta. Intenta de nuevo.');
        }
    }
});