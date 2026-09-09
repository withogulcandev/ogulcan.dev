# ogulcan.dev — Agent Rules

**Purpose:** Konumdan bağımsız yaşamayı keşfetmek isteyen herkes için bir platform. Manifesto + travelog + interaktif çerçeve. Ücretsiz, PDF indirilebilir, polar.sh üstünden $0+ opsiyonel destek.

Detaylı spec: [`sources/management/PROJECT.md`](sources/management/PROJECT.md)
Faz-level planlama (brain repo): `projects/writing-platform.md`

## Folder map

- `apps/web/` — Astro 7 static site (dev: `yarn dev`, build: `yarn build`)
- `sources/content/` — tüm md içerik, tek collection (Aug travelog örnekleri + yeni draft'lar)
- `sources/management/` — repo meta (PROJECT.md ve sonraki meta dosyaları)

## Rules

- **Package manager: yarn** (npm asla). Lockfile: `yarn.lock`.
- **Git commit/push:** agent asla commit atmaz — sadece **title öner**, kullanıcı çalıştırır.
- **Language:** kod ve config English; içerik ve reader-facing metin Türkçe. Dosya/klasör adları English kebab-case.
- **Content schema** (`apps/web/src/content.config.ts`):
  - Required: `title`, `date`, `country`
  - Optional: `city`, `summary`
  - Enum: `type` = `note | stay | eat | work` (default `note`), `lang` = `tr | en` (default `tr`), `status` = `draft | published` (default `draft`)
  - Bilinmeyen key'ler Zod tarafından **sessizce strip** edilir (Aug entry'lerinin coord/wifi/vs ölü frontmatter'ı build'i bozmuyor)
- **Publish filter:** `/` sadece `status: 'published'` entry'leri gösterir; `[slug]` hepsini render eder (draft'lar direct URL ile görülebilir dev'de).
- **Draft cleanup at publish:** publish etmeden önce body'deki writer-only meta bloklarını (`**Şekil:**`, `**Hedef uzunluk:**`, `## Notlar (writer-only, ...)` gibi) strip et.
- **Yeni content location konvansiyonu:** ham malzeme `sources/*` altında namespace'lenir. `content/` şu an aktif; ilerde `media/`, `data/` slot'ları eklenebilir.

## Scope discipline

v1 = **read + look good + deploy**. Aşağıdakiler ayrı fazlar, v1'e sokulmaz:

- **Faz 2:** React islands — `<Triangle />` (eat/stay/work interaktif) + `<Routine />` (günlük ritim)
- **Faz 3:** PDF export (paged.js veya rehype-based; manifesto + tüm published entries tek kitap)
- **Faz 4:** polar.sh — $0+ opsiyonel destek widget

Aug PROJECT.md'de listelenen atlas/map/wikilinks/Timeline'lar **kalıcı olarak scope dışı**.

## Astro-specific gotchas

- **Content entries aren't serializable** — Faz 2 islands'e plain objects pas et, `render()` içeren entry'i doğrudan gönderme.
- **`z.coerce.date()`** kullan — bare YAML date string parse olur, sıralama sessizce bozulur.
- **StrictMode double-invokes effects** — Faz 2 island init'lerinde guard koy.
- **Reserve island height in CSS** — hydration'da sayfa zıplar.
- **`text-wrap: balance` sadece `<h1>`'da** — body text'te zarar verir.
- **Glob loader base path:** `apps/web/src/content.config.ts`'ten `../../sources/content` (proje kökünden relative).

## Design tokens

Palette: indigo-on-paper (`--paper` `#FBFAF7`, `--ink` `#14181C`, `--indigo` `#1F3D6B`). Dark mode `prefers-color-scheme` ile otomatik, toggle yok. Type: Newsreader (display + body) + JetBrains Mono (utility/measured values).

Detaylar: PROJECT.md "Design tokens" bölümü.

## When unsure — ask

Yeni bir konvansiyon çıkarma. PROJECT.md'de yoksa, brain repo'daki `projects/writing-platform.md`'de yoksa, kullanıcıya sor.
