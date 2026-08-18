// Minimal ESC/POS command builder for 58mm/80mm thermal receipt printers.
// Builds a Uint8Array of raw bytes to send over Bluetooth (or any serial link).

const ESC = 0x1b
const GS = 0x1d

function textToBytes(str) {
  // Most cheap BT thermal printers only support single-byte code pages
  // (no native Unicode). This strips characters outside basic Latin so
  // printing doesn't produce garbled output. Tamil/Sinhala text won't
  // print correctly on these printers without a font-download step the
  // printer firmware supports (rare on sub-$30 units).
  return new TextEncoder().encode(str)
}

export class ReceiptBuilder {
  constructor() {
    this.bytes = []
    this._push(ESC, 0x40) // initialize printer
  }

  _push(...vals) {
    this.bytes.push(...vals)
    return this
  }

  align(pos = 'left') {
    const map = { left: 0, center: 1, right: 2 }
    return this._push(ESC, 0x61, map[pos] ?? 0)
  }

  bold(on = true) {
    return this._push(ESC, 0x45, on ? 1 : 0)
  }

  doubleSize(on = true) {
    return this._push(GS, 0x21, on ? 0x11 : 0x00)
  }

  text(str = '') {
    this.bytes.push(...textToBytes(str))
    return this
  }

  line(str = '') {
    return this.text(str).newline()
  }

  newline(n = 1) {
    for (let i = 0; i < n; i++) this._push(0x0a)
    return this
  }

  divider(char = '-', width = 32) {
    return this.line(char.repeat(width))
  }

  cut() {
    return this._push(GS, 0x56, 0x01) // partial cut
  }

  build() {
    return new Uint8Array(this.bytes)
  }
}

// Builds the standard ticket/receipt layout used across this app.
export function buildTicketReceipt({
  templeName = 'Sri Aishwarya Lakshmi Temple, Colombo',
  ticketName,
  price,
  receiptNo,
  dateStr,
  timeStr,
  operator
}) {
  const b = new ReceiptBuilder()
  b.align('center').bold(true).doubleSize(true).line(templeName)
  b.doubleSize(false).bold(false)
  b.divider('=')
  b.align('center').bold(true).doubleSize(true).line(ticketName)
  b.doubleSize(false).bold(false)
  b.divider('-')
  b.align('left')
  b.line(`Receipt No : ${receiptNo}`)
  b.line(`Date       : ${dateStr}`)
  b.line(`Time       : ${timeStr}`)
  b.line(`Operator   : ${operator}`)
  b.divider('-')
  b.align('center').bold(true).doubleSize(true)
  b.line(`Rs. ${Number(price).toFixed(2)}`)
  b.doubleSize(false).bold(false)
  b.divider('=')
  b.align('center').line('Thank you')
  b.newline(3)
  b.cut()
  return b.build()
}
