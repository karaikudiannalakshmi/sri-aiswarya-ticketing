import * as XLSX from 'xlsx'

// Builds and downloads an .xlsx with two sheets: a per-sale transaction
// list, and a summary (count + total) grouped by ticket type.
export function exportSalesToExcel(sales, { filename = 'report.xlsx', title = 'Report' } = {}) {
  const wb = XLSX.utils.book_new()

  const txnRows = sales
    .slice()
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    .map((s) => ({
      'Receipt No': s.receiptNo,
      Type: s.kind === 'donation' ? 'Donation' : 'Puja/Ticket',
      'Date/Time': toDateStr(s.createdAt),
      'Ticket Type': s.ticketName,
      'Ticket Type (Tamil)': s.ticketNameTamil || '',
      Name: s.name || '',
      Nakshatra: s.nakshatra || '',
      Phone: s.phone || '',
      'Donor Address': s.donorAddress || '',
      'Amount (LKR)': Number(s.price || 0),
      Operator: s.operator || '',
      Printed: s.printed ? 'Yes' : 'No'
    }))

  const grandTotal = sales.reduce((sum, s) => sum + Number(s.price || 0), 0)
  // A blank spacer row, then a TOTAL row right under the transaction
  // list itself - not just on the separate Summary tab - since that's
  // the total most people look for first and shouldn't require
  // switching sheets to find. Every key from the data rows is included
  // (even if blank) so the columns line up correctly.
  const blankRow = {
    'Receipt No': '',
    Type: '',
    'Date/Time': '',
    'Ticket Type': '',
    'Ticket Type (Tamil)': '',
    Name: '',
    Nakshatra: '',
    Phone: '',
    'Donor Address': '',
    'Amount (LKR)': '',
    Operator: '',
    Printed: ''
  }
  txnRows.push({ ...blankRow })
  txnRows.push({
    ...blankRow,
    'Ticket Type': `TOTAL (${sales.length} ${sales.length === 1 ? 'ticket' : 'tickets'})`,
    'Amount (LKR)': grandTotal
  })

  const txnSheet = XLSX.utils.json_to_sheet(txnRows)
  txnSheet['!cols'] = [
    { wch: 18 }, // receipt no
    { wch: 12 }, // type
    { wch: 20 }, // date/time
    { wch: 24 }, // ticket type
    { wch: 24 }, // ticket type tamil
    { wch: 20 }, // name
    { wch: 16 }, // nakshatra
    { wch: 16 }, // phone
    { wch: 28 }, // donor address
    { wch: 14 }, // amount
    { wch: 16 }, // operator
    { wch: 8 } // printed
  ]
  XLSX.utils.book_append_sheet(wb, txnSheet, 'Transactions')

  const byType = {}
  for (const s of sales) {
    const key = s.ticketNameTamil || s.ticketName || 'Unknown'
    if (!byType[key]) byType[key] = { count: 0, total: 0 }
    byType[key].count += 1
    byType[key].total += Number(s.price || 0)
  }
  const summaryRows = Object.entries(byType)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => ({
      'Ticket Type': name,
      'Tickets Sold': data.count,
      'Total (LKR)': data.total
    }))
  summaryRows.push({
    'Ticket Type': 'TOTAL',
    'Tickets Sold': sales.length,
    'Total (LKR)': grandTotal
  })
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  XLSX.writeFile(wb, filename)
}

function toDateStr(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)
  return d.toLocaleString()
}
