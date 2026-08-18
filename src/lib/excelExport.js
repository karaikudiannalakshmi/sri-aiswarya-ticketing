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
      'Date/Time': toDateStr(s.createdAt),
      'Ticket Type': s.ticketName,
      'Ticket Type (Tamil)': s.ticketNameTamil || '',
      'Donor Name': s.donorName || '',
      'Amount (LKR)': Number(s.price || 0),
      Operator: s.operator || '',
      Printed: s.printed ? 'Yes' : 'No'
    }))
  const txnSheet = XLSX.utils.json_to_sheet(txnRows)
  txnSheet['!cols'] = [
    { wch: 18 }, // receipt no
    { wch: 20 }, // date/time
    { wch: 24 }, // ticket type
    { wch: 24 }, // ticket type tamil
    { wch: 20 }, // donor name
    { wch: 14 }, // amount
    { wch: 16 }, // operator
    { wch: 8 } // printed
  ]
  XLSX.utils.book_append_sheet(wb, txnSheet, 'Transactions')

  const byType = {}
  for (const s of sales) {
    const key = s.ticketName || 'Unknown'
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
  const grandTotal = sales.reduce((sum, s) => sum + Number(s.price || 0), 0)
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
