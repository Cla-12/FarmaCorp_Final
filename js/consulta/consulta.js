import { sql } from '../config/neon-config.js';
import { exigirRol } from '../auth/auth.js';
import { formatearSoles } from '../registro/tarifario.js';

const usuario = exigirRol('cliente');

// Solo los pedidos del cliente en sesión
export async function listarMisPedidos() {
    return await sql`
        SELECT r.*, p.codigo_operacion
        FROM pedidos_delivery_farmacia r
        LEFT JOIN pagos p ON p.id_registro = r.id AND p.estado = 'aprobado'
        WHERE r.id_usuario = ${usuario.id}
        ORDER BY r.fecha_registro DESC;
    `;
}

function celda(texto) {
    const td = document.createElement('td');
    td.textContent = texto ?? '—';
    return td;
}

async function mostrarPedidos() {
    const cuerpo = document.getElementById('tabla-pedidos');
    const aviso = document.getElementById('estado-consulta');
    try {
        const pedidos = await listarMisPedidos();
        aviso.textContent = pedidos.length === 0 ? 'Aún no tienes pedidos registrados.' : '';
        cuerpo.replaceChildren();
        pedidos.forEach((p) => {
            const fila = document.createElement('tr');
            fila.append(
                celda(p.codigo_seguimiento), celda(p.direccion), celda(p.medicamentos), celda(p.receta_url),
                celda(p.estado), celda(formatearSoles(Number(p.monto_calculado))), celda(p.estado_pago),
                celda(new Date(p.fecha_registro).toLocaleString('es-PE'))
            );
            const tdAccion = document.createElement('td');
            // Editar: solo si sigue 'registrado' y no está pagado
            if (p.estado === 'registrado' && p.estado_pago !== 'pagado') {
                const enlace = document.createElement('a');
                enlace.href = 'actualizar.html?id=' + p.id;
                enlace.className = 'btn-delivery';
                enlace.textContent = 'Editar';
                tdAccion.append(enlace, ' ');
            }
            // Pago: pagar, ver comprobante o exonerado
            if (p.estado_pago === 'pendiente') {
                const pagar = document.createElement('a');
                pagar.href = 'pago.html?id=' + p.id;
                pagar.className = 'btn-delivery';
                pagar.textContent = 'Pagar';
                tdAccion.append(pagar);
            } else if (p.estado_pago === 'pagado' && p.codigo_operacion) {
                const comprobante = document.createElement('a');
                comprobante.href = 'comprobante.html?op=' + encodeURIComponent(p.codigo_operacion);
                comprobante.className = 'btn-delivery';
                comprobante.textContent = 'Ver comprobante';
                tdAccion.append(comprobante);
            } else if (p.estado_pago === 'exonerado') {
                tdAccion.append('Exonerado');
            }
            if (!tdAccion.hasChildNodes()) tdAccion.textContent = 'Solo lectura';
            fila.append(tdAccion);
            cuerpo.append(fila);
        });
    } catch (error) {
        console.error(error);
        aviso.textContent = 'No se pudieron cargar los pedidos.';
    }
}

if (usuario) {
    mostrarPedidos();
}