# The Sound of Universe Trust — Website

Static site (HTML/CSS/JS). No build step. Upload this whole folder to any host
(Netlify, GitHub Pages, Hostinger, cPanel, etc.).

## Where to edit things

| What | File |
|---|---|
| Phone, WhatsApp, email, social links, volunteer Google Form | `assets/js/config.js` |
| Razorpay link / Key ID | `assets/js/config.js` → `razorpay` |
| UPI ID | `assets/js/config.js` → `upi.id` |
| UPI QR image | save as `assets/img/upi-qr.png` |
| Bank details | `assets/js/config.js` → `bank` |
| Impact numbers (meals, volunteers) | `assets/js/config.js` → `stats` |
| English text | `index.html` |
| Tamil text | `assets/js/i18n.js` (same keys as `data-i18n` in index.html) |
| Colours / fonts | top of `assets/css/style.css` (`:root`) |

## Photos
- Gallery: the first 6 photos always show. Photos marked `data-more hidden`
  appear when the visitor clicks "View more photos". To add one, copy an
  existing `<li class="gal gal--more …" data-more hidden>` block, change the
  image path/alt/caption, and put the image in `assets/img/`. Keep images
  under ~400 KB. Use `gal--tall` for portrait photos, `gal--wide` for landscape.
- Founder photos: replace the initials `GL` / `AM` inside `.founder__avatar`
  with `<img src="assets/img/gandeeban.jpg" alt="">`.

## Razorpay
- Easiest: Razorpay Dashboard → Payment Pages → create a donation page → paste
  the link into `razorpay.paymentLink`.
- Popup with chosen amount: paste the **Key ID** (never the Key Secret) into
  `razorpay.keyId` and enable auto-capture in Razorpay settings.

After editing CSS/JS, bump `?v=1.1.0` in `index.html` so visitors get the new files.

## Preview locally
```
python -m http.server 5510
```
then open http://localhost:5510
