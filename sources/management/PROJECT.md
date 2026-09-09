# ogulcan.dev — v1 build spec (revised 2026-09-09)

**Konumdan bağımsız yaşamayı keşfetmek isteyen herkes için** bir platform. Markdown content, kronolojik okuma, indirilebilir PDF, opsiyonel destek.

**Design constraint:** v1 = read + look good + deploy. Interactive components (Faz 2), PDF (Faz 3), polar.sh (Faz 4) ayrı fazlar — v1'e sokulmaz.

## Purpose

Nomad-curious kitle Oğulcan'ın yolunu keşfeder (manifesto + travelog), PDF olarak sahiplenebilir, isterse polar.sh üstünden $0+ destekler. Paywall yok, para göze batmaz.

Detaylı planlama: brain'de `projects/writing-platform.md`.

---

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Astro 7, `output: 'static'` | Zero JS on entry pages by default |
| Islands | `@astrojs/react` | Reserved for Faz 2 (Triangle + Routine demos) |
| Fonts | Google Fonts (Newsreader + JetBrains Mono) | Fast to ship; self-host + subset v2 |
| Deploy | Cloudflare Pages | No adapter needed |
| CMS | Filesystem | `sources/content/` is an Obsidian vault |

### Removed from Aug draft
- `leaflet`, `@types/leaflet` — no map in v1 (or v2, probably ever)
- `unist-util-visit`, `remark-wikilinks.ts` — no wikilinks in v1
- Atlas island, Timeline component, coord/wifi/outlets/budget/verdict fields
- `apps/web/dist/` — stale Aug build, .gitignore'a alındığı için sorun yok

### Upgraded (2026-09-09)
- Astro 5 → 7.3.2
- @astrojs/react 4 → 6.0.5

Package manager: **yarn** (npm değil).

---

## Repo structure

```
ogulcan.dev/
├── apps/
│   └── web/                       # Astro
│       └── src/
│           ├── content.config.ts  # glob → sources/content
│           ├── pages/
│           │   ├── index.astro    # kronolojik liste
│           │   ├── [slug].astro   # book page
│           │   └── 404.astro
│           ├── layouts/
│           │   ├── Base.astro
│           │   └── Entry.astro
│           ├── components/        # Faz 2: Triangle.tsx, Routine.tsx
│           ├── lib/
│           └── styles/global.css
├── sources/
│   ├── content/                   # md entries — tek collection
│   └── management/
│       └── PROJECT.md             # bu dosya
├── CLAUDE.md
└── README.md
```

**Content location:** `sources/content/` (monorepo root). Astro `glob` loader `apps/web/src/content.config.ts`'ten relative path ile okur (`base: '../../sources/content'`). Symlink veya move alternatifleri sonradan iterasyon.

---

## Content model

Tek collection. Kronolojik okuma.

```ts
// apps/web/src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../sources/content' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    country: z.string(),
    city: z.string().optional(),
    type: z.enum(['note', 'stay', 'eat', 'work']).default('note'),
    lang: z.enum(['tr', 'en']).default('tr'),
    status: z.enum(['draft', 'published']).default('draft'),
    summary: z.string().optional(),
  }),
});

export const collections = { entries };
```

### Field notes

- **`type` = manifesto'nun eat/stay/work üçgeni + note (rutin/genel).** Aug'da zaten böyleymiş — koruyoruz.
- **`country` required, `city` optional.** Transit ve ara entryler için.
- **`lang`** `<html lang>` içi. Doğru değer = screen reader doğru telaffuz.
- **`status`** — draft build'e girmez, published girer. Prod filter: `where status === 'published'`.
- **Optional stays optional.** Bir entry yazmak 30 saniyeden uzun sürerse, yazmıyorsun.

---

## Routes

| Route | Source | JS |
|---|---|---|
| `/` | Published entries — kronolojik liste (başlık, tarih, şehir, type ikonu, summary) | none |
| `/[slug]` | Bir entry, book page | v1 none; Faz 2'de manifesto page'e island gömülür |
| `/404` | "Bu sayfa yok." + home link | none |

Entries kökte (`ogulcan.dev/manu-coffee`) — book feel. `/` tek namespace-critical slot; ilerde top-level route eklerken slug çakışması kontrol.

---

## Islands (Faz 2 — v1'de yok)

İkisi de `client:visible`, plain serializable props:

- **`<Triangle />`** — interaktif eat/stay/work üçgeni. Bir köşeye tıkla → o dimension'ın entryleri filtrelenir/highlight olur. Manifestonun soyut modeli görsel dokunulur olur.
- **`<Routine />`** — bir "iyi günün" ritim görselleştirmesi. Timeline üstünde tekrarlanan öğeler nasıl belirir.

