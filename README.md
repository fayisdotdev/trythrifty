# trythrifty

A React + Vite storefront with red-and-white light and red-and-black dark themes. The shop starts with no sample inventory. Add real products and storefront content from the modular admin at `/#admin`.

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
   - `sql/09-profile-display-name.sql` — signup names, editable profile names, and a safe `User` fallback for existing accounts without names.
   - `sql/10-storefront-theme.sql` — saved light/dark theme selection for the storefront.
   - `sql/11-profile-theme-preference.sql` — per-account light/dark theme preference.
   - `sql/12-theme-specific-logos.sql` — separate light/dark logos, preserving the previous logo for both modes.
   - `sql/13-collection-product-badge.sql` — enable/disable and customize the floating badge on collection product images.
   - `sql/14-product-badge-options.sql` — enable/disable and customize the floating badge for individual products.
6. Start the app with `npm run dev`.
7. Create an account through the storefront and confirm its email if confirmation is enabled in Supabase Auth.
8. Replace the email in `sql/05-promote-store-admin.sql` with that account's email, then run the file manually in the SQL Editor. The profile's role will become `admin`.
9. Open `/#admin` to add products and manage the storefront. Promotion is deliberately separate from normal signup.

The app checks `trythrifty_profiles` after sign-in. The signup trigger creates one shared profile row per Supabase Auth user; the project does not create a separate database table for every shopper. The profile's `role` controls access to the admin interface and is also enforced by row-level security.
Run `sql/09-profile-display-name.sql` before using signup names or profile editing, and `sql/11-profile-theme-preference.sql` before enabling per-account theme saving. New accounts can enter a name at signup; existing accounts without one are labeled `User` and can update their name from **Account → My profile**. Profile updates are restricted to the display-name and theme-preference columns; users cannot change their own role.

## Supabase modules

Every application table uses the `trythrifty_` prefix. SQL modules are split by auth, catalog, storefront settings, uploaded assets, and the one-time admin promotion. Do not put the service-role key in the Vite app; the anon key is safe to expose when RLS is enabled.

## Storefront behavior

- Prices use Indian rupees (INR).
- Choose **Red & white — light** or **Red & black — dark** under **Brand & storefront**. The presets coordinate text, surfaces, borders, and controls to keep text readable.
- Visitors can switch themes from the storefront header. Signed-in users' preferences are saved to their profile; signed-out visitors' choices are saved in their browser. Set separate light- and dark-mode logos under **Brand & storefront**; theme-matched black and white defaults are used when those fields are blank.
- In **Brand & storefront → Collection section**, the admin can hide or customize the floating badge shown on product images.
- In the add/edit product form, the admin can hide the badge for an individual product or override its text; leaving its text blank uses the store-wide badge text.
- The bag can be shared to WhatsApp with selected product names, sizes, colours, quantities, and the bag total. Set the store WhatsApp number under **Brand & storefront**; visitors can enter a number if one is not set.
- Products, categories, logo, favicon, theme, homepage copy, section labels, hero artwork/image, empty-state messages, and footer content come from admin-managed Supabase data. There are no seeded/sample products or local storefront fallbacks.
- Uploaded images use the public `trythrifty-assets` bucket. Keep Supabase RLS policies enabled.
