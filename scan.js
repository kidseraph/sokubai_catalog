// Staff scanner page
(function () {
  const LANG_KEY = "scan_lang";
  const $ = id => document.getElementById(id);

  let lang = loadPref(LANG_KEY, CFG.DEFAULT_LANG);
  if (!LANGS.includes(lang)) lang = CFG.DEFAULT_LANG;

  let scanner = null;
  let scanning = false;
  let handling = false;
  let hasResult = false;
  let last = null; // { state: "ok"|"invalid"|"error", order, catalog }

  function setLang(l) {
    lang = l;
    savePref(LANG_KEY, l);
    renderStatic();
    if (last) renderResult();
  }

  function renderStatic() {
    document.documentElement.lang = htmlLang(lang);
    $("title").textContent = t(lang, "scanTitle");
    document.title = t(lang, "scanTitle");
    renderLangToggle($("lang"), lang, setLang);
    $("start").textContent = t(lang, hasResult ? "scanNext" : "scanStart");
    $("manual-input").placeholder = t(lang, "manualPh");
    $("manual-btn").textContent = t(lang, "lookup");
  }

  async function startScan() {
    $("result").hidden = true;
    $("start").hidden = true;
    $("reader").hidden = false;
    if (!scanner) scanner = new Html5Qrcode("reader");
    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w, h) => {
            const s = Math.floor(Math.min(w, h) * 0.7);
            return { width: s, height: s };
          }
        },
        onDecode,
        () => {}
      );
      scanning = true;
    } catch (e) {
      $("reader").hidden = true;
      $("start").hidden = false;
      alert(t(lang, "cameraError") + "\n" + e);
    }
  }

  async function stopScan() {
    if (scanner && scanning) {
      try { await scanner.stop(); } catch (e) { /* already stopped */ }
      scanning = false;
    }
    $("reader").hidden = true;
  }

  async function onDecode(text) {
    if (handling) return;
    handling = true;
    await stopScan();
    await show(text);
    handling = false;
  }

  async function show(text) {
    hasResult = true;
    $("start").hidden = false;
    renderStatic();

    const res = $("result");
    res.hidden = false;
    res.innerHTML = `<div class="msg">${esc(t(lang, "loading"))}</div>`;

    const order = decodeOrder(text);
    if (!order) {
      last = { state: "invalid" };
      renderResult();
      return;
    }
    try {
      last = { state: "ok", order, catalog: await fetchCatalog() };
    } catch (e) {
      last = { state: "error" };
    }
    renderResult();
  }

  function renderResult() {
    const res = $("result");
    if (last.state === "invalid") {
      res.innerHTML = `<div class="msg bad-msg">${esc(t(lang, "invalid"))}</div>`;
      return;
    }
    if (last.state === "error") {
      res.innerHTML = `<div class="msg bad-msg">${esc(t(lang, "loadError"))}</div>`;
      return;
    }

    let rows = "", total = 0, count = 0, anyBad = false;
    for (const { id, qty } of last.order) {
      const it = last.catalog.byId.get(id);
      if (!it) {
        anyBad = true;
        rows += `<tr class="bad"><td><span class="nm">${esc(id)}</span><span class="tag">${esc(t(lang, "unknown"))}</span></td>
          <td class="n">× ${qty}</td><td class="n">-</td></tr>`;
        continue;
      }
      const sub = it.price * qty;
      if (!it.inStock) {
        anyBad = true;
        rows += `<tr class="bad"><td><span class="nm">${esc(itemName(it, lang))}</span><span class="tag">${esc(t(lang, "soldOut"))}</span></td>
          <td class="n">× ${qty}</td><td class="n">${yen(sub)}</td></tr>`;
        continue;
      }
      total += sub;
      count += qty;
      rows += `<tr><td>${esc(itemName(it, lang))}</td><td class="n">× ${qty}</td><td class="n">${yen(sub)}</td></tr>`;
    }
    rows += `<tr class="total"><td>${esc(t(lang, "total"))}</td><td class="n">${count} ${esc(t(lang, "items"))}</td><td class="n">${yen(total)}</td></tr>`;

    res.innerHTML = `<table>${rows}</table>` +
      (anyBad ? `<p class="note">${esc(t(lang, "excludedNote"))}</p>` : "");
  }

  // Manual entry (also works with USB/Bluetooth scanners that type + Enter)
  $("manual").addEventListener("submit", async e => {
    e.preventDefault();
    const v = $("manual-input").value.trim();
    if (!v) return;
    $("manual-input").value = "";
    await stopScan();
    await show(v);
  });

  $("start").onclick = startScan;

  renderStatic();
})();
