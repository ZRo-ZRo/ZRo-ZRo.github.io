const $ = (s) => document.querySelector(s);
const fmt = (n) => new Intl.NumberFormat('ar', { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(n || 0));
let allItems = [];
let activeCategory = 'الكل';

function escapeHTML(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function card(item) {
  const href = `details.html?id=${encodeURIComponent(item.slug || item.id)}`;
  return `<article class="game-card modern-card">
    <a href="${href}" aria-label="${escapeHTML(item.title)}">
      <div class="cover-wrap modern-cover">
        <img src="${escapeHTML(item.cover_url || 'assets/demo/cover-1.svg')}" alt="غلاف ${escapeHTML(item.title)}" loading="lazy">
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
  const q = $('#searchInput').value.trim().toLowerCase();
  const list = allItems.filter(x => {
    const categoryOK = activeCategory === 'الكل' || (x.category || '') === activeCategory;
    const hay = `${x.title || ''} ${x.arabic_title || ''} ${x.short_description || ''}`.toLowerCase();
    return categoryOK && (!q || hay.includes(q));
  });
  $('#libraryGrid').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">لا توجد نتائج مطابقة للبحث أو التصنيف المحدد.</div>';
  $('#resultsCount').textContent = `${fmt(list.length)} تعريب`;
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
    allItems = await Zero9DB.listLocalizations();
    allItems = allItems.slice().sort((a, b) => {
      const f = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (f) return f;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    buildFilters(); render();
    $('#heroGames').textContent = fmt(allItems.length);
    $('#heroDownloads').textContent = fmt(allItems.reduce((a,x)=>a+Number(x.downloads||0),0));
    $('#heroViews').textContent = fmt(allItems.reduce((a,x)=>a+Number(x.views||0),0));
    $('#heroCategories').textContent = fmt(new Set(allItems.map(x => x.category).filter(Boolean)).size);
    $('#heroFeatured').textContent = fmt(allItems.filter(x => x.featured).length);
  } catch (e) {
    $('#libraryGrid').innerHTML = `<div class="empty">تعذر تحميل المكتبة: ${escapeHTML(e.message)}</div>`;
  }
  $('#searchInput').addEventListener('input', render);
  $('#year').textContent = new Date().getFullYear();
})();
