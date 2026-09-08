(() => {
  'use strict';

  const current = document.currentScript;
  const entry = current?.dataset?.entry || '';
  const cfg = window.ZRORO_CONFIG || window.ZERO9_CONFIG || {};

  const configured = Boolean(
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !String(cfg.SUPABASE_URL).startsWith('YOUR_') &&
    !String(cfg.SUPABASE_ANON_KEY).startsWith('YOUR_')
  );

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`تعذر تحميل ${src}`));
      document.body.appendChild(script);
    });
  }

  async function boot() {
    if (configured && !window.supabase) {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      } catch (error) {
        console.warn('[ZRo-ZRo] Supabase unavailable; falling back to demo mode.', error);
      }
    }

    await loadScript('assets/js/db.js');
    if (entry) await loadScript(entry);
  }

  boot().catch(error => {
    console.error('[ZRo-ZRo] Boot failed:', error);
    const banner = document.getElementById('demoBanner');
    if (banner) {
      banner.hidden = false;
      banner.textContent = 'تعذر تشغيل بعض مكونات الموقع. أعد تحميل الصفحة أو حاول لاحقًا.';
    }
  });
})();
