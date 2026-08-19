# Sri Aishwarya Lakshmi Temple - Ticketing System

Mobile ticketing + PC dashboard for the temple's puja tickets, agal vilaku,
donations, and receipts.

## What's included

- **Two logins: Admin and Operator.** See "Two logins" below - this is the
  most important thing to understand about how this app is locked down.
- **Ticket Issue screen** (`/issue`) - mobile-friendly, operator picks a
  ticket type, taps **Issue** (records the sale + generates a receipt
  number), then **Print** (sends it to a Bluetooth or USB thermal printer).
  Both Admin and Operator can use this screen.
- **Dashboard** (`/`, Admin only) - meant to be left open on a PC. Shows
  today's and this month's total collections, a breakdown by ticket type,
  a custom date-range report, and Excel export.
- **Manage Ticket Types** (`/admin`, Admin only) - add/edit/delete ticket
  types, their category, price, and whether they're a Puja ticket or a
  Donation.
- **Receipt Numbering** (`/receipt-numbering`, Admin only) - set up or
  correct the continuous receipt number series (see "Receipt numbering"
  below).

## Installing as a mobile app (not just a browser tab)

This app is a Progressive Web App (PWA) - once deployed, it can be
installed on a phone's home screen like a real app: its own icon, opens
full-screen with no browser address bar, and shows an "SL" temple icon.
This doesn't require the Google Play Store or Apple App Store - it
installs straight from the browser.

**On Android (Chrome):**
1. Open the site
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**)
3. Confirm - an app icon appears on the home screen

**On iPhone/iPad (Safari):**
1. Open the site in Safari (must be Safari, not Chrome, for this to work
   on iOS)
2. Tap the **Share** icon → **Add to Home Screen**
3. Confirm

Once installed, opening the app icon behaves like a native app (own
window, no browser chrome). It still needs an internet connection to
issue tickets and load the dashboard - only the app's own interface is
cached for fast/offline opening, not the live ticket/sales data.

## Two logins: Admin and Operator

- **Admin** - full access: Dashboard, Manage Ticket Types, Receipt
  Numbering, and Issue Ticket.
- **Operator** - can only open the Issue Ticket screen. Cannot see the
  Dashboard, cannot add/edit/delete ticket types, cannot touch receipt
  numbering - even if they know the app's URLs for those pages, or try to
  read/write Firestore directly (e.g. via the browser console), the
  Firestore security rules block it server-side. Hiding the buttons in the
  app is just a convenience on top of that - the real enforcement is in
  `firestore.rules`.

Both roles are real Firebase Authentication accounts (email + password),
not just a shared app password - see "Setup" below for how to create them.
The Operator account is meant to be shared among counter staff; if you
want per-person accountability beyond the "Operator name" field already
on each receipt, additional operator accounts can be added the same way.

Logging in only stays valid for that browser tab/session - closing the
browser signs you out, so the next person to open the app on that device
always sees the login screen again. There's also a **Log Out** button
(top-right on mobile, bottom of the sidebar on desktop) for switching
between Admin and Operator on the same device without closing the browser.

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

## Receipt numbering (audit trail)

Every ticket type has its own continuous receipt number series that never
resets by day or month - matching how a temple's paper ticket books work,
where each book (Archanai, Kappu Nool, Special Puja, Donations, etc.) has
its own printed serial numbers. This matters for auditing: gaps or resets
in receipt numbers are exactly what an auditor looks for.

Go to **Receipt Numbering** in the sidebar - it lists every ticket type
you've created, each with its own Prefix / Digits / Next number:
- **New ticket type**: set its numbering up here before operators can
  issue it. If it's a fresh start, leave "Next number" as 1. If you're
  continuing an existing paper book, set "Next number" to one more than
  the last number already used in that book (or exactly the number on the
  next unused stub), so the audit trail continues without a gap.
- Prefix and digit-padding are cosmetic (e.g. prefix `A-` with 6 digits
  gives `A-000001`) - your paper books didn't use letter prefixes, so
  leaving Prefix blank matches them exactly if you'd prefer plain numbers.

