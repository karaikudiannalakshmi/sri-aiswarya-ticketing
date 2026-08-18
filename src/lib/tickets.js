import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
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

export async function addTicketType({ name, category, price, order = 0 }) {
  return addDoc(ticketTypesCol, { name, category, price, order, active: true })
}

export async function updateTicketType(id, updates) {
  return updateDoc(doc(db, 'ticketTypes', id), updates)
}

export async function deleteTicketType(id) {
  return deleteDoc(doc(db, 'ticketTypes', id))
}

// ---------- Sales / Receipt numbering ----------

// Daily receipt numbers reset each day: TEMPLE-YYYYMMDD-0001
async function getNextReceiptNo(dateKey) {
  const counterRef = doc(db, 'counters', dateKey)
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? snap.data().count || 0 : 0
    const updated = current + 1
    tx.set(counterRef, { count: updated }, { merge: true })
    return updated
  })
  return `${dateKey}-${String(next).padStart(4, '0')}`
}

function dateKeyFor(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export async function recordSale({ ticketTypeId, ticketName, price, operator }) {
  const now = new Date()
  const dateKey = dateKeyFor(now)
  const receiptNo = await getNextReceiptNo(dateKey)

  const docRef = await addDoc(salesCol, {
    ticketTypeId,
    ticketName,
    price,
    operator: operator || 'Unknown',
    receiptNo,
    dateKey,
    printed: false,
    createdAt: Timestamp.fromDate(now)
  })

  return { id: docRef.id, receiptNo, createdAt: now }
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
