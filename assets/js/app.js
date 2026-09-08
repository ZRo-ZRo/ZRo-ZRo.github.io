const $ = (s) => document.querySelector(s);
const numberFormat = new Intl.NumberFormat('ar', { notation: 'compact', maximumFractionDigits: 1 });
const standardFormat = new Intl.NumberFormat('ar');
const fmt = (n) => Number(n || 0) >= 10000 ? numberFormat.format(Number(n || 0)) : standardFormat.format(Number(n || 0));
let allItems = [];
let activeCategory = 'الكل';
let searchTimer = 0;

function escapeHTML(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function normalizeSearch(v='') {
  return String(v)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

function card(item) {
  const href = `details.html?id=${encodeURIComponent(item.slug || item.id)}`;
  return `<article class="game-card modern-card">
    <a href="${href}" aria-label="${escapeHTML(item.title)}">
      <div class="cover-wrap modern-cover">
        <img src="${escapeHTML(item.cover_url || 'assets/demo/cover-1.svg')}" alt="غلاف ${escapeHTML(item.title)}" loading="lazy" decoding="async">
        <span class="cover-shade"></span>
        <div class="badges">
          ${item.featured ? '<span class="badge badge-green">مميز</span>' : ''}
          <span class="badge">${escapeHTML(item.status || 'متاح')}</span>
        </div>
      </div>
      <div class="game-content modern-content">
        <div class="card-topline">
          <span class="card-category">${escapeHTML(item.category || 'عام')}</span>
          <span class="card-version">${escapeHTML(item.version ? 'v' + item.version : '—')}</span>
        </div>
        <h3 dir="auto">${escapeHTML(item.title)}</h3>
        <div class="game-ar" dir="auto">${escapeHTML(item.arabic_title || '')}</div>
        <p>${escapeHTML(item.short_description || '')}</p>
        <div class="meta modern-meta">
          <div class="metrics"><span>◉ <b>${fmt(item.views)}</b></span><span>↓ <b>${fmt(item.downloads)}</b></span></div>
          <span class="arrow">←</span>
        </div>
      </div>
    </a>
  </article>`;
}

function render() {
  const q = normalizeSearch($('#searchInput').value);
  const list = allItems.filter(x => {
    const categoryOK = activeCategory === 'الكل' || (x.category || '') === activeCategory;
    return categoryOK && (!q || x.__search.includes(q));
  });
  $('#libraryGrid').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">لا توجد نتائج مطابقة للبحث أو التصنيف المحدد.</div>';
  $('#resultsCount').textContent = `${fmt(list.length)} تعريب`;
}

function scheduleRender() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 70);
}

function buildFilters() {
  const categories = [...new Set(allItems.map(x => x.category).filter(Boolean))];
  $('#filters').innerHTML = ['الكل', ...categories].map((x,i) => `<button class="chip ${i===0?'active':''}" data-category="${escapeHTML(x)}">${escapeHTML(x)}</button>`).join('');
  $('#filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-category]'); if (!btn) return;
    activeCategory = btn.dataset.category;
    document.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
}

(async function init(){
  try {
    if (Zero9DB.isDemo) $('#demoBanner').hidden = false;
    const raw = await Zero9DB.listLocalizations();
    allItems = raw.slice().sort((a, b) => {
      const f = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (f) return f;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }).map(item => ({
      ...item,
      __search: normalizeSearch(`${item.title || ''} ${item.arabic_title || ''} ${item.short_description || ''} ${item.category || ''}`)
    }));

    buildFilters();
    render();
    $('#heroGames').textContent = fmt(allItems.length);
    $('#heroDownloads').textContent = fmt(allItems.reduce((a,x)=>a+Number(x.downloads||0),0));
    $('#heroViews').textContent = fmt(allItems.reduce((a,x)=>a+Number(x.views||0),0));
    $('#heroCategories').textContent = fmt(new Set(allItems.map(x => x.category).filter(Boolean)).size);
    $('#heroFeatured').textContent = fmt(allItems.filter(x => x.featured).length);
  } catch (e) {
    $('#libraryGrid').innerHTML = `<div class="empty">تعذر تحميل المكتبة: ${escapeHTML(e.message)}</div>`;
  }
  $('#searchInput').addEventListener('input', scheduleRender, { passive: true });
  $('#year').textContent = new Date().getFullYear();
})();