A brand-new ticket type **cannot be issued by an Operator until an Admin
sets up its numbering here first** - this is enforced by the Firestore
rules, not just a suggestion, so there's no way to accidentally issue a
receipt with no proper series behind it.

After initial setup, this page should rarely be touched again per ticket
type - only use it again to correct a genuine mistake, and expect to
explain any change to whoever audits the accounts.

## Donation receipts look different from ticket receipts

A donation receipt is headed "DONATION RECEIPT / நன்கொடை ரசீது" and leads
with the donor's name, address, and phone rather than a ticket name, since
it's a record of what someone gave rather than a ticket for something
they're attending.

Puja/Archanai-style tickets also collect the devotee's **name**, an
optional **Nakshatra (birth star)**, and an optional **phone number** at
the point of issue - matching what the temple's paper ticket books
already capture. Phone numbers are stored so the temple can reach
devotees/donors later (e.g. for upcoming events), even though they're not
required to issue a receipt.

## Looking up existing devotees by phone number

As soon as enough digits are typed into the Phone field, the app checks a
small devotee directory and shows any names already on file under that
number - tap one to fill in Name, Nakshatra, and (for donations) Address
automatically instead of retyping them. Every time a ticket/donation is
issued with a phone number, that person's details are saved into the
directory automatically for next time.

This directory only stores contact info (name/nakshatra/address per phone
number) - never amounts or receipt numbers - which is what lets Operators
use it even though they can't read the Dashboard or sales history.

## Bulk-loading a large price list

For a big tariff sheet (tens or hundreds of poojas/services), adding them
one at a time in the form gets tedious fast. Instead, on **Manage Ticket
Types**:

1. Click **Download Template** - an Excel file with the right column
   headers and one filled-in example row.
2. Fill in one row per item: Serial No, Name (English), Name (Tamil),
   Category (English), Category (Tamil), Kind (`puja` or `donation`), and
   Price. Serial No should match whatever numbering your paper tariff
   sheet already uses.
3. Click **Upload Filled Template** and select your file.

Re-uploading the same file later (with corrections, new rows, or updated
prices) is safe - rows are matched by Serial No, so an existing item gets
updated in place instead of creating a duplicate, and new Serial Nos just
get added.

### Merging older, unnumbered ticket types into a renumbered list

If some ticket types were created before Serial No existed (e.g. added
one at a time through the form early on), a plain re-upload would create
duplicates for them, since there's no serial number yet to match against.
To fold them into a single renumbered catalog instead:

1. On **Manage Ticket Types**, click **Export Current List** - downloads
   everything currently in the app, in the same format as the import
   template.
2. Combine that with whatever else needs merging (e.g. a full tariff
   sheet) into one file, giving every row - old and new - a Serial No in
   one consistent sequence.
3. Upload the combined file.

For rows with a Serial No that doesn't match anything existing, the
import falls back to matching by exact name against ticket types that
don't have a serial number yet - so an old item gets renumbered in place
rather than duplicated. The import result message tells you how many
were handled this way.

**"Replace entire list" checkbox** - check this before uploading if the
file you're uploading should become the *whole* catalog: anything
currently in the app that ISN'T matched by a row in the file gets deleted
after the import. Matched items still update their existing entry rather
than being recreated (so their receipt numbering stays intact) - only
genuinely-removed items are deleted. There's a confirmation prompt before
this runs, since deletions can't be undone. Leave it unchecked for a
normal additive import.

**Important:** a newly-imported ticket type still needs its receipt
numbering set up on the **Receipt Numbering** page before an Operator can
issue it (see "Receipt numbering" above) - the import only creates the
catalog entry, not its serial number series.

## Quick-pick by serial number

On the Issue Ticket screen, typing a Serial No into the box at the top and
pressing Enter (or tapping Find) selects that ticket type immediately -
faster than scrolling through categories once staff know the numbers by
heart, the same way they'd have used the paper tariff sheet. Serial
numbers also show on each ticket's card (`#A-101`) for cross-reference.

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

