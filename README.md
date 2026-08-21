# Krrisha Patel Portfolio

Personal site. Next.js App Router, TypeScript, Tailwind v4.

Live at [krrishapatel.vercel.app](https://krrishapatel.vercel.app).

## Layout

The site lives in `app/app/`. Vercel builds with `app/` as the project root, so
`app/app/` is the App Router directory:

```
app/app/
  page.tsx            /            renders Portfolio with section="about"
  [section]/page.tsx  /work, /ventures, /projects, /blog, /faq
  Portfolio.tsx       the whole page, one client component
  sections.ts         section list, site URL, per-route titles
  layout.tsx          fonts, metadata, analytics
  global.css
  Crane.tsx  Dragon.tsx  Lotus.tsx  FoldingCrane.tsx  OrigamiFigure.tsx
  origami.ts          the fold sequences those render
public/               images, all WebP except the OG card
```

The files directly under `app/` (`page.tsx`, `layout.tsx`, `blog/`,
`components/`, `rss/`, `og/`) are leftovers from the Vercel blog starter this
was bootstrapped from. They are not in the route tree, which `/rss` and `/og`
returning 404 confirms.

## Run it

```bash
pnpm install
pnpm dev
```

## Notes

Each section is a real route with its own title and description, not a `#hash`
fragment, so a search result for `/ventures` says something about ventures.
`generateStaticParams` prerenders all five and `dynamicParams = false` makes
anything else 404 instead of quietly serving About under the wrong URL.

Images are WebP only. The JPEG fallbacks were camera-resolution scans, up to
2.6MB each, displayed in 348x190 tiles. Every browser has read WebP since 2020,
so the fallbacks were 6MB of dead weight and are gone.

## License

MIT
