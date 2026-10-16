import { sql } from '../config/neon-config.js';
import { exigirRol } from '../auth/auth.js';
import { calcularMontoServicio, formatearSoles } from '../registro/tarifario.js';

// Solo administrador y empleado entran al panel (cliente y cajero no)
const usuario = exigirRol('administrador', 'empleado');
if (!usuario) throw new Error('Acceso denegado');

// Turnos (hora de Lima): mañana 06-14, tarde 14-18, noche 18-22. De 22:00 a 06:00 no hay turno activo
function turnoActual() {
    const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Lima' }).format(new Date())) % 24;
    if (h >= 6 && h < 14) return 'mañana';
    if (h >= 14 && h < 18) return 'tarde';
    if (h >= 18 && h < 22) return 'noche';
    return 'sin turno';
}

// El administrador siempre puede cambiar el estado; el empleado solo dentro de su turno
function puedeCambiarEstado() {
    return usuario.rol === 'administrador' || usuario.turno === turnoActual();
}

// Muestra el turno en la parte superior del panel
const RANGOS_TURNO = { 'mañana': '06:00 - 14:00', 'tarde': '14:00 - 18:00', 'noche': '18:00 - 22:00' };
const infoTurno = document.getElementById('info-turno');

if (infoTurno && usuario && usuario.rol !== 'cliente') {
    const texto = document.createElement('span');
    const punto = document.createElement('span');
    punto.className = 'punto-turno';

    if (usuario.rol === 'administrador') {
        infoTurno.className = 'insignia-turno en-turno';
        texto.textContent = 'Administrador: puedes cambiar el estado en cualquier horario';
    } else if (usuario.turno === turnoActual()) {
        infoTurno.className = 'insignia-turno en-turno';
        texto.textContent = 'Tu turno: ' + usuario.turno + ' (' + RANGOS_TURNO[usuario.turno] + ') - En turno';
    } else {
        infoTurno.className = 'insignia-turno fuera-turno';
        const suyo = usuario.turno ? usuario.turno + ' (' + RANGOS_TURNO[usuario.turno] + ')' : 'sin turno asignado';
        const ahora = turnoActual();
        const ahoraTexto = ahora === 'sin turno' ? 'ahora no hay turno activo (22:00 - 06:00)' : 'ahora es turno ' + ahora;
        texto.textContent = 'Tu turno: ' + suyo + ' - Fuera de turno (' + ahoraTexto + ')';
    }
    infoTurno.append(punto, texto);
}

// Consultar: todos los registros
export async function listarTodos() {
    return await sql`SELECT * FROM pedidos_delivery_farmacia ORDER BY fecha_registro DESC;`;
}

// Crear: atención presencial, por eso id_usuario queda en NULL
export async function crearRegistro(datos) {
    const codigo = 'COD-' + Date.now().toString().slice(-8);
    const monto = calcularMontoServicio({ requiere_frio: datos.requiereFrio ? 'on' : undefined });
    await sql`
        INSERT INTO pedidos_delivery_farmacia
            (codigo_seguimiento, nombre_cliente, direccion, medicamentos, receta_url,
             requiere_frio, monto_calculado, estado_pago, estado)
        VALUES (${codigo}, ${datos.nombre}, ${datos.direccion}, ${datos.medicamentos}, ${datos.recetaUrl},
                ${datos.requiereFrio}, ${monto}, ${monto === 0 ? 'exonerado' : 'pendiente'}, 'registrado');
    `;
    return codigo;
}

// Actualizar: cualquier registro, incluye cambiar el estado
export async function actualizarComoPanel(id, datos) {
    // Un pedido ya pagado conserva su frío, monto y estado de pago; los demás se recalculan.
    // estado_pago nunca se cambia a mano: los pagos nacen solo en la pasarela o en caja.
    const monto = calcularMontoServicio({ requiere_frio: datos.requiereFrio ? 'on' : undefined });
    await sql`
        UPDATE pedidos_delivery_farmacia
        SET nombre_cliente = ${datos.nombre}, direccion = ${datos.direccion}, medicamentos = ${datos.medicamentos},
            estado = ${datos.estado},
            requiere_frio = CASE WHEN estado_pago = 'pagado' THEN requiere_frio ELSE ${datos.requiereFrio}::boolean END,
            monto_calculado = CASE WHEN estado_pago = 'pagado' THEN monto_calculado ELSE ${monto}::numeric END,
            estado_pago = CASE WHEN estado_pago = 'pagado' THEN estado_pago
                               WHEN ${monto}::numeric = 0 THEN 'exonerado' ELSE 'pendiente' END
        WHERE id = ${id};
    `;
}

// Eliminar: la confirmación se pide en la interfaz antes de llamar esta función
export async function eliminarRegistro(id) {
    try {
        await sql`DELETE FROM pedidos_delivery_farmacia WHERE id = ${id};`;
        return { ok: true };
    } catch (error) {
        // 23503 = llave foránea: el pedido tiene historial de pagos (aprobados o rechazados)
        if (error.code === '23503') {
            return { ok: false, mensaje: 'No se puede eliminar: tiene historial de pagos. Cambia su estado a "rechazado".' };
        }
        throw error;
    }
}

const form = document.getElementById('form-panel');