See "Bilingual (English + Tamil) receipts" above - this is already handled
by drawing receipts as a bitmap image, so no further setup is needed here.

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com), create
   a new project (e.g. `sri-aishwarya-ticketing`).
2. Enable **Firestore Database** (production mode).
3. **Build -> Authentication -> Sign-in method** -> enable **Email/Password**
   (not Anonymous - this app uses two real accounts, one per role).
4. Project settings -> add a Web app -> copy the config values.
5. Deploy the security rules in `firestore.rules` (Firestore -> Rules tab,
   paste the contents, publish).

### 2. Create the Admin and Operator accounts

This app has exactly two logins: one **Admin** account (full access) and
one shared **Operator** account (can only issue tickets/receipts - can't
change prices, ticket types, or receipt numbering). Both are enforced by
the Firestore rules above, not just hidden in the app, so this step
matters even if only you will ever use the Admin login.

The people actually using the app never see or type an email anywhere -
the Login screen only shows an Operator/Admin choice and a password field.
The "email" mentioned below is purely a backend requirement of Firebase's
login system (it needs an email-shaped ID string internally) - think of
it as a login ID, not a real inbox. You type it once, here, during setup,
and never again.

1. **Authentication -> Users -> Add user.** Create two users:
   - Admin login ID: `admin@sri-aishwarya-ticketing.local`, with a strong
     password only you know.
   - Operator login ID: `operator@sri-aishwarya-ticketing.local`, with a
     password you can share with counter staff.
   (These don't need to be real, working email addresses - just
   unique-looking strings in email format. Nobody will ever see or type
   them in the app itself.)
2. For each user you just created, click it and copy its **User UID**.
3. **Firestore Database -> Data** -> start a collection named `roles`.
   Add one document per account, using the **User UID as the document ID**
   (not an auto-ID):
   - Document ID: `<admin's UID>` → field `role` (string) = `admin`
   - Document ID: `<operator's UID>` → field `role` (string) = `operator`

Without this `roles` document, an account can sign in but the app will
tell them "Account not set up" and grant no access - by design, so a new
account never accidentally gets more access than intended.

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the Firebase values from step 1,
plus the two email addresses you used in step 2 (`VITE_ADMIN_EMAIL`,
`VITE_OPERATOR_EMAIL`). The actual passwords live in Firebase, not in this
file.

### 4. Run locally

```bash
npm install
npm run dev
```

Visit the printed local URL. To test on your phone, make sure your phone is
on the same wifi as your computer and visit the "Network" URL vite prints
(something like `http://192.168.x.x:5173`). Try logging in as both Admin
and Operator to confirm the Operator only sees the Issue Ticket screen.

### 5. Add your ticket types

Open `/admin` (Admin login only) and add each ticket type (name, category, price) - e.g.:

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

- `ticketTypes/{id}` - `{ serialNo, name, nameTamil, category, categoryTamil, kind, price, order, active }`
- `sales/{id}` - `{ ticketTypeId, ticketName, ticketNameTamil, kind, price, operator, name, nakshatra, phone, donorAddress, receiptNo, dateKey, printed, createdAt }`
- `counters/{ticketTypeId}` - `{ prefix, padding, count }` - one continuous
  receipt-number series per ticket type (see "Receipt numbering" above).
- `roles/{uid}` - `{ role }` - `"admin"` or `"operator"`, set by hand in
  the Firebase console (see "Setup" below).
- `devotees/{normalizedPhone}` - `{ phone, entries: [{ name, nakshatra, address }] }`
  - the phone lookup directory (see "Looking up existing devotees" above).

## Next steps you may want

- A "reprint" button on the dashboard for a specific sale.
- Export day/month sales to Excel (this codebase already uses SheetJS in
  other apps, so it's a quick add).
- A Settings screen for the printer UUIDs instead of the console workaround
  above.
- Role-based login (operator vs. admin) instead of one shared password, if
  you want to restrict who can edit ticket types.
