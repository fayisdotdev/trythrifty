# trythrifty

A React + Vite storefront inspired by the supplied dark, editorial fashion-store model. The shop starts with no sample inventory. Add real products and storefront content from the modular admin at `/#admin`.

## Local setup

1. Install dependencies with `npm install`.
2. Create a Supabase project.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Restart the Vite server after changing environment variables.
5. In the Supabase SQL Editor, run the SQL files one at a time and in order:
   - `sql/01-auth-and-profiles.sql` — signup profile trigger, admin-check helper and profile access policies.
   - `sql/02-product-catalog.sql` — empty product catalog and admin-only writes.
   - `sql/03-storefront-settings.sql` — editable logo, colours, copy, and WhatsApp details.
   - `sql/04-brand-and-product-assets.sql` — public asset delivery and admin-only uploads.
   - `sql/06-storefront-content.sql` — editable navigation, homepage sections, artwork, empty-state messages, and footer content.
6. Start the app with `npm run dev`.
7. Create an account through the storefront and confirm its email if confirmation is enabled in Supabase Auth.
8. Replace the email in `sql/05-promote-store-admin.sql` with that account's email, then run the file manually in the SQL Editor. The profile's role will become `admin`.
9. Open `/#admin` to add products and manage the storefront. Promotion is deliberately separate from normal signup.

The app checks `trythrifty_profiles` after sign-in. The signup trigger creates one shared profile row per Supabase Auth user; the project does not create a separate database table for every shopper. The profile's `role` controls access to the admin interface and is also enforced by row-level security.

## Supabase modules

Every application table uses the `trythrifty_` prefix. SQL modules are split by auth, catalog, storefront settings, uploaded assets, and the one-time admin promotion. Do not put the service-role key in the Vite app; the anon key is safe to expose when RLS is enabled.

## Storefront behavior

- Prices use Indian rupees (INR).
- The bag can be shared to WhatsApp with selected product names, sizes, colours, quantities, and the bag total. Set the store WhatsApp number under **Brand & storefront**; visitors can enter a number if one is not set.
- Products, categories, logo, favicon, colours, homepage copy, section labels, hero artwork/image, empty-state messages, and footer content come from admin-managed Supabase data. There are no seeded/sample products or local storefront fallbacks.
- Uploaded images use the public `trythrifty-assets` bucket. Keep Supabase RLS policies enabled.