if (usuario && usuario.rol !== 'cliente' && form) {
    const inputNombre = document.getElementById('pan-nombre');
    const inputDireccion = document.getElementById('pan-direccion');
    const inputMedicamentos = document.getElementById('pan-medicamentos');
    const inputFrio = document.getElementById('pan-frio');
    const selectEstado = document.getElementById('pan-estado');
    const botonPanel = document.getElementById('btn-panel');
    const botonCancelar = document.getElementById('btn-cancelar');
    const titulo = document.getElementById('titulo-form');
    const aviso = document.getElementById('aviso-panel');
    const cuerpo = document.getElementById('tabla-panel');
    const checkConfirmacion = document.getElementById('check-confirmacion');
    const mensaje = document.querySelector('.mensaje-confirmacion');
    const textoConfirmacion = document.getElementById('texto-confirmacion');
    let editandoId = null;

    function celda(texto) {
        const td = document.createElement('td');
        td.textContent = texto ?? '—';
        return td;
    }

    function boton(texto, clase, accion) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = clase;
        b.textContent = texto;
        b.addEventListener('click', accion);
        return b;
    }

    function mostrarConfirmacion(texto) {
        textoConfirmacion.textContent = texto;
        checkConfirmacion.checked = false;
        void mensaje.offsetWidth; // reinicia la animación de la Semana 5
        checkConfirmacion.checked = true;
    }

    function reiniciarFormulario() {
        editandoId = null;
        form.reset();
        inputFrio.disabled = false;
        selectEstado.disabled = true;
        titulo.textContent = 'Nuevo pedido (atención presencial)';
        botonPanel.textContent = 'Crear pedido';
        botonCancelar.hidden = true;
    }

    function iniciarEdicion(p) {
        editandoId = p.id;
        inputNombre.value = p.nombre_cliente ?? '';
        inputDireccion.value = p.direccion ?? '';
        inputMedicamentos.value = p.medicamentos ?? '';
        inputFrio.checked = p.requiere_frio === true;
        inputFrio.disabled = p.estado_pago === 'pagado'; // un pedido pagado ya no cambia su tarifa
        selectEstado.value = p.estado;
        selectEstado.disabled = !puedeCambiarEstado();
        titulo.textContent = 'Editando pedido ' + p.codigo_seguimiento + (puedeCambiarEstado() ? '' : ' (fuera de tu turno: no puedes cambiar el estado)');
        botonPanel.textContent = 'Guardar cambios';
        botonCancelar.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function eliminar(p) {
        if (!confirm('¿Eliminar el pedido ' + p.codigo_seguimiento + '? Esta acción no se puede deshacer.')) return;
        try {
            const resultado = await eliminarRegistro(p.id);
            if (!resultado.ok) {
                alert(resultado.mensaje);
                return;
            }
            mostrarConfirmacion('Pedido eliminado correctamente.');
            cargarTabla();
        } catch (error) {
            console.error(error);
            alert('No se pudo eliminar el pedido.');
        }
    }

    async function cargarTabla() {
        try {
            const pedidos = await listarTodos();
            aviso.textContent = pedidos.length === 0 ? 'No hay pedidos registrados.' : '';
            cuerpo.replaceChildren();
            pedidos.forEach((p) => {
                const fila = document.createElement('tr');
                fila.append(
                    celda(p.id), celda(p.codigo_seguimiento), celda(p.nombre_cliente), celda(p.direccion), celda(p.medicamentos),
                    celda(p.receta_url), celda(p.estado), celda(formatearSoles(Number(p.monto_calculado))),
                    celda(p.estado_pago + (p.canal_pago ? ' (' + p.canal_pago + ')' : '')),
                    celda(new Date(p.fecha_registro).toLocaleString('es-PE'))
                );
                const tdAcciones = document.createElement('td');
                tdAcciones.append(
                    boton('Editar', 'btn-delivery', () => iniciarEdicion(p)), ' ',
                    boton('Eliminar', 'btn-delivery btn-eliminar', () => eliminar(p))
                );
                fila.append(tdAcciones);
                cuerpo.append(fila);
            });
        } catch (error) {
            console.error(error);
            aviso.textContent = 'No se pudieron cargar los pedidos.';
        }
    }

    botonCancelar.addEventListener('click', reiniciarFormulario);

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const nombre = inputNombre.value.trim();
        const direccion = inputDireccion.value.trim();
        const medicamentos = inputMedicamentos.value.trim();

        if (nombre.length < 3 || nombre.length > 120) {
            alert('El nombre debe tener entre 3 y 120 caracteres.');
            return;
        }
        if (direccion.length < 5 || direccion.length > 200) {
            alert('La dirección debe tener entre 5 y 200 caracteres.');
            return;
        }

        if (medicamentos.length < 3 || medicamentos.length > 255) {
            alert('Indica los medicamentos (entre 3 y 255 caracteres).');
            return;
        }

        botonPanel.disabled = true;
        try {
            if (editandoId) {
                await actualizarComoPanel(editandoId, { nombre: nombre, direccion: direccion, medicamentos: medicamentos, estado: selectEstado.value, requiereFrio: inputFrio.checked });
                mostrarConfirmacion('Pedido actualizado correctamente.');
            } else {
                const codigo = await crearRegistro({ nombre: nombre, direccion: direccion, medicamentos: medicamentos, recetaUrl: null, requiereFrio: inputFrio.checked });
                mostrarConfirmacion('Pedido creado. Código de seguimiento: ' + codigo);
            }
            reiniciarFormulario();
            cargarTabla();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar el pedido. Intenta de nuevo.');
        } finally {
            botonPanel.disabled = false;
        }
    });

    cargarTabla();
}