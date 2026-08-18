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
  name,
  nameTamil = '',
  category,
  categoryTamil = '',
  kind = 'puja', // 'puja' | 'donation'
  price,
  order = 0
}) {
  return addDoc(ticketTypesCol, {
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

// ---------- Receipt numbering (continuous, for audit trail) ----------
//
// Receipt numbers never reset - they run continuously for the life of the
// temple's records, the same way a pre-printed paper ticket book would.
// Puja tickets and donations are numbered in two separate series (so a
// donation receipt book and a ticket book can each be audited on their
// own), each stored as one counter document:
//   counters/ticketSeries    -> { prefix, padding, count }
//   counters/donationSeries  -> { prefix, padding, count }
// `count` is the last number issued; the next one issued is count + 1.

const SERIES = {
  puja: 'ticketSeries',
  donation: 'donationSeries'
}

const DEFAULT_SERIES_SETTINGS = {
  ticketSeries: { prefix: 'T-', padding: 6, count: 0 },
  donationSeries: { prefix: 'D-', padding: 6, count: 0 }
}

export async function getSeriesSettings(seriesId) {
  const snap = await getDoc(doc(db, 'counters', seriesId))
  if (snap.exists()) return snap.data()
  return DEFAULT_SERIES_SETTINGS[seriesId] || { prefix: '', padding: 6, count: 0 }
}

export async function getAllSeriesSettings() {
  const [ticketSeries, donationSeries] = await Promise.all([
    getSeriesSettings('ticketSeries'),
    getSeriesSettings('donationSeries')
  ])
  return { ticketSeries, donationSeries }
}

// Sets up or corrects a series: nextNumber is the number that should be
// issued NEXT (e.g. if your existing printed books go up to 5000, set
// nextNumber to 5001 to continue the same audit trail in this system).
export async function setSeriesSettings(seriesId, { prefix, padding, nextNumber }) {
  await setDoc(
    doc(db, 'counters', seriesId),
    { prefix, padding: Number(padding), count: Number(nextNumber) - 1 },
    { merge: true }
  )
}

function formatReceiptNo({ prefix, padding, number }) {
  return `${prefix || ''}${String(number).padStart(padding || 1, '0')}`
}

async function getNextReceiptNo(seriesId) {
  const counterRef = doc(db, 'counters', seriesId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? snap.data() : DEFAULT_SERIES_SETTINGS[seriesId]
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
  donorName,
  donorAddress
}) {
  const now = new Date()
  const dateKey = dateKeyFor(now)
  const seriesId = SERIES[kind] || SERIES.puja
  const receiptNo = await getNextReceiptNo(seriesId)

  const docRef = await addDoc(salesCol, {
    ticketTypeId,
    ticketName,
    ticketNameTamil: ticketNameTamil || '',
    kind,
    price,
    operator: operator || 'Unknown',
    donorName: donorName || '',
    donorAddress: donorAddress || '',
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
