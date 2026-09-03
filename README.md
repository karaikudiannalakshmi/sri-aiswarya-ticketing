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
- **Recognition Letters** (`/letters`, Admin only) - lists donors/devotees
  who qualify for a thank-you letter based on real transaction totals.
- **Devotee Directory** (`/devotees`, Admin only) - bulk-import names and
  phone numbers into the same lookup directory used on the Issue Ticket
  screen.

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
  Numbering, Recognition Letters, Devotee Directory, and Issue Ticket.
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
  etc). The operator just taps it and issues.
- **Donation** - the operator is asked for the **donor's name and
  address** when issuing, and can enter the actual amount given (the
  price set in `/admin` is only a suggested starting value, editable per
  donation). The donor's name prints on the receipt and appears in the
  Excel export.

## Receipt numbering (audit trail)

Ticket and donation receipts each run on their own continuous number
series that never resets by day or month - the same way a pre-printed
paper ticket book runs continuously until it's used up. **All Puja/Ticket
types share one series, and all Donations share a separate one** - not
one series per individual ticket type, since with a large catalog (dozens
or hundreds of items) that would mean setting up numbering individually
for every single one before it could be issued.

Go to **Receipt Numbering** in the sidebar to set this up before you go
live:
- If this is a fresh start, leave "Next number" as 1 for both series.
- If you're continuing from existing printed ticket/donation books, set
  "Next number" to one more than the last number in your paper books, so
  the audit trail continues without a gap.
- Prefix and digit-padding are cosmetic (e.g. prefix `T-` with 6 digits
  gives `T-000001`) - leave Prefix blank for plain numbers.

After initial setup, this page should rarely be touched again - only use
it again to correct a genuine mistake, and expect to explain any change to
whoever audits the accounts.

## Donation receipts look different from ticket receipts

A donation receipt is headed "DONATION RECEIPT / நன்கொடை ரசீது" and leads
with the donor's name, address, and phone rather than a ticket name, since
it's a record of what someone gave rather than a ticket for something
they're attending.

Puja/Archanai-style tickets also collect the devotee's **phone number**
and **name** (both required), plus an optional **Nakshatra (birth star)**
- picked from a dropdown of the standard 27 nakshatras (in Tamil, e.g.
"கார்த்திகை") rather than typed freely, so records stay consistent for
future search/reports. Phone number is required on every ticket and
donation, since it's the key used to look devotees up later and to build
the phone directory (see below).

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

The **Devotee Directory** admin page (`/devotees`) lets you bulk-import
names and phone numbers from an existing spreadsheet (e.g. a donor/
sponsor contact list) directly into this same directory, so lookups work
for people even before they've ever bought a ticket through the app.

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

The temple name is printed **Tamil-only** (ஸ்ரீ ஐசுவர்ய லட்சுமி
திருக்கோயில்) on receipts and throughout the app's visible UI (sidebar,
login screen) - this was a deliberate choice, not a limitation.

Practical effects of the bitmap approach:
- Printing takes slightly longer than plain text, typically well under a
  second extra.
- Add both an English and a Tamil name for each ticket type in `/admin` -
  the Tamil name is optional; if left blank, only English prints.
- The receipt bitmap defaults to 384 dots wide (58mm paper). If your
  printer uses 80mm paper, change the default in
  `src/lib/receiptImage.js` (`DEFAULT_WIDTH_DOTS = 576`).

## Two ways to print - phone (Bluetooth) or PC (USB) - or a regular printer

The Ticket Issue screen (`/issue`) works from either a phone or a PC, and
can connect to either kind of thermal printer:

