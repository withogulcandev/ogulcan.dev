# ogulcan.dev — v1 build spec

A modern travelogue. Markdown content, one atlas home page, static output.

**Design constraint:** nothing in v1 that can't be finished in a weekend. Ship after step 4 of the build order, before the atlas exists.

---

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Astro 5, `output: 'static'` | Zero JS on entry pages by default |
| Islands | `@astrojs/react` | Only the atlas needs JS |
| Map | Leaflet + Carto Positron raster tiles | No API key, no account, works in 5 years |
| Fonts | Google Fonts (Newsreader + JetBrains Mono) | Fast to ship; self-host + subset is a v2 upgrade |
| Deploy | Cloudflare Pages | No adapter needed |
| CMS | The filesystem | `src/content/entries` is an Obsidian vault |

```bash
npm create astro@latest -- --template minimal --typescript strict
npx astro add react
npm i leaflet unist-util-visit
npm i -D @types/leaflet
```

No `react-leaflet` — it's a dependency that buys nothing over `useEffect`.

---

## Repo structure

```
src/
  content.config.ts
  content/
    entries/          # the writing — open this folder in Obsidian
      first-morning-fukuoka.md
      manu-coffee.md
      hostel-toka.md
      kyoto-arrival.md
  components/
    Atlas.tsx         # island: map + scroll observer
    Timeline.astro    # server-rendered nested nav
    EntryCard.astro
  layouts/
    Base.astro        # book pages, 404
    Atlas.astro       # home only — fixed map + timeline chrome
    Entry.astro       # single entry (book page)
  pages/
    index.astro       # atlas
    [slug].astro      # one entry (book page)
    404.astro
  styles/
    global.css
  lib/
    remark-wikilinks.ts   # [[slug]] → <a data-entry=slug>
    atlas.ts              # derive city/country fallback coords, group entries
public/
```

---

## Content model

**One collection.** An entry can be a place, a note, a stay — the map shows the type. The old `places` vs. `entries` split created a permanent decision at write-time (*"is this a place or a note?"*) and no journaler thinks that way.

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/entries' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    country: z.string(),
    city: z.string().optional(),
    type: z.enum(['note', 'stay', 'eat', 'work']).default('note'),
    coord: z.tuple([z.number(), z.number()]).optional(), // [lat, lng]
    budget: z.enum(['lean', 'mid', 'comfort']).optional(),
    wifi: z.number().optional(),
    outlets: z.boolean().optional(),
    verdict: z.string().optional(),
    summary: z.string().optional(),
    lang: z.enum(['tr', 'en']).default('tr'),
  }),
});

