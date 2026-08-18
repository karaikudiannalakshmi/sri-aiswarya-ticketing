// Web Serial connector for USB-connected thermal printers, for use on a PC.
//
// Works in desktop Chrome/Edge only (no Firefox, no Safari, no Android -
// Android phones should use the Bluetooth path in bluetoothPrinter.js
// instead). Most compact USB thermal printers present themselves as a
// USB-to-serial (CDC) device once a driver is installed, which is what
// lets Web Serial talk to them directly - no separate print server needed.
//
// If the printer doesn't show up as a serial port at all (some use a
// vendor-specific USB printer class instead), it needs its own USB print
// driver and can't be reached from the browser this way - in that case a
// small local bridge app (like the Flask PDF tool used elsewhere) would be
// the fallback. Ask Claude to build that if Web Serial doesn't detect it.

let cachedPort = null
let cachedWriter = null

export function isSerialSupported() {
  return typeof navigator !== 'undefined' && !!navigator.serial
}

export async function connectSerialPrinter({ baudRate = 9600 } = {}) {
  if (!isSerialSupported()) {
    throw new Error('USB printing needs desktop Chrome or Edge.')
  }
  const port = await navigator.serial.requestPort()
  await port.open({ baudRate })
  cachedPort = port
  cachedWriter = port.writable.getWriter()
  return 'USB Printer'
}

export function isSerialConnected() {
  return !!(cachedPort && cachedWriter)
}

export async function disconnectSerialPrinter() {
  try {
    if (cachedWriter) {
      cachedWriter.releaseLock()
    }
    if (cachedPort) {
      await cachedPort.close()
    }
  } finally {
    cachedPort = null
    cachedWriter = null
  }
}

export async function printBytesSerial(bytes) {
  if (!cachedWriter) {
    throw new Error('USB printer not connected. Tap "Connect Printer (USB)" first.')
  }
  await cachedWriter.write(bytes)
}
