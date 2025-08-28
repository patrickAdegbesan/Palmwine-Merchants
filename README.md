# Palmwine Merchants & Flames — Website

A simple, responsive landing site built with vanilla HTML/CSS/JS.

## Structure
- `index.html` — Main page with sections: Hero, About, Cocktails, Cuisine, Events, Mission, Contact/Bookings.
- `styles.css` — Afrocentric-modern palette and layout.
- `script.js` — Mobile menu, smooth scroll, and simple inquiry handler.
- `img/` — Brand images (`comp_logo.jpg` used in header, `party_logo.jpg` used in Events + hero bg).

## Run locally
Just open `index.html` in your browser.

Windows PowerShell:
```
start .\index.html
```

## Customize
- Text: update content directly in `index.html`.
- Colors/typography: tweak variables in `styles.css` `:root{}`.
- Form: replace `handleInquiry()` in `script.js` with your backend or a service like Formspree/Netlify Forms.

## Deployment
You can host on any static host (GitHub Pages, Netlify, Vercel). On Netlify, drag the folder to the dashboard or link a repo.

### Payment Verification (Paystack + Netlify Functions)
This site includes a Netlify Function that verifies Paystack transaction references securely.

- Functions directory: `netlify/functions/`
- Verify endpoint (after deploy): `/.netlify/functions/verify-payment`
- Config file: `netlify.toml`

Steps (Netlify):
1. Add environment variable in Site settings → Build & deploy → Environment:
  - `PAYSTACK_SECRET_KEY` = your Paystack secret key (test or live). Do NOT expose this in frontend code.
2. Deploy the site. Netlify will auto-publish and serve the function.
3. Test the function (example fetch):
  ```js
  fetch('/.netlify/functions/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference: 'PAYSTACK_REF' })
  }).then(r=>r.json()).then(console.log);
  ```

Frontend flow (booking page):
- In Payment Confirmation, select Method = "Paystack".
- Enter the Paystack transaction reference and click "Verify".
- The status appears below the reference field.
- On submit, verification metadata is sent (or included in WhatsApp message):
  - `verification_gateway`, `verification_reference`, `verification_status`, `verification_amount`, `verification_currency`, `verification_paid_at`.

Notes:
- For local testing of functions, use Netlify CLI (`netlify dev`). Otherwise, verification works on the deployed site.
- Amount from Paystack is converted from kobo to naira in the response.

## Contact Details
- Phone/WhatsApp: `+234 803 949 0349`
- Email: `Palmwinemerchants@gmail.com`
- Instagram: `@palmwinemerchants`
- Bank: Providus Bank — Account Name: Palmwine Merchants Co. — Account Number: 5401335797
