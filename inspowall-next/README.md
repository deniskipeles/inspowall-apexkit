# Vortex — Next.js SSR port

Same app, same look, ported from Vite/React Router to Next.js App Router with SSR
and `next/image`.

## Setup

```
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your apex backend
npm run dev
```

## What changed structurally

- **Routing**: `react-router-dom` → Next.js file-based routing (`app/`).
  `useNavigate`/`Link`/`useParams`/`useLocation` → `next/navigation` + `next/link`.
- **SSR**: `/` and `/pin/[id]` are Server Components. They call the same `apex`
  SDK server-side (it's just fetch under the hood, no browser-only APIs) to get
  first-paint data — the initial feed and a pin's details render fully formed in
  the HTML, no client loading flash. Each then hands off to a `"use client"`
  companion (`HomeClient`, `PinDetailClient`) for all the interactive parts
  (search, pagination, like/save, image lens) exactly as before.
- **Metadata**: `react-helmet-async` → Next's `generateMetadata` (dynamic, on the
  pin page) and static `export const metadata` (other pages).
- **Images**: all `<img>` → `next/image`, except two deliberate exceptions:
  1. Inside `react-image-crop` (`PinImageLens`, the search-by-image crop box) —
     that library measures and overlays against a real `<img>` DOM node it
     controls directly; wrapping it in `next/image` breaks the crop math.
  2. The local file preview in `CreatePinForm` — that's `unoptimized` (blob URL,
     nothing to optimize) rather than a plain `<img>`, so it still uses `Image`.
- **Masonry grid**: rewritten from a `window.innerWidth`-driven JS column split
  to native CSS multi-column (`columns-2 md:columns-3 lg:columns-4 xl:columns-5`
  + `break-inside-avoid`). No resize listener, no client-only layout hook, and it
  renders correctly on the very first server-rendered paint. Visually identical.
- **Theme flash**: a small inline script in `layout.tsx` sets the `.dark` class
  before first paint (reads `localStorage`/`prefers-color-scheme`), so there's
  no flash of the wrong theme while the `ThemeContext` hydrates.

## Assumptions I had to make

Your source didn't include `index.css`, so the actual values behind `bg-ink`,
`text-ink-invert`, `bg-surface`, `bg-neon`, `font-sans`, `font-display` weren't
available. I inferred `--neon: #ccff00` from the repeated
`rgba(204,255,0,...)` shadows in your components (that's exact), and picked
sensible ink/surface values that flip with `.dark` the same way your
`dark:` classes implied. Fonts: `Inter` for sans, `Space Grotesk` for display,
loaded via `next/font/google` — swap these in `layout.tsx` if you had specific
fonts in mind. **If you have the real `index.css`, send it over and I'll wire in
the exact values** instead of my inferred ones.

## Bug fixed in passing

`AuthContext.register`'s avatar URL used `` `...seed={res.user.email}` `` — a
non-template string with literal `{...}` braces, so it wasn't interpolating.
Fixed to a real template literal.

## Not needed anymore

No `vercel.json` SPA-fallback rewrite — Next.js handles all routing (including
direct loads/reloads of `/pin/379`) natively, server-side. That whole class of
404 is gone by construction.
