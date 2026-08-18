// Cheap ESC/POS thermal printers only have English/Latin glyphs built in -
// they cannot render Tamil text no matter what bytes you send them, even
// with a Tamil font installed on the phone/PC. The only reliable fix is to
// draw the whole receipt as a picture (using a Tamil-capable web font) and
// send that picture to the printer as a raster bitmap - printers support
// bitmap printing universally since it doesn't depend on the printer
// having a matching font at all, only on it being able to fire dots.
//
// This does mean printing is slightly slower than plain text (an image is
// more bytes than a string), and there's no way to make part of the
// receipt bold/selected by the printer itself - all styling has to be
// baked into the picture, which is what the canvas drawing below does.

const DEFAULT_WIDTH_DOTS = 384 // 384 = common 58mm printer, 576 = 80mm printer
const FONT_STACK = '"Noto Sans Tamil", sans-serif'

async function ensureFontLoaded() {
  // Force the browser to actually fetch/parse the bundled Tamil font
  // before we draw with it - otherwise the first receipt can render with
  // tofu boxes because the font loads asynchronously.
  await Promise.all([
    document.fonts.load(`bold 28px ${FONT_STACK}`),
    document.fonts.load(`28px ${FONT_STACK}`),
    document.fonts.load(`bold 44px ${FONT_STACK}`)
  ])
  await document.fonts.ready
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function formatMoney(amount) {
  return `LKR ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Renders the receipt to a canvas sized exactly to its content and returns
// it. A generous scratch canvas is used first since we don't know the
// final height until we've laid out all the (possibly wrapped) lines.
async function renderReceiptCanvas(fields, widthDots) {
  await ensureFontLoaded()

  const margin = 14
  const contentWidth = widthDots - margin * 2

  const scratch = document.createElement('canvas')
  scratch.width = widthDots
  scratch.height = 2200
  const ctx = scratch.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, scratch.width, scratch.height)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'top'

  let y = 18

  function center(text, font, lineHeight) {
    if (!text) return
    ctx.font = font
    ctx.textAlign = 'center'
    for (const line of wrapText(ctx, text, contentWidth)) {
      ctx.fillText(line, widthDots / 2, y)
      y += lineHeight
    }
  }

  function left(text, font, lineHeight) {
    if (!text) return
    ctx.font = font
    ctx.textAlign = 'left'
    for (const line of wrapText(ctx, text, contentWidth)) {
      ctx.fillText(line, margin, y)
      y += lineHeight
    }
  }

  function divider() {
    y += 6
    ctx.fillRect(margin, y, contentWidth, 2)
    y += 12
  }

  const templeBold = `bold 26px ${FONT_STACK}`
  const templeTamil = `bold 24px ${FONT_STACK}`
  const ticketBold = `bold 30px ${FONT_STACK}`
  const ticketTamil = `bold 27px ${FONT_STACK}`
  const sectionHeading = `bold 24px ${FONT_STACK}`
  const label = `22px ${FONT_STACK}`
  const priceFont = `bold 46px ${FONT_STACK}`
  const footer = `22px ${FONT_STACK}`

  center(fields.templeName, templeBold, 32)
  center(fields.templeNameTamil, templeTamil, 30)
  divider()

  if (fields.kind === 'donation') {
    // Donation receipts get their own heading, and lead with the donor's
    // details rather than a "ticket name" - this is a receipt of what
    // someone gave, not a ticket for what they're attending.
    center('DONATION RECEIPT', sectionHeading, 30)
    center('நன்கொடை ரசீது', ticketTamil, 32)
    divider()

    center(fields.ticketName, ticketBold, 36)
    center(fields.ticketNameTamil, ticketTamil, 32)
    divider()

    left(`Receipt No / ரசீது எண்: ${fields.receiptNo}`, label, 28)
    left(`Date / தேதி: ${fields.dateStr}`, label, 28)
    left(`Time / நேரம்: ${fields.timeStr}`, label, 28)
    divider()

    left(`Donor / நன்கொடையாளர்: ${fields.donorName}`, label, 28)
    if (fields.donorAddress) {
      left(`Address / முகவரி: ${fields.donorAddress.replace(/\n+/g, ', ')}`, label, 28)
    }
    left(`Received by / பெற்றவர்: ${fields.operator}`, label, 28)
    divider()

    center(formatMoney(fields.price), priceFont, 56)
    divider()

    center('May the Goddess bless you', footer, 28)
    center('தேவியின் அருள் உங்களுக்கு கிடைக்கட்டும்', footer, 30)
  } else {
    center(fields.ticketName, ticketBold, 38)
    center(fields.ticketNameTamil, ticketTamil, 34)
    divider()

    left(`Receipt No / ரசீது எண்: ${fields.receiptNo}`, label, 28)
    left(`Date / தேதி: ${fields.dateStr}`, label, 28)
    left(`Time / நேரம்: ${fields.timeStr}`, label, 28)
    left(`Operator / நடத்துபவர்: ${fields.operator}`, label, 28)
    divider()

    center(formatMoney(fields.price), priceFont, 56)
    divider()

    center('Thank you / நன்றி', footer, 30)
  }
  y += 24

  const finalHeight = Math.ceil(y / 8) * 8 // raster rows must be a multiple of 8
  const final = document.createElement('canvas')
  final.width = widthDots
  final.height = finalHeight
  final.getContext('2d').drawImage(scratch, 0, 0)
  return final
}

// Converts a canvas to ESC/POS "GS v 0" raster bitmap bytes (monochrome,
// 1 bit per pixel, MSB-first). widthDots must be a multiple of 8.
function canvasToRasterBytes(canvas, { threshold = 200 } = {}) {
  const { width, height } = canvas
  const ctx = canvas.getContext('2d')
  const { data } = ctx.getImageData(0, 0, width, height)
  const bytesPerRow = width / 8

  const header = new Uint8Array([
    0x1d, 0x76, 0x30, 0x00,
    bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff
  ])

  const body = new Uint8Array(bytesPerRow * height)
  let idx = 0
  for (let yy = 0; yy < height; yy++) {
    for (let xByte = 0; xByte < bytesPerRow; xByte++) {
      let byte = 0
      for (let bit = 0; bit < 8; bit++) {
        const xx = xByte * 8 + bit
        const px = (yy * width + xx) * 4
        const luminance = data[px] * 0.299 + data[px + 1] * 0.587 + data[px + 2] * 0.114
        if (data[px + 3] > 0 && luminance < threshold) {
          byte |= 1 << (7 - bit)
        }
      }
      body[idx++] = byte
    }
  }

  const out = new Uint8Array(header.length + body.length)
  out.set(header, 0)
  out.set(body, header.length)
  return out
}

// Builds the complete byte sequence to send to the printer: init, the
// bilingual receipt image, feed, and a partial cut.
export async function buildBilingualTicketReceipt({
  templeName = 'Sri Aishwarya Lakshmi Temple, Colombo',
  templeNameTamil = 'ஸ்ரீ ஐஸ்வர்யா லக்ஷ்மி கோவில், கொழும்பு',
  ticketName,
  ticketNameTamil,
  kind = 'puja',
  price,
  receiptNo,
  dateStr,
  timeStr,
  operator,
  donorName,
  donorAddress,
  widthDots = DEFAULT_WIDTH_DOTS
}) {
  const canvas = await renderReceiptCanvas(
    {
      templeName,
      templeNameTamil,
      ticketName,
      ticketNameTamil,
      kind,
      price,
      receiptNo,
      dateStr,
      timeStr,
      operator,
      donorName,
      donorAddress
    },
    widthDots
  )
  const imageBytes = canvasToRasterBytes(canvas)
  const init = new Uint8Array([0x1b, 0x40])
  const feedAndCut = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x01])

  const combined = new Uint8Array(init.length + imageBytes.length + feedAndCut.length)
  combined.set(init, 0)
  combined.set(imageBytes, init.length)
  combined.set(feedAndCut, init.length + imageBytes.length)
  return combined
}