- **Bluetooth** - for a phone-based counter. Needs Chrome on **Android**
  (Web Bluetooth isn't supported in Safari on iPhone/iPad at all).
- **USB** - for a PC-based counter with the printer plugged in via cable.
  Needs desktop **Chrome or Edge** (Web Serial isn't supported in Firefox
  or Safari).

For a **regular (non-thermal) printer** - a laser or inkjet, e.g. for
testing the receipt format on plain paper - there's also a "Print via
System Dialog instead" link that appears after issuing a ticket. This
opens the normal OS print dialog (any installed printer can be selected)
instead of talking to the printer directly - no pairing or COM port
needed.

## Bulk-loading a large price list

For a big tariff sheet (tens or hundreds of poojas/services), adding them
one at a time in the form gets tedious fast. Instead, on **Manage Ticket
Types**:

1. Click **Download Template** - an Excel file with the right column
   headers and one filled-in example row.
2. Fill in one row per item: Serial No, Name (English), Name (Tamil),
   Category (English), Category (Tamil), Kind (`puja` or `donation`), and
   Price.
3. Click **Upload Filled Template** and select your file.

Re-uploading the same file later is safe - rows are matched by Serial No,
so an existing item gets updated in place instead of creating a
duplicate.

For rows with a Serial No that doesn't match anything existing, the
import falls back to matching by exact name against ticket types that
don't have a serial number yet - so an old item gets renumbered in place
rather than duplicated.

**"Replace entire list" checkbox** - check this before uploading if the
file you're uploading should become the *whole* catalog: anything
currently in the app that ISN'T matched by a row in the file gets deleted
after the import. There's a confirmation prompt before this runs.

## Quick-pick by serial number

On the Issue Ticket screen, typing a Serial No or name into the box at
the top shows live matches with prices - tap one to select instantly,
faster than scrolling through categories. The full categorized list is
tucked behind a "Browse all tickets" link, collapsed by default.

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com), create
   a new project.
2. Enable **Firestore Database** (production mode).
3. **Build -> Authentication -> Sign-in method** -> enable **Email/Password**.
4. Project settings -> add a Web app -> copy the config values.
5. Deploy the security rules in `firestore.rules` (Firestore -> Rules tab,
   paste the contents, publish).

### 2. Create the Admin and Operator accounts

The people actually using the app never see or type an email anywhere -
the Login screen only shows an Operator/Admin choice and a password field.

1. **Authentication -> Users -> Add user.** Create two users with any
   unique email-shaped login ID, e.g. `admin@sri-aishwarya-ticketing.local`
   and `operator@sri-aishwarya-ticketing.local`, each with its own password.
2. For each user, copy its **User UID**.
3. **Firestore Database -> Data** -> collection `roles` -> one document per
   account, with the **User UID as the document ID**, and a field `role`
   (string) = `admin` or `operator`.

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the Firebase values plus the two
login emails from step 2.

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Add your ticket types

Open `/admin` (Admin login) and add your ticket types, or bulk-import via
Excel (see "Bulk-loading a large price list" above).

### 6. Deploy

Push to GitHub, then import the repo in Vercel. Add the same environment
variables as **plain** env vars (not "Sensitive").

## Data model (Firestore)

- `ticketTypes/{id}` - `{ serialNo, name, nameTamil, category, categoryTamil, kind, price, order, active }`
- `sales/{id}` - `{ ticketTypeId, ticketName, ticketNameTamil, kind, price, operator, name, nakshatra, phone, donorAddress, receiptNo, dateKey, printed, createdAt }`
- `counters/ticketSeries` and `counters/donationSeries` - `{ prefix, padding, count }` -
  the two shared receipt-number series (see "Receipt numbering" above).
- `roles/{uid}` - `{ role }` - `"admin"` or `"operator"`, set by hand in
  the Firebase console (see "Setup" above).
- `devotees/{normalizedPhone}` - `{ phone, entries: [{ name, nakshatra, address }] }`
  - the phone lookup directory (see "Looking up existing devotees" above).

## Next steps you may want

- A "reprint" button on the dashboard for a specific sale.
- Letter generation on the Recognition Letters page, once wording is final.
- Role-based login (individual operator accounts) instead of one shared
  password, if you want per-person accountability beyond the "Operator
  name" field.
