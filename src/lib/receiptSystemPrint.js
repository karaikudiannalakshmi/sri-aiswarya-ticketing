// For a regular office printer (laser/inkjet) rather than a thermal
// receipt printer, there's no ESC/POS or raw-byte protocol to speak -
// printing goes through the normal OS print dialog instead, the same way
// printing any web page works. This opens a clean, full-page version of
// the receipt in a new window and triggers that dialog, so any printer
// already installed in Windows/macOS shows up as an option - no pairing,
// no COM port, no driver beyond whatever the OS already has for it.

// Default temple identity, matching the same defaults used for the
// thermal-printer receipt (src/lib/receiptImage.js) - kept here too since
// this module builds its own HTML independently rather than sharing that
// function, and a missing default here would silently print a receipt
// with no temple name at all.
const DEFAULT_TEMPLE_NAME = 'Sri Aishwarya Lakshmi Temple, Colombo'
const DEFAULT_TEMPLE_NAME_TAMIL = 'ஸ்ரீ ஐசுவர்ய லட்சுமி திருக்கோயில், கொழும்பு'
const DEFAULT_TEMPLE_ADDRESS = 'Kamban Kottam, No. 11, Ramakrishna Thottam, Colombo-06'
const DEFAULT_TEMPLE_ADDRESS_TAMIL = 'கம்பன் கோட்டம், இல. 11, இராமகிருஷ்ண தோட்டம், கொழும்பு-06'
const DEFAULT_TEMPLE_PHONE = ''

function escapeHtml(s) {
  return String(s || '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )
}

function formatMoney(amount) {
  return `LKR ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildReceiptBodyHtml(fields) {
  const rows = []
  const row = (labelEn, labelTa, value) => {
    if (!value) return
    rows.push(
      `<div class="row"><span class="label">${escapeHtml(labelEn)} / ${escapeHtml(labelTa)}</span><span class="value">${escapeHtml(value)}</span></div>`
    )
  }

  const isDonation = fields.kind === 'donation'
  const heading = isDonation
    ? `<p class="section-en">DONATION RECEIPT</p><p class="section-ta">நன்கொடை ரசீது</p>`
    : ''

  row('Receipt No', 'ரசீது எண்', fields.receiptNo)
  row('Date', 'தேதி', fields.dateStr)
  row('Time', 'நேரம்', fields.timeStr)
  if (!isDonation) row('Operator', 'நடத்துபவர்', fields.operator)

  if (isDonation) {
    row('Donor', 'நன்கொடையாளர்', fields.name)
    if (fields.donorAddress) row('Address', 'முகவரி', fields.donorAddress.replace(/\n+/g, ', '))
    if (fields.phone) row('Phone', 'தொலைபேசி', fields.phone)
    row('Received by', 'பெற்றவர்', fields.operator)
  } else {
    row('Devotee', 'பக்தர்', fields.name)
    if (fields.nakshatra) row('Nakshatra', 'நட்சத்திரம்', fields.nakshatra)
    if (fields.phone) row('Phone', 'தொலைபேசி', fields.phone)
  }

  const footer = isDonation
    ? `<p class="footer-en">May the Goddess bless you</p><p class="footer-ta">தேவியின் அருள் உங்களுக்கு கிடைக்கட்டும்</p>`
    : `<p class="footer-en">Thank you</p><p class="footer-ta">நன்றி</p>`

  return `
    <div class="temple">
      <p class="temple-en">${escapeHtml(fields.templeName || DEFAULT_TEMPLE_NAME)}</p>
      <p class="temple-ta">${escapeHtml(fields.templeNameTamil || DEFAULT_TEMPLE_NAME_TAMIL)}</p>
      <p class="temple-address">${escapeHtml(fields.templeAddress || DEFAULT_TEMPLE_ADDRESS)}</p>
      ${
        fields.templePhone || DEFAULT_TEMPLE_PHONE
          ? `<p class="temple-address">Tel: ${escapeHtml(fields.templePhone || DEFAULT_TEMPLE_PHONE)}</p>`
          : ''
      }
    </div>
    <hr />
    ${heading}
    <div class="ticket">
      <p class="ticket-en">${escapeHtml(fields.ticketName)}</p>
      ${fields.ticketNameTamil ? `<p class="ticket-ta">${escapeHtml(fields.ticketNameTamil)}</p>` : ''}
    </div>
    <hr />
    <div class="rows">${rows.join('')}</div>
    <hr />
    <p class="amount">${formatMoney(fields.price)}</p>
    <hr />
    <div class="footer">${footer}</div>
  `
}

export function printReceiptViaSystemDialog(fields) {
  const fontUrl = `${window.location.origin}/fonts/NotoSansTamil.ttf`
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(fields.receiptNo)}</title>
<style>
  @font-face {
    font-family: 'Noto Sans Tamil';
    src: url('${fontUrl}') format('truetype');
    font-weight: 100 900;
  }
  @page { size: A5; margin: 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Tamil', 'Arial', sans-serif;
    color: #1a1a1a;
    max-width: 400px;
    margin: 0 auto;
    padding: 20px 0;
  }
  hr { border: none; border-top: 2px solid #7A1F2B; margin: 14px 0; }
  .temple { text-align: center; }
  .temple-en { font-weight: 700; font-size: 18px; margin: 0; color: #7A1F2B; }
  .temple-ta { font-weight: 700; font-size: 16px; margin: 4px 0 0; color: #7A1F2B; }
  .temple-address { font-size: 11px; margin: 3px 0 0; color: #777; }
  .section-en { text-align: center; font-weight: 700; font-size: 15px; margin: 0; }
  .section-ta { text-align: center; font-weight: 700; font-size: 14px; margin: 2px 0 0; }
  .ticket { text-align: center; }
  .ticket-en { font-weight: 700; font-size: 17px; margin: 0; }
  .ticket-ta { font-weight: 700; font-size: 15px; margin: 4px 0 0; color: #444; }
  .rows .row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin: 6px 0; }
  .rows .label { color: #666; white-space: nowrap; }
  .rows .value { font-weight: 600; text-align: right; }
  .amount { text-align: center; font-weight: 800; font-size: 26px; color: #7A1F2B; margin: 10px 0; }
  .footer { text-align: center; }
  .footer-en, .footer-ta { margin: 2px 0; font-size: 13px; color: #444; }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
  ${buildReceiptBodyHtml(fields)}
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=500,height=700')
  if (!printWindow) {
    throw new Error('Pop-up blocked - allow pop-ups for this site and try again.')
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for the Tamil font to actually load before printing, otherwise
  // the first print can render with missing/boxed Tamil glyphs.
  printWindow.onload = () => {
    if (printWindow.document.fonts && printWindow.document.fonts.ready) {
      printWindow.document.fonts.ready.then(() => printWindow.print())
    } else {
      setTimeout(() => printWindow.print(), 300)
    }
  }
}