export const collections = { entries };
```

### Field notes

- **`type` defaults to `note`.** Most days are notes. The other three are structural: `stay` (a bed), `eat` (a meal), `work` (a place you plugged in). Add more (`sight`, `transit`) when you actually need them, not before.
- **`coord` is optional.** With a coord you get a map pin; without, the entry still shows on the timeline and the map falls back to the parent city coord, then country coord.
- **`coord` order is `[lat, lng]`** — Leaflet's order, opposite of GeoJSON. One convention; noted in the schema comment.
- **`lang`** sets `<html lang>` on the entry page. `<html lang>` is content metadata, not copy — it's what makes a screen reader pronounce the text correctly. Wrong value is worse than no value.
- **`country` required, `city` optional.** Some entries are transit or in-between; forcing `city` would push those into "misc" bins.
- Optional stays optional. If logging an entry takes longer than 30 seconds, you stop logging.

### City / country fallback coordinates

Derived at build time — no separate table to maintain:

```ts
// mean of the coord'd entries in that city / country
const cityCoord = mean(entries.filter(e => e.city === c && e.coord).map(e => e.coord!));
```

If a city has zero coord'd entries, it inherits from country; a country with zero coord'd entries doesn't move the map.

### Wikilinks

`[[slug]]` in markdown becomes `<a class="wikilink" data-entry="slug">` at build time via a small remark plugin. Two things happen:

1. **Backlinks for free.** Grep occurrences of `[[slug]]` across entries at build time; render "mentioned in —" on each entry page. No `reference()` needed.
2. **Paragraph-level map sync.** The atlas observer watches wikilinks in view, not just section boundaries. Write "morning at [[manu-coffee]]" mid-paragraph and the map flies to that pin as the reader hits that line.

`[[slug|alias]]` is v2 — keeps parsing trivial.

---

## Routes

| Route | Source | JS |
|---|---|---|
| `/` | **the atlas** — chronological stack of entries, scroll-synced map + timeline | Atlas |
| `/[slug]` | one entry, book page | none |
| `/404` | "This page doesn't exist." + link home | none |

Entries live at the root (`ogulcan.dev/manu-coffee`) for the book feel. `/` is the only namespace-critical slot — any future top-level route needs checking against entry slugs.

---

## Islands

One, `client:visible`. Takes **plain serializable props** — never pass a collection entry directly, it carries a `render()` function and will fail to serialize.

```astro
---
const atlasEntries = entries.map(e => ({
  slug: e.id,
  title: e.data.title,
  country: e.data.country,
  city: e.data.city ?? null,
  type: e.data.type,
  coord: e.data.coord ?? null,
}));
---
<Atlas entries={atlasEntries} cityCoords={cityCoords} countryCoords={countryCoords} client:visible />
```

### `<Atlas>` — the signature composition

Full-screen light map behind, sol-alt anchored via a radial paper overlay: transparent bottom-left → ~92% opaque `--paper` top-right. Feels like an atlas illuminated by a window in the corner. The reading column sits center-right; the timeline sits top-left.

**Behavior:**
- Leaflet init with Carto Positron tiles, all user interaction disabled (`dragging: false`, no zoom, no keyboard) — this is atmospheric, not exploratory. `/map`-style pan/zoom is a v2 route if it turns out to be missed.
- All entries with a `coord` render as markers, colored + shaped by `type` (● note, ■ stay, ▲ eat, ◆ work).
- `IntersectionObserver` on stacked `<article data-slug>` sections drives the *active entry*. A second observer on `a.wikilink[data-entry]` overrides it at paragraph granularity.
- On active change: map `flyTo(coord)` with zoom by type (place→15, city-fallback→12, country-fallback→6), timeline updates `data-active` on the current entry + its ancestor city + ancestor country.
- Active marker gets a larger glyph + ring; others stay at rest weight.

### `<Timeline>` — server-rendered nav, top-left

Nested `<ul>`. Countries always visible; cities of the active country revealed via CSS `[data-active] > ul`; entries of the active city revealed the same way. Zero-JS collapse — the observer only sets `data-active`.

```
Japan   ●
├ Fukuoka
│  ├ ☕ Manu Coffee
│  ├ 🛏 Hostel Toka
│  ├ ◦ First morning         ← active
│  └ …
└ Kyoto
Türkiye
```

Icons are inline SVG or mono glyphs — shape *and* color per type, never color alone.

**Accessibility — get this right at the start:**

- Timeline entries are real `<a href="/{slug}">` — atlas is a nav aid, not a trap. Tab order, Enter, focus rings all work for free.
- Map is `aria-hidden="true"` and `pointer-events: none`. Every meaningful marker corresponds to a timeline link that already has the entry's title. The map is a visualization; the timeline is the information.
- `prefers-reduced-motion` → map does not render at all. Timeline stays static with all cities/entries expanded. Reading column takes full width. Same for no-JS.
- Selection state must not be color-only: active timeline node gets weight + underline too.
- `<svg role="img">` on the map with a `<title>` naming the current active place.
- Touch targets ≥ 44px on timeline entries.

### `<Triangle>` — city page, v2

Retained conceptually — pick a stay/eat/work per city per budget tier, render a schematic triangle with walk times. Since the atlas already surfaces per-country/per-city discovery, the dedicated `/city/[slug]` route is deferred to v2 unless it earns its place.

---

## Design tokens

Palette is indigo-on-paper — ink and indigo dye, which is where a notebook kept across Asia actually lives. Deliberately not cream-and-terracotta.

```css
:root {
  --paper:  #FBFAF7;  /* barely warm white, not cream */
  --ink:    #14181C;  /* blue-black */
  --indigo: #1F3D6B;  /* links, active states */
  --muted:  #6A6862;  /* dates, metadata */
  --rule:   #D8D6CF;  /* hairlines */

  --measure: 62ch;
  --leading: 1.7;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #10141A;
    --ink:   #E8E6E1;
    --indigo:#8FB0DE;
    --muted: #8B8A85;
    --rule:  #2A3038;
  }
}
```

Contrast: ink on paper ≈ 16:1, indigo on paper ≈ 9.5:1. Both clear AAA — a reading site should earn that.

No dark-mode toggle. `prefers-color-scheme` only; a toggle means JS on the entry pages.

### Type

Three roles, two families:

| Role | Face | Setting |
|---|---|---|
| Display | Newsreader 600 (variable, `opsz` auto) | tight tracking, `text-wrap: balance` |
| Body | Newsreader 400 | `1.125rem`, `--leading`, `--measure` |
| Utility | JetBrains Mono 400 | walk times, Mbps, budget labels, dates |

Mono is not decoration — it marks *measured* values, which is exactly what a travel log's numbers are.

**v1: Google Fonts.** `<link>` to `fonts.googleapis.com` with `display=swap`. Subsetting the fonts (Turkish glyphs, kern/liga only, woff2) is a v2 perf upgrade — CDN fonts are the first thing to die on bad wifi, and worth self-hosting later.

---

## Accessibility checklist

Build-time and review-time, not aspirational.

- [ ] `<html lang>` set per entry from the `lang` field
- [ ] Skip link to `#main`, visible on focus
- [ ] `header` / `main` / `footer` landmarks — no div soup
- [ ] Visible `:focus-visible` ring, ≥2px, on every interactive element. `outline: none` is banned.
- [ ] Links underlined in body text — color is never the only signal
- [ ] One `<h1>` per page, no skipped levels
- [ ] `<time datetime="2026-08-20">` on every date
- [ ] Text contrast ≥ 7:1
- [ ] `prefers-reduced-motion` respected — atlas map skips render entirely
- [ ] Images require `alt` in the Zod schema — fail the build, don't trust good intentions
- [ ] Touch targets ≥ 44px (timeline entries included)
- [ ] Atlas information also exists as server-rendered text (timeline + stacked entries)
- [ ] Keyboard-only pass on `/` before shipping the atlas

