// Genera un UUID v4 en el cliente para usarlo como idempotency key/llave
// primaria real de una venta o movimiento de caja creado offline — así el
// servidor puede detectar un reintento ("¿ya existe una fila con este
// id?") sin duplicar nada. No es criptográfico a propósito: aquí solo
// necesita ser único, no impredecible.
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
