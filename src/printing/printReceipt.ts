import { Printer, PrinterConstants } from 'react-native-esc-pos-printer'
import type { SaleReceipt } from '../hooks/useSaleReceipt'
import { getPairedPrinter } from './printerStorage'

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

export class NoPrinterPairedError extends Error {
  constructor() {
    super('No hay una impresora configurada. Ve a Configuración > Impresora de tickets.')
    this.name = 'NoPrinterPairedError'
  }
}

// Manda el ticket a la impresora ya emparejada (ver printerStorage) usando
// el SDK oficial de Epson (react-native-esc-pos-printer) — mismo layout
// que el ticket web (SaleReceiptPrintable.tsx en rb-suite), adaptado a
// comandos ESC/POS en vez de HTML/CSS.
export async function printReceipt(receipt: SaleReceipt): Promise<void> {
  const paired = await getPairedPrinter()
  if (!paired) throw new NoPrinterPairedError()

  const printer = new Printer({ target: paired.target, deviceName: paired.deviceName })

  await printer.addQueueTask(async () => {
    await Printer.tryToConnectUntil(
      printer,
      (status) => status.online.statusCode === PrinterConstants.TRUE,
    )

    await printer.addTextAlign(PrinterConstants.ALIGN_CENTER)
    await printer.addTextStyle({ em: PrinterConstants.TRUE })
    await printer.addText(receipt.businessName)
    await printer.addFeedLine()
    await printer.addTextStyle()
    await printer.addText(receipt.branchName)
    await printer.addFeedLine()
    if (receipt.branchAddress) {
      await printer.addText(receipt.branchAddress)
      await printer.addFeedLine()
    }
    if (receipt.branchPhone) {
      await printer.addText(`Tel. ${receipt.branchPhone}`)
      await printer.addFeedLine()
    }
    await printer.addFeedLine()

    await printer.addTextAlign(PrinterConstants.ALIGN_LEFT)
    await Printer.addTextLine(printer, {
      left: `Folio ${receipt.folio}`,
      right: dateTime.format(new Date(receipt.createdAt)),
      gapSymbol: ' ',
    })
    await printer.addFeedLine()

    for (const item of receipt.items) {
      await printer.addText(item.name)
      await printer.addFeedLine()
      await Printer.addTextLine(printer, {
        left: `${item.quantity} x ${currency.format(item.unitPrice)}`,
        right: currency.format(item.subtotal),
        gapSymbol: ' ',
      })
      await printer.addFeedLine()
    }

    await Printer.addTextLine(printer, {
      left: 'Subtotal',
      right: currency.format(receipt.subtotal),
      gapSymbol: ' ',
    })
    await printer.addFeedLine()

    if (receipt.discountTotal > 0) {
      await Printer.addTextLine(printer, {
        left: 'Descuento',
        right: `-${currency.format(receipt.discountTotal)}`,
        gapSymbol: ' ',
      })
      await printer.addFeedLine()
    }

    await printer.addTextSize({ width: 1, height: 2 })
    await Printer.addTextLine(printer, {
      left: 'TOTAL',
      right: currency.format(receipt.total),
      gapSymbol: ' ',
    })
    await printer.addFeedLine()
    await printer.addTextSize({ width: 1, height: 1 })

    for (const payment of receipt.payments) {
      await Printer.addTextLine(printer, {
        left: PAYMENT_LABEL[payment.method] ?? payment.method,
        right: currency.format(payment.amount),
        gapSymbol: ' ',
      })
      await printer.addFeedLine()
    }

    await printer.addTextAlign(PrinterConstants.ALIGN_CENTER)
    await printer.addFeedLine()
    await printer.addText('¡Gracias por su compra!')
    await printer.addFeedLine()
    await printer.addFeedLine()
    await printer.addCut()

    const result = await printer.sendData()
    await printer.disconnect()
    return result
  })
}

// Ticket mínimo para confirmar que el emparejamiento funciona, sin
// necesitar una venta real — usado desde Configuración > Impresora al
// elegir/probar una impresora.
export async function printTestTicket(paired: { target: string; deviceName: string }): Promise<void> {
  const printer = new Printer({ target: paired.target, deviceName: paired.deviceName })

  await printer.addQueueTask(async () => {
    await Printer.tryToConnectUntil(
      printer,
      (status) => status.online.statusCode === PrinterConstants.TRUE,
    )

    await printer.addTextAlign(PrinterConstants.ALIGN_CENTER)
    await printer.addTextStyle({ em: PrinterConstants.TRUE })
    await printer.addText('RB Suite')
    await printer.addFeedLine()
    await printer.addTextStyle()
    await printer.addText('Impresora conectada correctamente')
    await printer.addFeedLine()
    await printer.addText(dateTime.format(new Date()))
    await printer.addFeedLine()
    await printer.addFeedLine()
    await printer.addCut()

    const result = await printer.sendData()
    await printer.disconnect()
    return result
  })
}
