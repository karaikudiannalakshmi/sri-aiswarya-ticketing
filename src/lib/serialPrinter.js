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
