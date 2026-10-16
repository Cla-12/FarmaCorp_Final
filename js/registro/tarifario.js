// js/registro/tarifario.js
// Función PURA: recibe datos y devuelve un número. No toca el DOM ni la base de datos.
// Regla de FarmaSalud Perú: delivery S/ 6.00 + S/ 10.00 si requiere transporte refrigerado.
// Prueba en la consola: calcularMontoServicio({ requiere_frio: 'on' })  ->  16
//                       calcularMontoServicio({})                       ->  6

export function redondear(valor) {
    return Math.round(valor * 100) / 100;
}

export function formatearSoles(monto) {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto);
}

// Un checkbox marcado llega en FormData como 'on'; si no está marcado, NO llega
export const marcado = (valor) => valor === 'on';

export function calcularMontoServicio(datos) {
    let total = 6.00;
    if (marcado(datos.requiere_frio)) total += 10.00;
    return redondear(total);
}