import { sql } from '../config/neon-config.js';
import { exigirSesion } from '../auth/auth.js';

const usuario = exigirSesion();

export async function obtenerRegistro(id) {
    const filas = await sql`
        SELECT * FROM pedidos_delivery_farmacia
        WHERE id = ${id} AND id_usuario = ${usuario.id};
    `;
    return filas[0] || null;
}

export async function actualizarRegistro(id, datos) {
    // id_usuario evita editar pedidos de otro cliente; estado solo permite editar los 'registrado'
    await sql`
        UPDATE pedidos_delivery_farmacia
        SET nombre_cliente = ${datos.nombre}, direccion = ${datos.direccion}
        WHERE id = ${id} AND id_usuario = ${usuario.id} AND estado = 'registrado';
    `;
}

const form = document.getElementById('form-actualizar');

if (usuario && form) {
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    const aviso = document.getElementById('aviso-actualizar');
    const inputNombre = document.getElementById('act-nombre');
    const inputDireccion = document.getElementById('act-direccion');
    const botonGuardar = document.getElementById('btn-guardar');
    const checkConfirmacion = document.getElementById('check-confirmacion');
    const mensaje = document.querySelector('.mensaje-confirmacion');

    function bloquearFormulario() {
        inputNombre.disabled = true;
        inputDireccion.disabled = true;
        botonGuardar.disabled = true;
    }

    async function cargarPedido() {
        if (!id) {
            aviso.textContent = 'Elige un pedido desde "Mis pedidos".';
            bloquearFormulario();
            return;
        }
        try {
            const pedido = await obtenerRegistro(id);
            if (!pedido) {
                aviso.textContent = 'No se encontró el pedido.';
                bloquearFormulario();
                return;
            }
            document.getElementById('codigo-pedido').textContent = pedido.codigo_seguimiento;
            inputNombre.value = pedido.nombre_cliente ?? '';
            inputDireccion.value = pedido.direccion ?? '';
            if (pedido.estado !== 'registrado') {
                aviso.textContent = 'Este pedido ya fue atendido: solo lectura.';
                bloquearFormulario();
            }
        } catch (error) {
            console.error(error);
            aviso.textContent = 'No se pudo cargar el pedido.';
            bloquearFormulario();
        }
    }

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const nombre = inputNombre.value.trim();
        const direccion = inputDireccion.value.trim();

        if (nombre.length < 3 || nombre.length > 120) {
            alert('El nombre debe tener entre 3 y 120 caracteres.');
            return;
        }
        if (direccion.length < 5 || direccion.length > 200) {
            alert('La dirección debe tener entre 5 y 200 caracteres.');
            return;
        }

        botonGuardar.disabled = true;
        try {
            await actualizarRegistro(id, { nombre: nombre, direccion: direccion });
            checkConfirmacion.checked = false;
            void mensaje.offsetWidth; // reinicia la animación de la Semana 5
            checkConfirmacion.checked = true;
        } catch (error) {
            console.error(error);
            alert('No se pudo actualizar el pedido. Intenta de nuevo.');
        } finally {
            botonGuardar.disabled = false;
        }
    });

    cargarPedido();
}