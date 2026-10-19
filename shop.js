// Customer page
(function () {
  const LANG_KEY = "shop_lang";
  const CART_KEY = "shop_cart";
  const $ = id => document.getElementById(id);

  let lang = loadPref(LANG_KEY, CFG.DEFAULT_LANG);
  if (!LANGS.includes(lang)) lang = CFG.DEFAULT_LANG;

  let catalog = null;
  let lastFetch = 0;
  let cart = {};
  try { cart = JSON.parse(loadPref(CART_KEY, "{}")) || {}; } catch (e) { cart = {}; }

  function saveCart() { savePref(CART_KEY, JSON.stringify(cart)); }

  // Drops unknown / sold-out items from the cart. Returns sold-out items removed.
  function pruneCart() {
    const removed = [];
    for (const id of Object.keys(cart)) {
      const it = catalog.byId.get(id);
      const q = cart[id];
      if (!it || !it.inStock || !(q > 0)) {
        if (it && !it.inStock && q > 0) removed.push(it);
        delete cart[id];
      } else {
        cart[id] = Math.min(CFG.MAX_QTY, q);
      }
    }
    saveCart();
    return removed;
  }

  function cartStats() {
    let count = 0, total = 0;
    for (const [id, q] of Object.entries(cart)) {
      const it = catalog && catalog.byId.get(id);
      if (!it) continue;
      count += q;
      total += it.price * q;
    }
    return { count, total };
  }

  function setLang(l) {
    lang = l;
    savePref(LANG_KEY, l);
    renderAll();
  }

  function renderHeader() {
    document.documentElement.lang = htmlLang(lang);
    const name = (CFG.SHOP_NAME && CFG.SHOP_NAME[lang]) || "";
    $("title").textContent = name;
    document.title = name;
    renderLangToggle($("lang"), lang, setLang);
  }

  function renderGrid() {
    const g = $("grid");
    if (!catalog) return;
    if (!catalog.list.length) {
      g.innerHTML = `<div class="msg">${esc(t(lang, "noItems"))}</div>`;
      return;
    }
    g.innerHTML = catalog.list.map(it => {
      const q = cart[it.id] || 0;
      const img = thumbUrl(it);
      const bottom = it.inStock
        ? `<div class="stepper">
             <button type="button" data-act="dec" aria-label="-" ${q <= 0 ? "disabled" : ""}>−</button>
             <span class="q">${q}</span>
             <button type="button" data-act="inc" aria-label="+" ${q >= CFG.MAX_QTY ? "disabled" : ""}>+</button>
           </div>`
        : `<div class="badge">${esc(t(lang, "soldOut"))}</div>`;
      return `<div class="card${it.inStock ? "" : " soldout"}" data-id="${esc(it.id)}">
          <div class="thumb"><span>${esc(it.id)}</span>${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>
          <div class="info">
            <div class="name">${esc(itemName(it, lang))}</div>
            <div class="price">${yen(it.price)}</div>
            ${bottom}
          </div>
        </div>`;
    }).join("");
  }

  function updateCard(id) {
    const card = $("grid").querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (!card) return;
    const q = cart[id] || 0;
    const qEl = card.querySelector(".q");
    if (qEl) qEl.textContent = q;
    const dec = card.querySelector('[data-act="dec"]');
    const inc = card.querySelector('[data-act="inc"]');
    if (dec) dec.disabled = q <= 0;
    if (inc) inc.disabled = q >= CFG.MAX_QTY;
  }

  function renderBar() {
    const { count, total } = cartStats();
    $("sum").innerHTML = `${count} ${esc(t(lang, "items"))}　<b>${yen(total)}</b>`;
    const btn = $("confirm");
    btn.textContent = t(lang, "confirm");
    btn.disabled = count === 0 || !catalog;
  }

  function renderModal() {
    if (!$("modal").classList.contains("open")) return;
    $("hint").textContent = t(lang, "showQr");
    $("edit").textContent = t(lang, "edit");
    $("neworder").textContent = t(lang, "newOrder");

    let rows = "", total = 0;
    for (const it of catalog.list) {
      const q = cart[it.id];
      if (!q) continue;
      const sub = it.price * q;
      total += sub;
      rows += `<tr><td>${esc(itemName(it, lang))}</td><td class="n">× ${q}</td><td class="n">${yen(sub)}</td></tr>`;
    }
    rows += `<tr class="total"><td>${esc(t(lang, "total"))}</td><td></td><td class="n">${yen(total)}</td></tr>`;
    $("summary").innerHTML = rows;
  }

  function renderAll() {
    renderHeader();
    renderGrid();
    renderBar();
    renderModal();
  }

  function openModal() {
    const code = encodeOrder(cart);
    const box = $("qr");
    box.innerHTML = "";
    new QRCode(box, { text: code, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    $("code").textContent = code;
    $("modal").classList.add("open");
    renderModal();
  }

  function closeModal() {
    $("modal").classList.remove("open");
  }

  async function loadCatalog() {
    catalog = await fetchCatalog();
    lastFetch = Date.now();
    return pruneCart();
  }

  async function onConfirm() {
    const btn = $("confirm");
    btn.disabled = true;
    btn.textContent = t(lang, "loading");
    let removed;
    try {
      removed = await loadCatalog();
    } catch (e) {
      alert(t(lang, "loadError"));
      renderBar();
      return;
    }
    renderGrid();
    renderBar();
    if (removed.length) {
      alert(t(lang, "removed") + "\n" + removed.map(i => "・" + itemName(i, lang)).join("\n"));
    }
    if (cartStats().count > 0) openModal();
  }

  async function init() {
    renderHeader();
    renderBar();
    $("grid").innerHTML = `<div class="msg">${esc(t(lang, "loading"))}</div>`;
    try {
      await loadCatalog();
      renderAll();
    } catch (e) {
      $("grid").innerHTML = `<div class="msg">${esc(t(lang, "loadError"))}<br><br>
        <button class="btn ghost" type="button" id="retry">${esc(t(lang, "retry"))}</button></div>`;
      $("retry").onclick = init;
    }
  }

  // Events
  $("grid").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.closest(".card").dataset.id;
    const it = catalog.byId.get(id);
    if (!it || !it.inStock) return;
    const q = cart[id] || 0;
    const next = btn.dataset.act === "inc" ? Math.min(CFG.MAX_QTY, q + 1) : Math.max(0, q - 1);
    if (next > 0) cart[id] = next; else delete cart[id];
    saveCart();
    updateCard(id);
    renderBar();
  });

  $("confirm").onclick = onConfirm;
  $("edit").onclick = closeModal;
  $("neworder").onclick = () => {
    if (!confirm(t(lang, "newOrderAsk"))) return;
    cart = {};
    saveCart();
    closeModal();
    renderGrid();
    renderBar();
  };

  // Refresh stock when the customer comes back to the tab after a while
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    if ($("modal").classList.contains("open")) return;
    if (Date.now() - lastFetch < 60000) return;
    try {
      await loadCatalog();
      renderGrid();
      renderBar();
    } catch (e) { /* keep current list */ }
  });

  init();
})();
