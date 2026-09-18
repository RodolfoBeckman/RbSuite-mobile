import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type { SaleReceipt } from '../hooks/useSaleReceipt'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

// Alternativa para cuando no hay una impresora térmica emparejada — mismo
// contenido que printReceipt.ts, pero como HTML angosto (tamaño de rollo
// de recibo) que expo-print convierte a PDF, para guardar o compartir
// (WhatsApp, correo, Archivos) en vez de imprimir en papel.
function receiptHtml(receipt: SaleReceipt): string {
  const itemsHtml = receipt.items
    .map(
      (item) => `
        <p class="name">${item.name}</p>
        <div class="row"><span>${item.quantity} x ${currency.format(item.unitPrice)}</span><span>${currency.format(item.subtotal)}</span></div>
      `,
    )
    .join('')

  const paymentsHtml = receipt.payments
    .map(
      (payment) => `
        <div class="row"><span>${PAYMENT_LABEL[payment.method] ?? payment.method}</span><span>${currency.format(payment.amount)}</span></div>
      `,
    )
    .join('')

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 12px; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .name { margin: 6px 0 0; }
          .row { display: flex; justify-content: space-between; margin: 0 0 6px; }
          .hr { border-top: 1px dashed #000; margin: 8px 0; }
          .total .row { font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="center">
          <p class="bold">${receipt.businessName}</p>
          <p>${receipt.branchName}</p>
          ${receipt.branchAddress ? `<p>${receipt.branchAddress}</p>` : ''}
          ${receipt.branchPhone ? `<p>Tel. ${receipt.branchPhone}</p>` : ''}
        </div>
        <div class="hr"></div>
        <div class="row"><span>Folio ${receipt.folio}</span><span>${dateTime.format(new Date(receipt.createdAt))}</span></div>
        <div class="hr"></div>
        ${itemsHtml}
        <div class="hr"></div>
        <div class="row"><span>Subtotal</span><span>${currency.format(receipt.subtotal)}</span></div>
        ${receipt.discountTotal > 0 ? `<div class="row"><span>Descuento</span><span>-${currency.format(receipt.discountTotal)}</span></div>` : ''}
        <div class="total"><div class="row"><span>TOTAL</span><span>${currency.format(receipt.total)}</span></div></div>
        <div class="hr"></div>
        ${paymentsHtml}
        <div class="hr"></div>
        <p class="center">¡Gracias por su compra!</p>
      </body>
    </html>
  `
}

// Genera el PDF y abre la hoja de compartir del sistema (WhatsApp, correo,
// guardar en Archivos, AirDrop, etc.) — no requiere impresora ni conexión
// Bluetooth.
export async function shareReceiptPdf(receipt: SaleReceipt): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: receiptHtml(receipt), base64: false })

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) {
    throw new Error('Este dispositivo no puede compartir archivos.')
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Ticket folio ${receipt.folio}`,
  })
}
