# Palmwine Merchants & Flames — Website

A modern, mobile‑first site built with vanilla HTML/CSS/JS. It includes an instant booking quote generator, WhatsApp sharing (summary + itemized), and a payment confirmation flow with Paystack (Inline and Standard redirect) plus secure server‑side verification via Netlify Functions. The booking quote now auto‑fills the payment form so clients can pay the recommended amount in one step.

## Structure
- `index.html` — Home with hero, about, cocktails, cuisine, events, mission, contact/booking CTA.
- `booking.html` — Booking details form → computes quote/invoice and exposes a Payment Confirmation form.
- `events.html` — Ticket purchase/confirmation using the same payment form logic and IDs as booking.
- `menu.html`, `about.html`, `contact.html` — Additional pages.
- `styles.css` — Afrocentric‑modern palette and layout.
- `script.js` — All interactivity: gallery slider, lightbox, hero rotation/parallax, quote compute, WhatsApp share, payment + Paystack integration.
- `img/` — Brand images and assets.
- `netlify/functions/verify-payment.js` — Verifies Paystack references server‑side.
- `netlify/functions/init-payment.js` — Initializes Paystack Standard redirect (fallback checkout).
- `netlify.toml` — Netlify config (functions directory + bundler).

## Features
- __Instant quote (booking)__: Computes line items by package/add‑ons, delivery by distance, VAT, total, and required deposit. Renders a printable invoice.
- __WhatsApp sharing__: Share quote summary or an __itemized__ breakdown (qty × unit = amount for each line).
- __Booking → Payment auto‑fill__: After “Compute Quote,” the Payment Confirmation form auto‑fills payer details and a recommended amount (deposit by default, falls back to total).
- __Paystack payments__: Inline v1/v2 popup, with fallback to Standard redirect. After success, the reference auto‑fills and verification runs automatically.
- __Server verification__: Netlify Function securely verifies Paystack references and returns status/amount/time.
- __Events flow__: `events.html` reuses the same payment form IDs, so all Paystack + WhatsApp logic works there too.

## Run locally
Option A — Static preview (no functions):
- Open `index.html` directly in your browser.
- PowerShell: `start .\index.html`

Option B — Full preview with Netlify Functions:
1) Install Node.js (LTS) and Netlify CLI: `npm i -g netlify-cli`
2) From project root, run: `netlify dev`
   - Serves the site and proxies `/.netlify/functions/*` locally.
   - Good for testing Paystack verification and Standard redirect.

## Customize
 - __Content__: edit the HTML files directly.
 - __Colors/typography__: tweak variables in `styles.css` `:root{}`.
 - __Quote math__: adjust business/pricing in `script.js` under `BUSINESS` and `PRICING`.
 - __WhatsApp__: change default number in `toWhatsAppLink()`.
 - __Formspree (optional)__: add your Formspree ID to `booking.html` Payment Confirmation form attribute `data-formspree="YOUR_ID"` to enable form submits (otherwise WhatsApp is used).

## Deployment
Host on any static provider (GitHub Pages, Netlify, Vercel). For full Paystack flows, Netlify is recommended.

### Netlify setup
- Link your GitHub repo or drag‑and‑drop the folder in Netlify.
- `netlify.toml` already points functions to `netlify/functions/` using `esbuild`.

Environment variables (Site settings → Build & deploy → Environment):
- `PAYSTACK_SECRET_KEY` = your Paystack secret key (test or live). Keep it server‑side only.

Pages that use Paystack must include a public key tag:
```html
<meta name="paystack-public-key" content="pk_test_xxx_or_pk_live_xxx" />
```

Functions and endpoints:
- Verify: `/.netlify/functions/verify-payment` → checks a Paystack reference securely.
- Init Standard: `/.netlify/functions/init-payment` → creates a Paystack Standard session and redirects back with `?ps_ref=...`.

Testing tips:
- Use a test public key in the `<meta>` tag on `booking.html` and `events.html`.
- In Payment Confirmation, click “Pay with Card” to open Inline; after success, the reference auto‑fills and verifies.
- If Inline fails to load, the code falls back to Standard redirect; on return, `ps_ref` is read and verified.
- The WhatsApp button always reflects the latest form state, including verification summary when Paystack is used.

Frontend flows:
- __Booking__: After you click “Compute Quote,” the Payment Confirmation form auto‑fills: Quote ID, payer name/phone/email, recommended amount (deposit by default), and a helpful note.
- __Paystack__: Select “Paystack,” use the Card button. On success, `txRef` is filled and verification runs automatically. Verify button is hidden for Paystack; manual refs are for non‑Paystack methods.
- __Events__: `events.html` reuses the same IDs, so the same Paystack + verification + WhatsApp logic applies.

## Contact Details
- Phone/WhatsApp: `+234 803 949 0349`
- Email: `Palmwinemerchants@gmail.com`
- Instagram: `@palmwinemerchants`
