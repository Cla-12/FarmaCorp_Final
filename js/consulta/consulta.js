import { sql } from '../config/neon-config.js';
import { exigirSesion } from '../auth/auth.js';

const usuario = exigirSesion();

// Solo los pedidos del cliente en sesión
export async function listarMisPedidos() {
    return await sql`
        SELECT * FROM pedidos_delivery_farmacia
        WHERE id_usuario = ${usuario.id}
        ORDER BY fecha_registro DESC;
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
                celda(p.estado), celda(new Date(p.fecha_registro).toLocaleString('es-PE'))
            );
            const tdAccion = document.createElement('td');
            if (p.estado === 'registrado') {
                const enlace = document.createElement('a');
                enlace.href = 'actualizar.html?id=' + p.id;
                enlace.className = 'btn-delivery';
                enlace.textContent = 'Editar';
                tdAccion.append(enlace);
            } else {
                tdAccion.textContent = 'Solo lectura';
            }
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