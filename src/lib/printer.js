// Picks between the Bluetooth (phone) and USB/Web Serial (PC) transports so
// the rest of the app doesn't need to know which one is active. The choice
// is remembered per-device in localStorage, since a phone will always use
// Bluetooth and a PC ticket counter will always use USB.

import * as bt from './bluetoothPrinter'
import * as serial from './serialPrinter'

const TRANSPORT_KEY = 'temple_printer_transport'

export function getTransport() {
  return localStorage.getItem(TRANSPORT_KEY) || null // 'bluetooth' | 'usb' | null
}

export function setTransport(transport) {
  localStorage.setItem(TRANSPORT_KEY, transport)
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
