const DEFAULT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const DEFAULT_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'

const STORAGE_KEY = 'temple_printer_uuids'

export function getSavedUuids() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    // ignore
  }
  return { service: DEFAULT_SERVICE_UUID, characteristic: DEFAULT_CHARACTERISTIC_UUID }
}

export function saveUuids({ service, characteristic }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ service, characteristic }))
}

let cachedDevice = null
let cachedCharacteristic = null

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

export async function connectPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth is not available in this browser. Use Chrome on an Android phone.'
    )
  }
  const { service, characteristic } = getSavedUuids()

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [service]
  })

  const server = await device.gatt.connect()
  const svc = await server.getPrimaryService(service)
  const char = await svc.getCharacteristic(characteristic)

  cachedDevice = device
  cachedCharacteristic = char

  device.addEventListener('gattserverdisconnected', () => {
    cachedDevice = null
    cachedCharacteristic = null
  })

  return device.name || 'Printer'
}

export function isConnected() {
  return !!(cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected)
}

export function disconnectPrinter() {
  if (cachedDevice && cachedDevice.gatt.connected) {
    cachedDevice.gatt.disconnect()
  }
  cachedDevice = null
  cachedCharacteristic = null
}

const CHUNK_SIZE = 180

export async function printBytes(bytes) {
  if (!cachedCharacteristic) {
    throw new Error('Printer not connected. Tap "Connect Printer" first.')
  }
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE)
    await cachedCharacteristic.writeValueWithoutResponse(chunk)
    await new Promise((r) => setTimeout(r, 20))
  }
}
