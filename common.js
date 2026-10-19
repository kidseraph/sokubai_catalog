// Shared code for index.html (customer) and scan.html (staff)
const CFG = window.SHOP_CONFIG;
const LANGS = ["ja", "en", "zh"];
const LANG_LABEL = { ja: "日本語", en: "EN", zh: "中文" };

const UI = {
  ja: {
    items: "点",
    soldOut: "売り切れ",
    confirm: "注文を確定",
    edit: "戻る",
    newOrder: "新しい注文",
    newOrderAsk: "カートを空にして新しい注文を始めますか？",
    showQr: "このQRコードをスタッフにお見せください",
    total: "合計",
    loading: "読み込み中…",
    loadError: "商品リストを読み込めませんでした。",
    retry: "再読み込み",
    noItems: "商品がありません",
    removed: "売り切れのため、次の商品をカートから削除しました：",
    scanTitle: "注文スキャナー",
    scanStart: "カメラで読み取る",
    scanNext: "次を読み取る",
    manualPh: "コードを入力",
    lookup: "表示",
    invalid: "無効なQRコードです",
    unknown: "不明な商品",
    cameraError: "カメラを起動できませんでした",
    excludedNote: "赤字の商品は合計に含まれていません"
  },
  en: {
    items: "items",
    soldOut: "Sold out",
    confirm: "Confirm order",
    edit: "Back",
    newOrder: "New order",
    newOrderAsk: "Clear the cart and start a new order?",
    showQr: "Please show this QR code to staff",
    total: "Total",
    loading: "Loading…",
    loadError: "Couldn't load the item list.",
    retry: "Retry",
    noItems: "No items available",
    removed: "These items sold out and were removed from your cart:",
    scanTitle: "Order Scanner",
    scanStart: "Scan with camera",
    scanNext: "Scan next",
    manualPh: "Enter code",
    lookup: "Show",
    invalid: "Invalid QR code",
    unknown: "Unknown item",
    cameraError: "Couldn't start the camera",
    excludedNote: "Items in red are not included in the total"
  },
  zh: {
    items: "件",
    soldOut: "已售完",
    confirm: "確認訂單",
    edit: "返回",
    newOrder: "新訂單",
    newOrderAsk: "要清空購物車並開始新訂單嗎？",
    showQr: "請向工作人員出示此QR碼",
    total: "合計",
    loading: "載入中…",
    loadError: "無法載入商品列表。",
    retry: "重新載入",
    noItems: "目前沒有商品",
    removed: "以下商品已售完，已從購物車移除：",
    scanTitle: "訂單掃描",
    scanStart: "用相機掃描",
    scanNext: "掃描下一筆",
    manualPh: "輸入代碼",
    lookup: "顯示",
    invalid: "無效的QR碼",
    unknown: "未知商品",
    cameraError: "無法啟動相機",
    excludedNote: "紅色商品不計入合計"
  }
};

function t(lang, key) {
  return (UI[lang] && UI[lang][key]) || UI.ja[key] || key;
}

function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function savePref(key, val) {
  try { localStorage.setItem(key, val); } catch (e) { /* storage unavailable */ }
}

function yen(n) {
  return "¥" + Number(n).toLocaleString("ja-JP");
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function catalogUrl() {
  const u = (CFG.CATALOG_CSV_URL || "").trim();
  return /^https?:\/\//i.test(u) ? u : "catalog-sample.csv";
}

function cell(row, key) {
  return String(row[key] == null ? "" : row[key]).trim();
}

// Loads the catalog. Returns { list: [...in sheet order], byId: Map }
async function fetchCatalog() {
  const base = catalogUrl();
  const url = base + (base.includes("?") ? "&" : "?") + "_=" + Date.now();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase()
  });

  const list = [];
  const byId = new Map();
  for (const r of parsed.data) {
    const id = cell(r, "item_id");
    if (!id || byId.has(id)) continue;
    const item = {
      id,
      thumb: cell(r, "thumbnail"),
      names: { ja: cell(r, "name_jp"), en: cell(r, "name_en"), zh: cell(r, "name_cn") },
      price: parseInt(cell(r, "price").replace(/[^\d]/g, ""), 10) || 0,
      inStock: /^(true|yes|y|1|✓|☑|o|〇)$/i.test(cell(r, "in_stock"))
    };
    list.push(item);
    byId.set(id, item);
  }
  return { list, byId };
}

function itemName(item, lang) {
  return item.names[lang] || item.names.ja || item.names.en || item.names.zh || item.id;
}

function thumbUrl(item) {
  if (!item.thumb) return "";
  return /^https?:\/\//i.test(item.thumb) ? item.thumb : (CFG.IMAGE_BASE || "") + item.thumb;
}

// ===== QR format: "v1;A1:2,B3:1" (item IDs and quantities only) =====
const QR_PREFIX = "v1;";

function encodeOrder(cart) {
  return QR_PREFIX + Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => id + ":" + q)
    .join(",");
}

// Returns [{id, qty}] or null if the code is malformed
function decodeOrder(text) {
  text = String(text || "").trim();
  if (!text.startsWith(QR_PREFIX)) return null;
  const body = text.slice(QR_PREFIX.length);
  if (!body) return null;

  const out = new Map();
  for (const part of body.split(",")) {
    const i = part.lastIndexOf(":");
    if (i <= 0) return null;
    const id = part.slice(0, i).trim();
    const qStr = part.slice(i + 1).trim();
    if (!id || !/^\d+$/.test(qStr)) return null;
    const q = parseInt(qStr, 10);
    if (q < 1 || q > CFG.MAX_QTY) return null;
    out.set(id, Math.min(CFG.MAX_QTY, (out.get(id) || 0) + q));
  }
  return [...out].map(([id, qty]) => ({ id, qty }));
}

function renderLangToggle(el, current, onPick) {
  el.innerHTML = LANGS.map(l =>
    `<button type="button" data-lang="${l}" class="${l === current ? "on" : ""}">${LANG_LABEL[l]}</button>`
  ).join("");
  el.onclick = e => {
    const b = e.target.closest("button[data-lang]");
    if (b) onPick(b.dataset.lang);
  };
}

function htmlLang(l) {
  return l === "zh" ? "zh-Hant" : l;
}
