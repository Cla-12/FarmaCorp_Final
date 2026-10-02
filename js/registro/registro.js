import { sql } from '../config/neon-config.js';
import { exigirSesion } from '../auth/auth.js';

// Sin sesión activa se redirige a login.html
const usuario = exigirSesion();

export async function guardarRegistro(datos) {
    const codigo = 'COD-' + Date.now().toString().slice(-8); // 12 caracteres
    await sql`
        INSERT INTO pedidos_delivery_farmacia (codigo_seguimiento, nombre_cliente, direccion, medicamentos, receta_url, id_usuario)
        VALUES (${codigo}, ${datos.nombre}, ${datos.direccion}, ${datos.medicamentos}, ${datos.recetaUrl}, ${usuario.id})
    `;
    return codigo;
}

const formDelivery = document.getElementById('form-delivery');

if (usuario && formDelivery) {
    const inputNombre = document.getElementById('del-nombre');
    const inputDireccion = document.getElementById('del-direccion');
    const inputMedicamentos = document.getElementById('del-medicamentos');
    const inputReceta = document.getElementById('del-receta');
    const botonEnviar = document.getElementById('btn-enviar-delivery');
    const checkConfirmacion = document.getElementById('check-confirmacion');
    const mensajeConfirmacion = document.querySelector('.mensaje-confirmacion');
    const spanCodigo = document.getElementById('codigo-seguimiento');

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

        botonEnviar.disabled = true;
        try {
            const codigo = await guardarRegistro({
                nombre: nombre,
                direccion: direccion,
                medicamentos: medicamentos,
                recetaUrl: archivo ? archivo.name.slice(0, 255) : null
            });

            // Se reutiliza la animación de confirmación de la Semana 5
            spanCodigo.textContent = codigo;
            checkConfirmacion.checked = false;
            void mensajeConfirmacion.offsetWidth; // reinicia la animación si se envía otro pedido
            checkConfirmacion.checked = true;
            formDelivery.reset();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar el pedido. Intenta de nuevo.');
        } finally {
            botonEnviar.disabled = false;
        }
    });
}