---

## Out of scope for v1

`[[slug|alias]]` aliased wikilinks · graph view · RSS · search · tags · comments · donations · i18n · newsletter · dark-mode toggle · image optimization pipeline · self-hosted subset fonts · `/city/[slug]` + Triangle · user-controllable atlas map (pan/zoom)

Each is additive later. None blocks launch.

---

## Build order

1. Astro + React, `global.css` tokens, Google Fonts wired
2. `Base.astro` — skip link, landmarks, meta, OG defaults
3. `content.config.ts`, unified schema
4. `/` (list view) + `/[slug]` (book page) → **deploy here. Get it live.**
5. Write ≥ 4 entries across 2 cities in one country (Japan / Fukuoka + Kyoto)
6. `lib/remark-wikilinks.ts`, wire into `astro.config.mjs`, backlinks section on `/[slug]`
7. `lib/atlas.ts` (fallback coords, groupings), `<Timeline>`, `<Atlas>` island
8. Replace `/` with the atlas layout, wire observers
9. OG card generation (`astro-og-canvas`) — the social→site funnel doesn't work without it

Step 4 before step 8 is the important part. Ship the site as a plain reading list before the atlas is good, or the atlas's imperfection keeps the site offline forever.

Step 5 before step 7 too: four entries across two cities is the minimum data that makes the observer + camera pan *feel* real, and writing them will change the schema. Better to find that out before the island exists.

---

## Gotchas

- **Collection entries aren't serializable.** Map to plain objects at the boundary or the island fails at build.
- **`coord` order is `[lat, lng]`** — Leaflet's order, the opposite of GeoJSON. Keep one convention, note it in the schema comment.
- **Leaflet CSS must be imported** or tiles render as scrambled boxes. `import 'leaflet/dist/leaflet.css'`.
- **Leaflet default marker icons break under bundlers.** Use `divIcon` — solves it and lets you use SVG glyphs anyway.
- **StrictMode double-invokes effects in dev.** Guard map init, or you get two maps stacked.
- **`z.coerce.date()`** — a bare YAML date parses as a string and sorting silently breaks.
- **Reserve island height in CSS** or the page jumps on hydration. For the atlas the map is `position: fixed`, so this is moot on `/` but not on `/[slug]` if you ever mount an island there.
- **`text-wrap: balance` on `<h1>` only.** On body text it hurts more than it helps.
- **Wikilinks are just text at parse time.** If the target slug doesn't resolve at render time, still render the anchor — a build-time warning is enough; hard-failing turns a typo into a broken deploy.
- **The atlas is chronological ascending on `/`** (first day first, newest at bottom). The book-page `/[slug]` doesn't care about order.
