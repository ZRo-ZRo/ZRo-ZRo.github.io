"use strict";

(() => {
  const content = window.ZRORO_CONTENT || { translations: [], news: [] };
  const translations = Array.isArray(content.translations) ? content.translations : [];
  const news = Array.isArray(content.news) ? content.news : [];
  const $ = (selector) => document.querySelector(selector);
  const number = new Intl.NumberFormat("ar");
  const date = new Intl.DateTimeFormat("ar", { dateStyle: "long" });
  let activeFilter = "all";

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || "").trim(), location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function normalize(value = "") {
    return String(value).toLowerCase().normalize("NFKD").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
  }

  function card(item) {
    const slug = encodeURIComponent(item.slug || "");
    const cover = safeUrl(item.cover) || "assets/zro-zro-logo.webp";
    return `<article class="translation-card"><a href="?game=${slug}" data-game="${escapeHtml(item.slug)}"><div class="card-cover"><img src="${escapeHtml(cover)}" alt="غلاف ${escapeHtml(item.title)}" width="720" height="450" loading="lazy" decoding="async"><div class="badges">${item.featured ? '<span class="badge featured">مميز</span>' : ""}${item.isNew ? '<span class="badge">جديد</span>' : ""}<span class="badge">مجاني</span></div></div><div class="card-content"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary || "")}</p><div class="card-meta"><span class="free-label">تحميل مجاني</span><span class="card-arrow">←</span></div></div></a></article>`;
  }

  function visibleTranslations() {
    const query = normalize($("#catalog-search").value);
    return translations.filter((item) => {
      if (activeFilter === "featured" && !item.featured) return false;
      if (activeFilter === "new" && !item.isNew) return false;
      return !query || normalize(`${item.title || ""} ${item.summary || ""} ${item.genre || ""}`).includes(query);
    });
  }

  function renderLibrary() {
    const list = visibleTranslations();
    $("#catalog-grid").innerHTML = list.map(card).join("");
    $("#catalog-empty").hidden = list.length !== 0;
    $("#library-count").textContent = `${number.format(translations.length)} تعريب`;
    $("#results-status").textContent = list.length && list.length !== translations.length ? `${number.format(list.length)} نتيجة` : "";
  }

  function renderNews() {
    $("#news-grid").innerHTML = news.map((item) => {
      let published = "";
      try { published = item.date ? date.format(new Date(item.date)) : ""; } catch { published = ""; }
      return `<article class="news-card">${published ? `<time>${escapeHtml(published)}</time>` : ""}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body || "")}</p></article>`;
    }).join("");
    $("#news-empty").hidden = news.length !== 0;
  }

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(window.__zroToast);
    window.__zroToast = setTimeout(() => element.classList.remove("show"), 2400);
  }

  function openDetail(slug, push = true) {
    const item = translations.find((entry) => entry.slug === slug);
    if (!item) {
      if (slug) toast("التعريب غير موجود.");
      return;
    }
    const cover = safeUrl(item.cover) || "assets/zro-zro-logo.webp";
    const gallery = Array.isArray(item.gallery) ? item.gallery.slice(0, 4).map(safeUrl).filter(Boolean) : [];
    $("#detail-content").innerHTML = `<div class="detail-grid"><img class="detail-cover" src="${escapeHtml(cover)}" alt="غلاف ${escapeHtml(item.title)}" width="720" height="450"><div class="detail-info"><p class="eyebrow">تعريب مجاني</p><h1>${escapeHtml(item.title)}</h1><p class="lead">${escapeHtml(item.summary || "")}</p><div class="detail-description">${escapeHtml(item.description || item.summary || "")}</div><div class="detail-actions"><button class="button primary" id="download-button" type="button">تنزيل التعريب</button><button class="button" id="share-button" type="button">نسخ الرابط</button></div></div></div>${gallery.length ? `<h2 class="gallery-title">صور التعريب داخل اللعبة</h2><div class="detail-gallery">${gallery.map((src, index) => `<button class="gallery-button" type="button" data-image="${escapeHtml(src)}"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.title)} — الصورة ${index + 1}" width="720" height="405" loading="lazy"><span>الصورة ${index + 1}</span></button>`).join("")}</div>` : ""}`;
    $("#detail-view").hidden = false;
    document.body.style.overflow = "hidden";
    $("#detail-view").scrollTop = 0;
    if (push) history.pushState({ game: slug }, "", `?game=${encodeURIComponent(slug)}`);
    $("#download-button").addEventListener("click", () => {
      const url = safeUrl(item.downloadUrl);
      if (!url) { toast("رابط التحميل غير متاح حاليًا."); return; }
      window.open(url, "_blank", "noopener,noreferrer");
    });
    $("#share-button").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(location.href); toast("تم نسخ رابط التعريب."); }
      catch { toast("تعذر نسخ الرابط."); }
    });
  }

  function closeDetail(push = true) {
    $("#detail-view").hidden = true;
    document.body.style.overflow = "";
    if (push) history.pushState({}, "", `${location.pathname}#library`);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-game]");
    if (link) { event.preventDefault(); openDetail(link.dataset.game); }
    const image = event.target.closest("[data-image]");
    if (image) {
      $("#lightbox-image").src = image.dataset.image;
      $("#lightbox").hidden = false;
    }
  });
  $("#detail-back").addEventListener("click", () => closeDetail());
  $("#lightbox-close").addEventListener("click", () => $("#lightbox").hidden = true);
  $("#lightbox").addEventListener("click", (event) => { if (event.target === $("#lightbox")) $("#lightbox").hidden = true; });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#lightbox").hidden) $("#lightbox").hidden = true;
    else if (!$("#detail-view").hidden) closeDetail();
  });
  $("#catalog-search").addEventListener("input", renderLibrary, { passive: true });
  $("#filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("is-active", item === button));
    renderLibrary();
  });
  window.addEventListener("popstate", () => {
    const slug = new URLSearchParams(location.search).get("game");
    if (slug) openDetail(slug, false); else closeDetail(false);
  });

  renderLibrary();
  renderNews();
  $("#year").textContent = new Date().getFullYear();
  const initialSlug = new URLSearchParams(location.search).get("game");
  if (initialSlug) openDetail(initialSlug, false);
  requestAnimationFrame(() => $("#page-loader").classList.add("is-done"));
})();
