// ===== Shop settings: edit this file =====
window.SHOP_CONFIG = {
  // Google Sheet > File > Share > Publish to web > CSV link.
  // Leave as-is to use catalog-sample.csv for testing.
  CATALOG_CSV_URL: "PASTE_PUBLISHED_CSV_URL_HERE",

  // Folder for thumbnails. If the Sheet's thumbnail cell is a full URL
  // (https://...), it is used as-is instead.
  IMAGE_BASE: "img/",

  // Max quantity per item
  MAX_QTY: 99,

  // ja / en / zh
  DEFAULT_LANG: "ja",

  // Header title on the customer page
  SHOP_NAME: { ja: "ショップ", en: "Shop", zh: "商店" }
};
