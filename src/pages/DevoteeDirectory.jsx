import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { upsertDevotee } from '../lib/tickets'

// Splits a phone cell that may contain more than one number, separated by
// '&', '/', or ',' (as seen in real directory exports) - and strips the
// leading apostrophe Excel adds to force a cell to be treated as text.
function splitPhoneNumbers(raw) {
  if (raw == null) return []
  let s = String(raw).trim()
  if (s.startsWith("'")) s = s.slice(1).trim()
  if (!s || s === '-') return []
  return s
    .split(/[&/,]/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '-')
}

// Finds the header row in a sheet and returns the column indices for name,
// phone, and (if present) nakshatra/address, by looking for cells whose
// text contains those words (case-insensitive) - robust to the exact
// Tamil wording changing, since these directories consistently keep an
// English word in parentheses. Nakshatra/address are optional - only
// name and phone are required for a sheet to be usable.
function findColumns(rows) {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r]
    if (!row) continue
    let nameCol = -1
    let phoneCol = -1
    let nakshatraCol = -1
    let addressCol = -1
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase()
      if (nameCol === -1 && cell.includes('name')) nameCol = c
      if (phoneCol === -1 && cell.includes('phone')) phoneCol = c
      if (nakshatraCol === -1 && cell.includes('nakshatra')) nakshatraCol = c
      if (addressCol === -1 && cell.includes('address')) addressCol = c
    }
    if (nameCol !== -1 && phoneCol !== -1) {
      return { headerRow: r, nameCol, phoneCol, nakshatraCol, addressCol }
    }
  }
  return null
}

export default function DevoteeDirectory() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [log, setLog] = useState([])
  const fileInputRef = useRef(null)

  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMessage('')
    setLog([])
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)

      // Collect every entry across every sheet in the file. Sheets
      // commonly overlap (e.g. a "combined" master sheet repeating
      // everyone from the individual sheets) - that's fine, upsertDevotee
      // is safe to call more than once for the same name/phone pair.
      const pairs = []
      const sheetLog = []
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        const cols = findColumns(rows)
        if (!cols) {
          sheetLog.push(`"${sheetName}": no Name/Phone columns found - skipped`)
          continue
        }
        let sheetPairs = 0
        for (let r = cols.headerRow + 1; r < rows.length; r++) {
          const row = rows[r]
          if (!row) continue
          const name = String(row[cols.nameCol] || '').trim()
          if (!name) continue
          const nakshatra = cols.nakshatraCol !== -1 ? String(row[cols.nakshatraCol] || '').trim() : ''
          const address = cols.addressCol !== -1 ? String(row[cols.addressCol] || '').trim() : ''
          const phones = splitPhoneNumbers(row[cols.phoneCol])
          for (const phone of phones) {
            pairs.push({ name, phone, nakshatra, address })
            sheetPairs++
          }
        }
        sheetLog.push(`"${sheetName}": ${sheetPairs} name/phone pairs found`)
      }

      if (pairs.length === 0) {
        setMessage('No usable rows found across any sheet.')
        setLog(sheetLog)
        return
      }

      let ok = 0
      let failed = 0
      for (const { name, phone, nakshatra, address } of pairs) {
        try {
          await upsertDevotee({ phone, name, nakshatra, address })
          ok++
        } catch (err) {
          failed++
        }
      }

      setMessage(
        `Done: ${ok} entries saved to the directory` + (failed ? `, ${failed} failed` : '') + '.'
      )
      setLog(sheetLog)
    } catch (err) {
      setMessage('Import failed: ' + err.message)
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function downloadTemplate() {
    const headers = ['Name', 'Phone Number', 'Nakshatra (optional)', 'Address (optional)']
    const example1 = ['Mrs. Hema Thangarasa', '0777354287', '', '']
    const example2 = [
      'Mr. S. Vimalachandran',
      '0768846202 & 0718066411',
      '',
      ''
    ]
    const sheet = XLSX.utils.aoa_to_sheet([headers, example1, example2])
    sheet['!cols'] = [{ wch: 28 }, { wch: 26 }, { wch: 18 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Devotee Directory')
    XLSX.writeFile(wb, 'devotee-directory-import-template.xlsx')
  }

  return (
    <div className="min-h-screen bg-temple-cream p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-temple-maroon mb-1">Devotee Directory</h1>
        <p className="text-gray-500 mb-6">
          Bulk-load names and phone numbers into the same lookup directory used on the Issue
          Ticket screen - so when an operator types a phone number, these names show up ready to
          select, even before that person has ever bought a ticket through the app.
        </p>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-1">Import from Excel</h2>
          <p className="text-xs text-gray-400 mb-4">
            Use the template for a clean, standard format, or upload any existing spreadsheet
            directly - the import looks for a column containing "Name" and a column containing
            "Phone" in its header (English or bilingual, e.g. "பெயர் (Name)"), plus optional
            "Nakshatra" and "Address" columns if present. If a phone cell has two numbers
            separated by <code>&amp;</code>, <code>/</code>, or <code>,</code>, the same name is
            saved under both, so either one finds them. Every sheet in the file is processed, and
            importing the same person twice (e.g. a "combined" sheet repeating everyone) is safe -
            it won't create duplicates.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={downloadTemplate}
              className="text-sm text-temple-maroon font-medium border border-temple-maroon rounded-lg px-4 py-2"
            >
              Download Template
            </button>
            <label className="text-sm bg-temple-maroon text-white rounded-lg px-4 py-2 font-medium cursor-pointer">
              {busy ? 'Importing...' : 'Upload Directory File'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                disabled={busy}
                className="hidden"
              />
            </label>
          </div>

          {message && <p className="text-sm text-gray-700 mt-4">{message}</p>}
          {log.length > 0 && (
            <ul className="text-xs text-gray-400 mt-2 space-y-1">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
