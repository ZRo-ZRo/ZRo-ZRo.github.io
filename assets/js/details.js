const $ = (s) => document.querySelector(s);
const fmt = (n) => new Intl.NumberFormat('ar').format(Number(n || 0));
const esc = (v='') => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(msg, error=false){ const t=$('#toast'); t.textContent=msg; t.className='toast show'+(error?' error':''); clearTimeout(window.__zt); window.__zt=setTimeout(()=>t.className='toast',2600); }
function setMeta(selector,value){ const el=$(selector); if(el && value) el.setAttribute('content', value); }
function safeHttpUrl(value){
  try {
    const url = new URL(String(value || '').trim(), location.href);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  } catch (_) { return ''; }
}

(async function(){
  $('#year').textContent = new Date().getFullYear();
  if (ZRoZRoDB.isDemo) $('#demoBanner').hidden = false;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href='index.html'; return; }
  try {
    const item = await ZRoZRoDB.getLocalization(id);
    if (!item) { $('#detailsRoot').innerHTML='<section class="section"><div class="container"><div class="empty">التعريب غير موجود.</div></div></section>'; return; }

    const pageTitle = `${item.title} | ZRo-ZRo`;
    const pageDescription = item.short_description || `تعريب ${item.title} من مكتبة ZRo-ZRo`;
    document.title = pageTitle;
    setMeta('#metaDescription', pageDescription);
    setMeta('#ogTitle', pageTitle);
    setMeta('#ogDescription', pageDescription);
    setMeta('#ogUrl', location.href);

    $('#coverBox').classList.remove('skeleton'); $('#coverBox').style.minHeight='0';
    $('#coverBox').innerHTML=`<img src="${esc(item.cover_url || 'assets/demo/cover-1.svg')}" alt="غلاف ${esc(item.title)}" fetchpriority="high" decoding="async">`;
    $('#title').textContent=item.title || '—';
    $('#arabicTitle').textContent=item.arabic_title || '';
    $('#shortDescription').textContent=item.short_description || '';
    $('#description').textContent=item.description || 'لا توجد تفاصيل إضافية.';
    $('#views').textContent=fmt(item.views);
    $('#downloads').textContent=fmt(item.downloads);
    $('#version').textContent=item.version || '—';
    $('#detailTags').innerHTML=[item.category,item.status,item.version?`الإصدار ${item.version}`:null].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');

    const rawShots = Array.isArray(item.screenshots) ? item.screenshots.slice(0,4) : [];
    const shots = rawShots.map((src,index)=>({src:String(src||'').trim(),slot:index+1})).filter(x=>x.src);
    $('#gallery').innerHTML = shots.length
      ? shots.map(({src,slot})=>`<button class="shot-card" data-src="${esc(src)}" aria-label="فتح الصورة ${slot}"><span class="shot-frame"><img src="${esc(src)}" alt="صورة من التعريب ${slot}" loading="lazy" decoding="async"></span><span class="shot-meta"><b class="shot-order">الصورة ${slot}</b><small>عرض اللقطة بالحجم الكامل</small></span></button>`).join('')
      : '<div class="empty">لا توجد صور إضافية لهذا التعريب.</div>';

    let previousFocus = null;
    const openLightbox = src => {
      previousFocus = document.activeElement;
      $('#lightboxImage').src = src;
      $('#lightbox').classList.add('open');
      document.body.style.overflow='hidden';
      $('#lightboxClose').focus();
    };
    const close = () => {
      if(!$('#lightbox').classList.contains('open')) return;
      $('#lightbox').classList.remove('open');
      $('#lightboxImage').removeAttribute('src');
      document.body.style.overflow='';
      if(previousFocus && typeof previousFocus.focus==='function') previousFocus.focus();
    };
    $('#gallery').addEventListener('click',e=>{const b=e.target.closest('[data-src]');if(!b)return;openLightbox(b.dataset.src);});
    $('#lightboxClose').onclick=close;
    $('#lightbox').addEventListener('click',e=>{if(e.target===$('#lightbox'))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});

    if (!ZRoZRoDB.isDemo) {
      try {
        const key = `zrozro:view:${item.id}`;
        const last = Number(localStorage.getItem(key) || 0);
        if (Date.now() - last > 86400000) {
          await ZRoZRoDB.incrementView(item.id);
          localStorage.setItem(key, String(Date.now()));
          $('#views').textContent=fmt(Number(item.views||0)+1);
        }
      } catch (_) {}
    }

    $('#downloadBtn').onclick=()=>{
      const downloadUrl = safeHttpUrl(item.download_url);
      if(!downloadUrl || item.download_url==='#'){toast('رابط التحميل غير متاح أو غير صالح لهذا التعريب.',true);return;}

      const opened = window.open(downloadUrl,'_blank','noopener,noreferrer');
      if(!opened) window.location.href = downloadUrl;

      if(!ZRoZRoDB.isDemo){
        ZRoZRoDB.incrementDownload(item.id).then(()=>{
          item.downloads=Number(item.downloads||0)+1;
          $('#downloads').textContent=fmt(item.downloads);
        }).catch(()=>{});
      }
    };

    $('#shareBtn').onclick=async()=>{
      const shareData={title:pageTitle,text:pageDescription,url:location.href};
      try{
        if(navigator.share) await navigator.share(shareData);
        else { await navigator.clipboard.writeText(location.href); toast('تم نسخ رابط التعريب.'); }
      } catch(e){ if(e.name!=='AbortError') toast('تعذر تنفيذ المشاركة.',true); }
    };
  } catch(e) {
    $('#detailsRoot').innerHTML=`<section class="section"><div class="container"><div class="empty">تعذر تحميل التفاصيل: ${esc(e.message)}</div></div></section>`;
  }
})();
