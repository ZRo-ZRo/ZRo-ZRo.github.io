/*
  ZRo-ZRo configuration
  1) Create a Supabase project.
  2) Paste Project URL and anon public key below.
  3) Run supabase/setup.sql in Supabase SQL Editor.

  Leaving these placeholders unchanged keeps the site in DEMO mode.
*/
window.ZERO9_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  SITE_NAME: 'ZRo-ZRo',
  SITE_URL: window.location.origin + window.location.pathname.replace(/[^/]*$/, ''),
  MEDIA_BUCKET: 'zero9-media'
};
