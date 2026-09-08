(() => {
  const cfg = window.ZERO9_CONFIG;
  const isConfigured = cfg && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.startsWith('YOUR_') && !cfg.SUPABASE_ANON_KEY.startsWith('YOUR_') && window.supabase;

  const client = isConfigured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const api = {
    client,
    isDemo: !isConfigured,

    async listLocalizations() {
      if (!client) return [...window.ZERO9_DEMO_DATA];
      const { data, error } = await client.from('localizations').select('*').order('featured', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getLocalization(slugOrId) {
      if (!client) return window.ZERO9_DEMO_DATA.find(x => x.slug === slugOrId || x.id === slugOrId) || null;
      let q = client.from('localizations').select('*').eq('slug', slugOrId).maybeSingle();
      let { data, error } = await q;
      if (error) throw error;
      if (!data) {
        const second = await client.from('localizations').select('*').eq('id', slugOrId).maybeSingle();
        if (second.error) throw second.error;
        data = second.data;
      }
      return data;
    },

    async incrementView(id) {
      if (!client || String(id).startsWith('demo-')) return;
      await client.rpc('increment_localization_views', { row_id: id });
    },

    async incrementDownload(id) {
      if (!client || String(id).startsWith('demo-')) return;
      await client.rpc('increment_localization_downloads', { row_id: id });
    },

    async signIn(email, password) {
      if (!client) throw new Error('فعّل Supabase أولاً من assets/js/config.js');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      if (client) await client.auth.signOut();
    },

    async getSession() {
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data.session;
    },

    async isOwner() {
      if (!client) return false;
      const session = await this.getSession();
      if (!session) return false;
      const { data, error } = await client.rpc('is_owner');
      return !error && data === true;
    },

    async saveLocalization(payload) {
      if (!client) throw new Error('وضع العرض لا يسمح بالحفظ. فعّل Supabase.');
      const clean = { ...payload };
      if (!clean.id) delete clean.id;
      const { data, error } = await client.from('localizations').upsert(clean, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return data;
    },

    async deleteLocalization(id) {
      if (!client) throw new Error('وضع العرض لا يسمح بالحذف.');
      const { error } = await client.from('localizations').delete().eq('id', id);
      if (error) throw error;
    },

    async uploadMedia(file, folder = 'images') {
      if (!client) throw new Error('فعّل Supabase أولاً.');
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const safeName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const path = `${folder}/${safeName}`;
      const { error } = await client.storage.from(cfg.MEDIA_BUCKET).upload(path, file, { upsert: false, cacheControl: '3600' });
      if (error) throw error;
      const { data } = client.storage.from(cfg.MEDIA_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
  };

  window.Zero9DB = api;
})();
