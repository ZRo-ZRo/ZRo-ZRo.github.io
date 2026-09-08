/*
  ZRo-ZRo production configuration

  Supabase setup:
  1) Create/select a Supabase project.
  2) Run supabase/setup.sql once in SQL Editor.
  3) Create the Owner account in Authentication.
  4) Add that user's UUID to public.owner_users (see bottom of setup.sql).
  5) Paste the Project URL and anon public key below.

  Important: the anon key is designed to be public in browser apps.
  Security is enforced by Supabase Row Level Security (RLS), not by hiding it.

  Leaving the two placeholders unchanged keeps ZRo-ZRo in DEMO mode.
*/
window.ZERO9_CONFIG = Object.freeze({
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  SITE_NAME: 'ZRo-ZRo',
  SITE_URL: 'https://zro-zro.github.io/',
  MEDIA_BUCKET: 'zro-zro-media'
});
