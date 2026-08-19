import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  runTransaction,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'

const ticketTypesCol = collection(db, 'ticketTypes')
const salesCol = collection(db, 'sales')
const countersCol = collection(db, 'counters')

// ---------- Ticket Types ----------

export async function fetchTicketTypes() {
  const q = query(ticketTypesCol, orderBy('order', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addTicketType({
  serialNo = '',
  name,
  nameTamil = '',
  category,
  categoryTamil = '',
  kind = 'puja', // 'puja' | 'donation'
  price,
  order = 0
}) {
  return addDoc(ticketTypesCol, {
    serialNo: String(serialNo || ''),
    name,
    nameTamil,
    category,
    categoryTamil,
    kind,
    price,
    order,
    active: true
  })
}

export async function updateTicketType(id, updates) {
  return updateDoc(doc(db, 'ticketTypes', id), updates)
}

export async function deleteTicketType(id) {
  return deleteDoc(doc(db, 'ticketTypes', id))
}

// Bulk create/update from an imported spreadsheet. Rows are matched to
// existing ticket types by serialNo first - if a serial number already
// exists, that ticket type is updated in place (price corrections,
// renames). If no serialNo match is found, it falls back to matching by
// exact name among ticket types that don't have a serial number yet -
// this is what lets an older, unnumbered ticket type get folded into a
// renumbered list in place, instead of becoming a duplicate alongside its
// old self. Otherwise a brand new ticket type is created. Firestore
// batches cap at 500 writes, so large imports are split into chunks.
//
// With replaceAll: true, anything currently in the catalog that ISN'T
// matched by a row in this import gets deleted afterwards - useful for
// "this file is now the whole list." Matched items still update their
// existing document rather than being recreated, which matters because
// each ticket type's receipt numbering series is tied to its document ID
// (counters/{ticketTypeId}) - only genuinely-removed items are deleted,
// never ones this import touched.
export async function bulkUpsertTicketTypes(rows, { replaceAll = false } = {}) {
  const existing = await fetchTicketTypes()
  const bySerial = new Map(existing.filter((t) => t.serialNo).map((t) => [t.serialNo, t]))
  const byNameNoSerial = new Map(
    existing.filter((t) => !t.serialNo).map((t) => [t.name.trim().toLowerCase(), t])
  )
  const touchedIds = new Set()

  const results = { created: 0, updated: 0, skipped: 0, renumbered: 0, removed: 0 }
  const chunks = []
  for (let i = 0; i < rows.length; i += 400) chunks.push(rows.slice(i, i + 400))

  for (const chunk of chunks) {
    const batch = writeBatch(db)
    for (const row of chunk) {
      const serialNo = String(row.serialNo || '').trim()
      const name = String(row.name || '').trim()
      if (!name) {
        results.skipped++
        continue
      }
      const payload = {
        serialNo,
        name,
        nameTamil: String(row.nameTamil || '').trim(),
        category: String(row.category || 'General').trim(),
        categoryTamil: String(row.categoryTamil || '').trim(),
        kind: row.kind === 'donation' ? 'donation' : 'puja',
        price: Number(row.price) || 0,
        // Fall back to the numeric Serial No for sort order when no
        // explicit Order column is given - otherwise every imported row
        // ties at 0 and the browse list falls back to Firestore's
        // internal (effectively random) ordering instead of matching the
        // tariff sheet's own numbering.
        order: Number(row.order) || Number(serialNo) || 0,
        active: true
      }
      const serialMatch = serialNo ? bySerial.get(serialNo) : null
      const nameMatch = !serialMatch ? byNameNoSerial.get(name.toLowerCase()) : null
      const match = serialMatch || nameMatch
      if (match) {
        if (nameMatch && serialNo) {
          results.renumbered++
          bySerial.set(serialNo, match) // so a later row can't double-match this doc
          byNameNoSerial.delete(name.toLowerCase())
        }
        batch.set(doc(db, 'ticketTypes', match.id), payload, { merge: true })
        results.updated++
        touchedIds.add(match.id)
      } else {
        const newRef = doc(ticketTypesCol)
        batch.set(newRef, payload)
        results.created++
        touchedIds.add(newRef.id)
        if (serialNo) bySerial.set(serialNo, { id: newRef.id })
      }
    }
    await batch.commit()
  }

  if (replaceAll) {
    const toRemove = existing.filter((t) => !touchedIds.has(t.id))
    const removeChunks = []
    for (let i = 0; i < toRemove.length; i += 400) removeChunks.push(toRemove.slice(i, i + 400))
    for (const chunk of removeChunks) {
      const batch = writeBatch(db)
      for (const t of chunk) {
        batch.delete(doc(db, 'ticketTypes', t.id))
      }
      await batch.commit()
    }
    results.removed = toRemove.length
  }

  return results
}

// ---------- Receipt numbering (continuous, for audit trail) ----------
//
// Receipt numbers never reset - they run continuously for the life of the
// temple's records, the same way a pre-printed paper ticket book runs
// continuously until it's used up. Every ticket type gets its OWN series
// (matching how the temple's real paper books work - Archanai, Kappu
// Nool, Special Puja, and Donations are all numbered independently), keyed
// by that ticket type's own Firestore document ID:
//   counters/<ticketType id>  -> { prefix, padding, count }
// `count` is the last number issued; the next one issued is count + 1.

const DEFAULT_SERIES = { prefix: '', padding: 6, count: 0 }

export async function getSeriesSettings(ticketTypeId) {
  const snap = await getDoc(doc(db, 'counters', ticketTypeId))
  return snap.exists() ? snap.data() : DEFAULT_SERIES
}

// Sets up or corrects a ticket type's series: nextNumber is the number
// that should be issued NEXT (e.g. if the paper book for this ticket type
// is already up to 2216, set nextNumber to 2217 to continue the same
// audit trail in this system, matching what's printed on the next unused
// paper stub).
export async function setSeriesSettings(ticketTypeId, { prefix, padding, nextNumber }) {
  await setDoc(
    doc(db, 'counters', ticketTypeId),
    { prefix, padding: Number(padding), count: Number(nextNumber) - 1 },
    { merge: true }
  )
}

function formatReceiptNo({ prefix, padding, number }) {
  return `${prefix || ''}${String(number).padStart(padding || 1, '0')}`
}

async function getNextReceiptNo(ticketTypeId) {
  const counterRef = doc(db, 'counters', ticketTypeId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? snap.data() : DEFAULT_SERIES
    const nextCount = (current.count || 0) + 1
    tx.set(counterRef, { ...current, count: nextCount }, { merge: true })
    return formatReceiptNo({ prefix: current.prefix, padding: current.padding, number: nextCount })
  })
}

function dateKeyFor(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export async function recordSale({
  ticketTypeId,
  ticketName,
  ticketNameTamil,
  kind = 'puja',
  price,
  operator,
  name,
  nakshatra,
  phone,
  donorAddress
}) {
  const now = new Date()
  const dateKey = dateKeyFor(now)
  const receiptNo = await getNextReceiptNo(ticketTypeId)

  const docRef = await addDoc(salesCol, {
    ticketTypeId,
    ticketName,
    ticketNameTamil: ticketNameTamil || '',
    kind,
    price,
    operator: operator || 'Unknown',
    name: name || '',
    nakshatra: nakshatra || '',
    phone: phone || '',
    donorAddress: donorAddress || '',
    receiptNo,
    dateKey,
    printed: false,
    createdAt: Timestamp.fromDate(now)
  })

  // Best-effort: keep the devotee directory up to date so future lookups
  // by phone number find this person. Never let a directory hiccup block
  // the actual ticket/receipt, which is the important part.
  if (phone && phone.trim() && name && name.trim()) {
    upsertDevotee({ phone, name, nakshatra, address: donorAddress }).catch(() => {})
  }

  return { id: docRef.id, receiptNo, createdAt: now }
}

// ---------- Devotee directory (phone -> known names) ----------
//
// A separate, deliberately minimal collection: just phone/name/nakshatra/
// address, nothing financial. This is what lets an Operator look someone
// up by phone number without needing read access to the sales collection
// (which holds amounts and receipt numbers, and stays Admin-only).

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export async function upsertDevotee({ phone, name, nakshatra, address }) {
  const key = normalizePhone(phone)
  if (!key || !name?.trim()) return
  const ref = doc(db, 'devotees', key)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const existing = snap.exists() ? snap.data().entries || [] : []
    const trimmedName = name.trim()
    const idx = existing.findIndex((e) => e.name.toLowerCase() === trimmedName.toLowerCase())

    let entries
    if (idx >= 0) {
      entries = [...existing]
      entries[idx] = {
        name: trimmedName,
        nakshatra: nakshatra?.trim() || entries[idx].nakshatra || '',
        address: address?.trim() || entries[idx].address || ''
      }
    } else {
      entries = [
        ...existing,
        { name: trimmedName, nakshatra: nakshatra?.trim() || '', address: address?.trim() || '' }
      ].slice(0, 20) // cap - a shared family phone shouldn't grow unbounded
    }

    tx.set(ref, { phone: key, entries }, { merge: true })
  })
}

// Returns the list of {name, nakshatra, address} known under this phone
// number, or [] if none found / on any error (never throws to the caller -
// a failed lookup should just mean "nothing found", not break the form).
export async function lookupDevoteesByPhone(phone) {
  const key = normalizePhone(phone)
  if (!key) return []
  try {
    const snap = await getDoc(doc(db, 'devotees', key))
    return snap.exists() ? snap.data().entries || [] : []
  } catch (e) {
    return []
  }
}

export async function markSalePrinted(saleId) {
  return updateDoc(doc(db, 'sales', saleId), { printed: true })
}

// ---------- Dashboard queries ----------

export async function fetchSalesBetween(startDate, endDate) {
  const q = query(
    salesCol,
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<', Timestamp.fromDate(endDate)),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
