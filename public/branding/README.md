# BananaRouter Branding

Place your BananaRouter icon here.

## Expected files

Put **one** of these in this folder:

- `banana-router-icon.svg`  (preferred, vector, preserves aspect ratio)
- `banana-router-icon.png`  (256×256 or larger, transparent background)

The app will automatically use the icon for:

- Sidebar branding (top of left nav)
- Browser favicon
- PWA app icon
- Loading screen
- Onboarding / About
- Mobile home-screen icon

## How to add

1. Copy your icon file into `public/branding/`:
   ```
   public/branding/banana-router-icon.svg
   # or
   public/branding/banana-router-icon.png
   ```
2. Keep the original aspect ratio — the app uses `object-fit: contain` and never stretches the logo.
3. Rebuild if needed (`npm run build`), then reload.

## Fallback

If no icon is present, BananaRouter shows a clean text fallback (“B” in a rounded square with the BananaRouter wordmark) — no cartoon banana is rendered as a permanent logo. The yellow accent is only a placeholder; your uploaded icon is the official identity.

## Do not

- Do not commit placeholder-generated artwork as the final logo.
- Do not rename the file — the path is hard-coded as `/branding/banana-router-icon.svg` (checked first) then `.png`.

## Favicon & PWA

- `src/app/layout.tsx` references `/branding/banana-router-icon.svg` → falls back to `/icon-192.png` if missing
- `public/manifest.json` lists `/branding/banana-router-icon.png` → falls back to `/icon-192.png`
- All icons preserve aspect ratio via `object-contain`.

Questions? See `src/components/branding/BananaLogo.tsx`.
