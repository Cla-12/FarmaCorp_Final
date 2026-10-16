import { sql } from '../config/neon-config.js';
import { exigirRol } from '../auth/auth.js';
import { calcularMontoServicio, formatearSoles } from './tarifario.js';

// Solo el cliente registra pedidos. Con otro rol o sin sesión, no sigue
const usuario = exigirRol('cliente');
if (!usuario) throw new Error('Acceso denegado');

const formDelivery = document.getElementById('form-delivery');
const inputNombre = document.getElementById('del-nombre');
const inputDireccion = document.getElementById('del-direccion');
const inputMedicamentos = document.getElementById('del-medicamentos');
const inputReceta = document.getElementById('del-receta');
const botonEnviar = document.getElementById('btn-enviar-delivery');
const salidaMonto = document.getElementById('monto-estimado');

const leerFormulario = () => Object.fromEntries(new FormData(formDelivery));

// Cotizador en vivo: se recalcula con cada cambio del formulario
function actualizarCotizacion() {
    salidaMonto.textContent = formatearSoles(calcularMontoServicio(leerFormulario()));
}
formDelivery.addEventListener('input', actualizarCotizacion);
formDelivery.addEventListener('change', actualizarCotizacion);
actualizarCotizacion();

function marcarError(campo, texto) {
    campo.setCustomValidity(texto);
    campo.reportValidity();
}

[inputNombre, inputDireccion, inputMedicamentos, inputReceta].forEach((campo) => {
    campo.addEventListener('input', () => campo.setCustomValidity(''));
});

formDelivery.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const nombre = inputNombre.value.trim();
    const direccion = inputDireccion.value.trim();
    const medicamentos = inputMedicamentos.value.trim();
    const archivo = inputReceta.files[0];

    // Validaciones del lado del cliente
    if (nombre.length < 3 || nombre.length > 120 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/.test(nombre)) {
        marcarError(inputNombre, 'Ingresa un nombre válido (mínimo 3 letras, sin números).');
        return;
    }
    if (direccion.length < 5 || direccion.length > 200) {
        marcarError(inputDireccion, 'La dirección debe tener entre 5 y 200 caracteres.');
        return;
    }
    if (medicamentos.length < 3 || medicamentos.length > 255) {
        marcarError(inputMedicamentos, 'Indica los medicamentos (entre 3 y 255 caracteres).');
        return;
    }
    if (archivo && !(archivo.type.startsWith('image/') || archivo.type === 'application/pdf')) {
        marcarError(inputReceta, 'La receta debe ser una imagen o un PDF.');
        return;
    }

    // El monto se recalcula aquí: no se confía en lo que muestra la pantalla
    const datos = leerFormulario();
    const monto = calcularMontoServicio(datos);
    const requiereFrio = datos.requiere_frio === 'on';
    const estadoPago = monto === 0 ? 'exonerado' : 'pendiente';
    const codigo = 'COD-' + Date.now().toString().slice(-8);

    botonEnviar.disabled = true; // evita el doble clic que registraría dos pedidos
    try {
        const filas = await sql`
            INSERT INTO pedidos_delivery_farmacia
                (codigo_seguimiento, nombre_cliente, direccion, medicamentos, receta_url,
                 id_usuario, requiere_frio, monto_calculado, estado_pago, estado)
            VALUES (${codigo}, ${nombre}, ${direccion}, ${medicamentos},
                    ${archivo ? archivo.name.slice(0, 255) : null},
                    ${usuario.id}, ${requiereFrio}, ${monto}, ${estadoPago}, 'registrado')
            RETURNING id;
        `;
        if (estadoPago === 'pendiente') {
            window.location.href = `pago.html?id=${filas[0].id}`;
        } else {
            alert(`Pedido ${codigo} registrado. No requiere pago.`);
            window.location.href = 'consulta.html';
        }
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar el pedido. Intenta de nuevo.');
        botonEnviar.disabled = false;
    }
});