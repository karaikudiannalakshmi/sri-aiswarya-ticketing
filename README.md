# Sri Aishwarya Lakshmi Temple - Ticketing System

Mobile ticketing + PC dashboard for the temple's puja tickets, agal vilaku,
donations, and receipts.

## What's included

- **Ticket Issue screen** (`/`) - mobile-friendly, operator picks a ticket
  type, taps **Issue** (records the sale + generates a receipt number), then
  **Print** (sends it to a Bluetooth thermal printer).
- **Dashboard** (`/dashboard`) - meant to be left open on a PC. Shows today's
  and this month's total collections, plus a breakdown by ticket type.
  Auto-refreshes every minute.
- **Manage Ticket Types** (`/admin`) - add/edit/delete ticket types, their
  category, and price.

## Puja tickets vs. Donations

These are treated as two different kinds of ticket type in `/admin`:

- **Puja / Ticket** - a fixed-price item (a specific puja, agal vilaku,
  etc). The operator just taps it and issues - no extra fields needed.
- **Donation** - the operator is asked for the **donor's name** when
  issuing, and can enter the actual amount given (the price set in
  `/admin` is only a suggested starting value, editable per donation).
  The donor's name prints on the receipt and appears in the Excel export.

This split exists because a puja ticket only ever needs a name, while a
donation only ever needs a donor's name - trying to force both into one
"name" field didn't fit either case well.

## Currency

All amounts are shown and printed in **LKR**. This is set in one place -
`src/lib/currency.js` - if it ever needs to change.

## Bilingual (English + Tamil) receipts

Cheap ESC/POS thermal printers only have English/Latin characters built
into their firmware - there's no way to make them print Tamil script as
text, no matter what font is installed on the phone or PC. To work around
this, receipts are drawn as a picture (English + Tamil together, using the
bundled Noto Sans Tamil font) and sent to the printer as a bitmap instead
of as text. This works on any ESC/POS printer since bitmap printing doesn't
depend on the printer's built-in fonts at all.

Practical effects of this:
- Printing takes slightly longer than plain text (a picture is more data
  than a string of characters), typically well under a second extra.
- Add both an English and a Tamil name for each ticket type in `/admin` -
  the Tamil name is optional; if left blank, only English prints.
- The receipt bitmap defaults to 384 dots wide (58mm paper). If your
  printer uses 80mm paper, change the default in
  `src/lib/receiptImage.js` (`DEFAULT_WIDTH_DOTS = 576`).
- The on-screen ticket buttons and admin list also show both languages;
  only the printed receipt required the bitmap workaround.



The Ticket Issue screen (`/`) works from either a phone or a PC, and can
connect to either kind of printer:

- **Bluetooth** - for a phone-based counter. Needs Chrome on **Android**
  (Web Bluetooth isn't supported in Safari on iPhone/iPad at all).
- **USB** - for a PC-based counter with the printer plugged in via cable.
  Needs desktop **Chrome or Edge** (Web Serial isn't supported in Firefox
  or Safari). Most compact USB thermal printers show up as a USB-to-serial
  device once their driver is installed, which is what lets the browser
  talk to them directly with no extra software.

Whichever device you're issuing tickets from, tap the matching "Connect
Printer" button once per session - it stays connected until you close the
tab or disconnect. The Dashboard doesn't need a printer connection at all.

### Pairing your specific printer

The app defaults to the most common BLE UUID pair used by cheap 58mm/80mm
thermal printers (POS-58, Goojprt, MTP-II clones etc.):

- Service: `000018f0-0000-1000-8000-00805f9b34fb`
- Characteristic: `00002af1-0000-1000-8000-00805f9b34fb`

If "Connect Printer" finds the device but printing fails or prints garbage,
your printer likely uses different UUIDs. Install a BLE scanner app (e.g.
**nRF Connect** on Android), connect to your printer, and note its Service
and Characteristic UUID for the writable characteristic. Then in the
browser console on the app, run:

```js
import('./src/lib/bluetoothPrinter.js').then(m =>
  m.saveUuids({ service: 'YOUR-SERVICE-UUID', characteristic: 'YOUR-CHAR-UUID' })
)
```

(Or ask Claude to add a small Settings screen for this if you'd rather not
use the console.)

### Tamil/Sinhala text on receipts

Most sub-$30 BLE thermal printers only support single-byte code pages and
can't print Tamil/Sinhala script natively. The receipt template
(`src/lib/escpos.js`) is currently English-only for this reason. If your
printer model supports downloadable fonts or a Unicode code page, let
Claude know the printer model and this can be extended.

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com), create
   a new project (e.g. `sri-aishwarya-ticketing`).
2. Enable **Firestore Database** (production mode).
3. Enable **Authentication -> Sign-in method -> Anonymous**.
4. Project settings -> add a Web app -> copy the config values.
5. Deploy the security rules in `firestore.rules` (Firestore -> Rules tab,
   paste the contents, publish).

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the Firebase values from step 1,
plus a shared password the operators will use to open the app
(`VITE_APP_PASSWORD`).

### 3. Run locally

```bash
npm install
npm run dev
```

Visit the printed local URL. To test on your phone, make sure your phone is
on the same wifi as your computer and visit the "Network" URL vite prints
(something like `http://192.168.x.x:5173`).

### 4. Add your ticket types

Open `/admin` and add each ticket type (name, category, price) - e.g.:

| Name | Category | Price |
|---|---|---|
| Archana | Puja | 200 |
| Abhishekam | Puja | 1000 |
| Agal Vilaku | Agal Vilaku | 100 |
| General Donation | Donation | 500 |

### 5. Deploy

Push to GitHub (`karaikudiannalakshmi` account, terminal git as usual), then
import the repo in Vercel. Add the same environment variables from `.env`
in Vercel's project settings as **plain** env vars (not "Sensitive") so Vite
can read them at build time.

```bash
git init
git add .
git commit -m "Initial ticketing app"
git branch -M main
git remote add origin https://github.com/karaikudiannalakshmi/sri-aishwarya-ticketing.git
git push -u origin main
```

## Data model (Firestore)

- `ticketTypes/{id}` - `{ name, category, price, order, active }`
- `sales/{id}` - `{ ticketTypeId, ticketName, price, operator, receiptNo, dateKey, printed, createdAt }`
- `counters/{YYYYMMDD}` - `{ count }` - used to generate daily receipt numbers
  like `20260818-0001`.

## Next steps you may want

- A "reprint" button on the dashboard for a specific sale.
- Export day/month sales to Excel (this codebase already uses SheetJS in
  other apps, so it's a quick add).
- A Settings screen for the printer UUIDs instead of the console workaround
  above.
- Role-based login (operator vs. admin) instead of one shared password, if
  you want to restrict who can edit ticket types.
