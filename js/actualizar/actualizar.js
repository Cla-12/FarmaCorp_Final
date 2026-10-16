import { sql } from '../config/neon-config.js';
import { exigirRol } from '../auth/auth.js';
import { calcularMontoServicio, formatearSoles } from '../registro/tarifario.js';

const usuario = exigirRol('cliente');

export async function obtenerRegistro(id) {
    const filas = await sql`
        SELECT * FROM pedidos_delivery_farmacia
        WHERE id = ${id} AND id_usuario = ${usuario.id};
    `;
    return filas[0] || null;
}

export async function actualizarRegistro(id, datos) {
    // Si cambian los datos, se recalcula el monto. Un pedido pagado ya no se edita
    const monto = calcularMontoServicio(datos);
    const filas = await sql`
        UPDATE pedidos_delivery_farmacia
        SET nombre_cliente = ${datos.nombre}, direccion = ${datos.direccion},
            requiere_frio = ${datos.requiere_frio === 'on'},
            monto_calculado = ${monto},
            estado_pago = ${monto === 0 ? 'exonerado' : 'pendiente'}
        WHERE id = ${id} AND id_usuario = ${usuario.id}
          AND estado = 'registrado' AND estado_pago <> 'pagado'
        RETURNING id;
    `;
    return filas.length === 1; // false: no existe, no es tuyo o ya fue pagado
}

const form = document.getElementById('form-actualizar');

if (usuario && form) {
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    const aviso = document.getElementById('aviso-actualizar');
    const inputNombre = document.getElementById('act-nombre');
    const inputDireccion = document.getElementById('act-direccion');
    const inputFrio = document.getElementById('act-frio');
    const salidaMonto = document.getElementById('act-monto');
    const botonGuardar = document.getElementById('btn-guardar');
    const checkConfirmacion = document.getElementById('check-confirmacion');
    const mensaje = document.querySelector('.mensaje-confirmacion');

    function bloquearFormulario() {
        inputNombre.disabled = true;
        inputDireccion.disabled = true;
        inputFrio.disabled = true;
        botonGuardar.disabled = true;
    }

    // Cotizador en vivo: el monto se recalcula con cada cambio
    function actualizarCotizacion() {
        const datos = inputFrio.checked ? { requiere_frio: 'on' } : {};
        salidaMonto.textContent = formatearSoles(calcularMontoServicio(datos));
    }
    inputFrio.addEventListener('change', actualizarCotizacion);

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
            inputFrio.checked = pedido.requiere_frio === true;
            actualizarCotizacion();
            if (pedido.estado_pago === 'pagado') {
                aviso.textContent = 'Este pedido ya fue pagado: no se puede editar.';
                bloquearFormulario();
            } else if (pedido.estado !== 'registrado') {
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
            const ok = await actualizarRegistro(id, {
                nombre: nombre, direccion: direccion,
                requiere_frio: inputFrio.checked ? 'on' : undefined
            });
            if (!ok) {
                alert('No se pudo actualizar: el pedido ya fue atendido o pagado.');
                return;
            }
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