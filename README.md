# QR Shop

- `index.html`: customer page (catalog, cart, QR)
- `scan.html`: staff scanner (camera or typed code)
- `config.js`: the only file you normally edit

## Setup (PC, once)

1. **Google Sheet**: first row must be exactly
   `item_id | thumbnail | name_jp | name_en | name_cn | price | in_stock`
   - `in_stock`: Insert > Checkbox
   - `price`: plain number (500, not ¥500 is safest)
   - `item_id`: letters/numbers only (no commas or colons), never reuse an old ID
   - `thumbnail`: a filename in `img/` (e.g. `A1.png`) or a full image URL. Blank shows the ID.
2. **Publish**: File > Share > Publish to web > pick the sheet tab > **CSV** > Publish. Copy the link.
3. Paste the link into `CATALOG_CSV_URL` in `config.js`.
4. Put images in an `img/` folder next to `index.html`.
5. **Deploy to GitHub Pages**: new repo > upload all files > Settings > Pages > Branch: main > Save.

Customers open `https://<you>.github.io/<repo>/`, staff open `.../scan.html`.

## Day to day (iPhone)

Edit names, prices, or tick/untick `in_stock` in the Google Sheets app.
Changes appear within about 5 minutes. No redeploy needed.

## Local testing

Pages must be served over http (not opened as files):

    python -m http.server 8000

Then open http://localhost:8000. Without a Sheet link, `catalog-sample.csv` is used.

## Notes

- QR content is `v1;A1:2,B2:1` (item IDs and quantities only). Prices and names
  always come from the Sheet at scan time.
- Sold-out or unknown items in a scanned QR show in red and are excluded from the total.
- The 中文 UI text is Traditional Chinese; edit `UI.zh` in `common.js` to change it.
