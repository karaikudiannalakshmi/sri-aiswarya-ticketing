// Web Bluetooth connector for generic BLE thermal receipt printers.
//
// IMPORTANT: Web Bluetooth only works in Chrome/Edge on Android and on
// desktop Chrome. It does NOT work in Safari on iOS (Apple has not
// implemented the Web Bluetooth API). Operators must use an Android
// phone or tablet for the "Issue & Print" screen.
//
// Most inexpensive Chinese-made BT thermal printers (58mm/80mm, the kind
// sold as "POS-58", "Goojprt", "MTP-II" etc.) expose a single write
// characteristic under one of a small number of common UUID pairs. This
// module tries the most common one by default, but exposes an override
// via localStorage in case a specific printer uses a different UUID -
// use a BLE scanner app (e.g. "nRF Connect" on Android) to find the
// correct Service/Characteristic UUID printed on your printer if the
// default doesn't work, then save it in Settings in the app.

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
    // acceptAllDevices + optionalServices is the most compatible approach
    // since printer names vary widely and don't always advertise the
    // service UUID in the scan response.
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

// BLE writes are capped (commonly 20 bytes per write on older stacks,
// more on modern ones) so long receipts must be chunked.
const CHUNK_SIZE = 180

export async function printBytes(bytes) {
  if (!cachedCharacteristic) {
    throw new Error('Printer not connected. Tap "Connect Printer" first.')
  }
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE)
    await cachedCharacteristic.writeValueWithoutResponse(chunk)
    // small delay helps cheap printer buffers keep up
    await new Promise((r) => setTimeout(r, 20))
  }
}
