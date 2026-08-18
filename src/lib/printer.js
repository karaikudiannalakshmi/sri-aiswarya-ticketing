// Picks between the Bluetooth (phone) and USB/Web Serial (PC) transports so
// the rest of the app doesn't need to know which one is active. The choice
// is remembered per-device in localStorage, since a phone will always use
// Bluetooth and a PC ticket counter will always use USB.

import * as bt from './bluetoothPrinter'
import * as serial from './serialPrinter'

const TRANSPORT_KEY = 'temple_printer_transport'
const PAPER_WIDTH_KEY = 'temple_printer_paper_width'

export function getTransport() {
  return localStorage.getItem(TRANSPORT_KEY) || null // 'bluetooth' | 'usb' | null
}

export function setTransport(transport) {
  localStorage.setItem(TRANSPORT_KEY, transport)
}

// 384 dots = common 58mm thermal paper, 576 dots = 80mm. Defaults to 58mm
// since that's the cheaper/more common size for compact receipt printers.
export function getPaperWidthDots() {
  return Number(localStorage.getItem(PAPER_WIDTH_KEY)) || 384
}

export function setPaperWidthDots(widthDots) {
  localStorage.setItem(PAPER_WIDTH_KEY, String(widthDots))
}

export function availableTransports() {
  const options = []
  if (bt.isBluetoothSupported()) options.push('bluetooth')
  if (serial.isSerialSupported()) options.push('usb')
  return options
}

export async function connect(transport) {
  if (transport === 'bluetooth') {
    const name = await bt.connectPrinter()
    setTransport('bluetooth')
    return name
  }
  if (transport === 'usb') {
    const name = await serial.connectSerialPrinter()
    setTransport('usb')
    return name
  }
  throw new Error('Unknown printer transport: ' + transport)
}

export function isConnected() {
  const transport = getTransport()
  if (transport === 'bluetooth') return bt.isConnected()
  if (transport === 'usb') return serial.isSerialConnected()
  return false
}

export async function disconnect() {
  const transport = getTransport()
  if (transport === 'bluetooth') await bt.disconnectPrinter()
  if (transport === 'usb') await serial.disconnectSerialPrinter()
}

export async function printBytes(bytes) {
  const transport = getTransport()
  if (transport === 'bluetooth') return bt.printBytes(bytes)
  if (transport === 'usb') return serial.printBytesSerial(bytes)
  throw new Error('No printer connected. Choose Bluetooth or USB first.')
}
