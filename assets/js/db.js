(() => {
  const cfg = window.ZRORO_CONFIG || window.ZERO9_CONFIG || {};
  const demoData = window.ZRORO_DEMO_DATA || window.ZERO9_DEMO_DATA || [];
  const isConfigured = Boolean(
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase &&
    !String(cfg.SUPABASE_URL).startsWith('YOUR_') &&
    !String(cfg.SUPABASE_ANON_KEY).startsWith('YOUR_')
  );

  const client = isConfigured
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ALLOWED_TYPES = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/avif', 'avif']
  ]);
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  function ensureClient() {
    if (!client) throw new Error('فعّل Supabase أولاً من assets/js/config.js');
  }

  function setupError(error, area='قاعدة البيانات') {
    console.error(`[ZRo-ZRo] ${area}:`, error);
    const code = String(error?.code || '');
    if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01' || code === '42883') {
      return new Error('إعداد Supabase غير مكتمل. نفّذ ملف supabase/setup.sql بالكامل ثم أعد المحاولة.');
    }
    return error instanceof Error ? error : new Error(error?.message || `تعذر الاتصال بـ ${area}.`);
  }

  function normalizePayload(payload = {}) {
    const screenshots = Array.isArray(payload.screenshots)
      ? payload.screenshots.slice(0, 4).map(v => String(v || '').trim())
      : ['', '', '', ''];
    while (screenshots.length < 4) screenshots.push('');

    return {
      ...(payload.id ? { id: payload.id } : {}),
      title: String(payload.title || '').trim(),
      arabic_title: String(payload.arabic_title || '').trim(),
      slug: String(payload.slug || '').trim(),
      category: String(payload.category || '').trim(),
      version: String(payload.version || '').trim(),
      status: String(payload.status || 'مكتمل').trim(),
      short_description: String(payload.short_description || '').trim(),
      description: String(payload.description || '').trim(),
      cover_url: String(payload.cover_url || '').trim(),
      screenshots,
      download_url: String(payload.download_url || '').trim(),
      featured: Boolean(payload.featured)
    };
  }

  const api = {
    client,
    isDemo: !isConfigured,

    async listLocalizations() {
      if (!client) return [...demoData];
      const { data, error } = await client
        .from('localizations')
        .select('*')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw setupError(error, 'مكتبة التعريبات');
      return data || [];
    },

    async getLocalization(slugOrId) {
      if (!client) return demoData.find(x => x.slug === slugOrId || x.id === slugOrId) || null;

      const key = String(slugOrId || '').trim();
      if (!key) return null;

      const first = await client.from('localizations').select('*').eq('slug', key).maybeSingle();
      if (first.error) throw setupError(first.error, 'تفاصيل التعريب');
      if (first.data) return first.data;

      if (!UUID_RE.test(key)) return null;
      const second = await client.from('localizations').select('*').eq('id', key).maybeSingle();
      if (second.error) throw setupError(second.error, 'تفاصيل التعريب');
      return second.data || null;
    },

    async incrementView(id) {
      if (!client || !UUID_RE.test(String(id || ''))) return false;
      const { error } = await client.rpc('increment_localization_views', { row_id: id });
      if (error) throw setupError(error, 'عداد المشاهدات');
      return true;
    },

    async incrementDownload(id) {
      if (!client || !UUID_RE.test(String(id || ''))) return false;
      const { error } = await client.rpc('increment_localization_downloads', { row_id: id });
      if (error) throw setupError(error, 'عداد التحميلات');
      return true;
    },

    async signIn(email, password) {
      ensureClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async getSession() {
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session || null;
    },

    async isOwner() {
      if (!client) return false;
      const session = await this.getSession();
      if (!session) return false;
      const { data, error } = await client.rpc('is_owner');
      if (error) throw setupError(error, 'صلاحيات Owner');
      return data === true;
    },

    async saveLocalization(payload) {
      ensureClient();
      const clean = normalizePayload(payload);
      if (!clean.title || !clean.slug || !clean.download_url) {
        throw new Error('الاسم وSlug ورابط التحميل حقول إلزامية.');
      }

      let result;
      if (clean.id && UUID_RE.test(String(clean.id))) {
        result = await client.from('localizations').update(clean).eq('id', clean.id).select().single();
      } else {
        delete clean.id;
        result = await client.from('localizations').insert(clean).select().single();
      }

      if (result.error) {
        if (result.error.code === '23505') throw new Error('Slug مستخدم بالفعل لتعريب آخر. اختر قيمة مختلفة.');
        throw setupError(result.error, 'حفظ التعريب');
      }
      return result.data;
    },

    async deleteLocalization(id) {
      ensureClient();
      if (!UUID_RE.test(String(id || ''))) throw new Error('معرّف التعريب غير صالح.');
      const { error } = await client.from('localizations').delete().eq('id', id);
      if (error) throw setupError(error, 'حذف التعريب');
    },

    async uploadMedia(file, folder = 'images') {
      ensureClient();
      if (!(file instanceof File)) throw new Error('ملف الصورة غير صالح.');
      if (!ALLOWED_TYPES.has(file.type)) throw new Error('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF.');
      if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error('حجم الصورة يجب ألا يتجاوز 8 ميجابايت.');

      const ext = ALLOWED_TYPES.get(file.type);
      const uid = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const safeFolder = String(folder || 'images').replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'images';
      const path = `${safeFolder}/${Date.now()}-${uid}.${ext}`;

      const { error } = await client.storage.from(cfg.MEDIA_BUCKET).upload(path, file, {
        upsert: false,
        cacheControl: '31536000',
        contentType: file.type
      });
      if (error) throw setupError(error, 'رفع الصور');

      const { data } = client.storage.from(cfg.MEDIA_BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('تم رفع الصورة لكن تعذر إنشاء رابطها العام.');
      return data.publicUrl;
    }
  };

  window.ZRoZRoDB = api;
  // Backward compatibility for older cached JavaScript.
  window.Zero9DB = api;
})();
