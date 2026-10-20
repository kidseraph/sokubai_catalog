// ===== Shop settings: edit this file =====
window.SHOP_CONFIG = {
  // Google Sheet gviz endpoint (real-time, no 5-min cache).
  CATALOG_CSV_URL: "https://docs.google.com/spreadsheets/d/18EWxr5OL7K8PsOgh_PLUo0EcDKaXeU8biYdyZrMeb-8/gviz/tq?tqx=out:csv&sheet=2026YFA",

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