İkisi de manifesto page'in içine gömülür (MDX veya Astro component slot). Entry pages plain kalır.

---

## PDF export (Faz 3 — v1'de yok)

Manifesto + tüm published entries → tek PDF. Astro build sırasında paged.js veya rehype-based pipeline. İndirme butonu `/`'da.

---

## Polar.sh (Faz 4 — en son)

$0+ opsiyonel destek widget. Widget yerleşimi PDF indirme yanında. Faz 1-3 bitmeden dokunulmaz.

---

## Design tokens (Aug'dan korunur)

Palette: indigo-on-paper. Ink and indigo dye — Asya'da tutulan defterin doğal yeri. Cream-and-terracotta değil.

```css
:root {
  --paper:  #FBFAF7;
  --ink:    #14181C;
  --indigo: #1F3D6B;
  --muted:  #6A6862;
  --rule:   #D8D6CF;

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

Contrast: ink-on-paper ≈ 16:1, indigo-on-paper ≈ 9.5:1 — AAA. Reading site bunu hak eder.

Dark-mode toggle yok. `prefers-color-scheme` yeterli; toggle = entry page'lerde JS.

### Type

| Role | Face | Setting |
|---|---|---|
| Display | Newsreader 600 (variable, `opsz` auto) | tight tracking, `text-wrap: balance` |
| Body | Newsreader 400 | `1.125rem`, `--leading`, `--measure` |
| Utility | JetBrains Mono 400 | tarihler, city adları, ölçülen değerler |

Mono dekor değil — measured values işaretler (tarih, süre, mesafe).

v1: Google Fonts, `display=swap`. Self-host + subset v2 perf upgrade.

---

## Accessibility checklist

Build-time ve review-time, aspirational değil.

- [ ] `<html lang>` per entry, `lang` field'dan
- [ ] Skip link `#main`, focus'ta görünür
- [ ] `header` / `main` / `footer` landmarks
- [ ] `:focus-visible` ring, ≥2px, her interaktif element. `outline: none` yasak.
- [ ] Body text linkleri underline — renk tek sinyal değil
- [ ] Her sayfada tek `<h1>`, seviye atlama yok
- [ ] `<time datetime="2026-08-20">` her tarihte
- [ ] Text contrast ≥ 7:1
- [ ] `prefers-reduced-motion` — Faz 2 islands için (v1'de motion yok)
- [ ] Images require `alt` in Zod schema — build fail
- [ ] Touch targets ≥ 44px
- [ ] Keyboard-only pass `/` ve `/[slug]` üstünde ship öncesi

---

## Out of scope

Faz 1 dışı: wikilinks · atlas · map · Timeline · graph view · RSS · search · tags · comments · i18n · newsletter · dark-mode toggle · image optimization · self-hosted subset fonts · Triangle interactive · Routine interactive · PDF · polar.sh

Faz 2-4 içindekiler burada listelenir; sırası fazlarda.

---

## Build order (v1)

1. **Scaffold pick-up:** `apps/web/`'te `npm install`, `npm run dev` çalışıyor mu doğrula
2. **Cut deps:** `leaflet`, `@types/leaflet`, `unist-util-visit` sil (`package.json` + `npm install`)
3. **Cut files:** `remark-wikilinks.ts`, Atlas/Timeline/Map componentleri sil
4. **Cut config:** `astro.config.ts`'ten `remarkPlugins: [remarkWikilinks]` çıkar
5. **`content.config.ts`** — schema yukarıdaki, glob path `../../sources/content`
6. **`global.css`** — tokens Aug'daki paletle başla, temayı okurken revize
7. **`Base.astro`** — skip link, landmarks, meta, OG defaults
8. **`Entry.astro`** layout — book page
9. **`/[slug].astro`** — entry render
10. **`/index.astro`** — kronolojik liste (published only)
11. **`/404.astro`**
12. Brain'den 3 taslağı (`writing/01-manifesto.md`, `02-japan-example.md`, `03-routine.md`) `sources/content/`'e taşı, frontmatter `status: draft` ekle
13. En az 1 entry `status: published`
14. **Deploy Cloudflare Pages**
15. Domain bağla ogulcan.dev
16. **Ship.**

Faz 2-4 ancak v1 shipped olduktan sonra.

---

## Gotchas

- **Collection entries aren't serializable.** Islands'e (Faz 2) plain objects pas et, yoksa build fail.
- **StrictMode double-invokes effects.** Faz 2 island init'lerinde guard koy.
- **`z.coerce.date()`** — bare YAML date string parse olur ve sıralama sessizce bozulur.
- **Reserve island height in CSS** — hydration'da sayfa zıplar. Faz 2'de dikkat.
- **`text-wrap: balance` sadece `<h1>`'da.** Body text'te zarar verir.
