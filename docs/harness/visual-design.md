# Visual design: a university website, in the A2 house style

The app should look like a page on a university site, not a startup
dashboard. The reference is my A2 course site
(`comp4020-ass2-tejastagra`, built on `astro-theme-university` with the Slop
brand palette); this app reuses its look without depending on the theme.
Why: students trust a results page that looks like the rest of the
university, and one consistent style across my work is a deliberate choice.

## Palette (from the A2 brand file, `astro-theme-slop/slop.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--gold` | `#b97d1c` | h1/h2 (24px+ only: 3.2:1 contrast), table headers, the content rule, accents |
| `--bronze` | `#8a5c13` | links, small headings (h3 and below), primary buttons (white text, 5.9:1) |
| `--grey` | `#6b6154` | secondary text, borders |
| `--bg` | `#fdfcf9` | warm off-white page |
| `--ink` | `#2a2520` | body text |

Gold is never used for text under 24px, since it fails contrast there; use
bronze instead. Grade badges keep their own colours so HD/D/CR/P/N read at a
glance, but always with the letters.

## Layout

- **Header:** white bar with a crest mark + "ANU / Grades" lockup (the slash
  in gold, like "Slop / University"), plain text nav links on the right, the
  current page in gold. On phones the links collapse behind a menu button
  (JS enhancement; without JS the links show in a row under the lockup).
  Don't use ANU's real crest or logo: this is a prototype, not the
  official system.
- **Nav contents:** logged out, only **Log in** and **About**. There's no
  "Home" item; the lockup links to `/`. Logged in: Dashboard, Archive,
  Planner, About, and Log out.
- **Content column:** max ~48rem, with a thin gold vertical rule down its
  left edge on screens 720px and wider (hidden on phones).
- **Landing (logged out `/`):** a dark banner hero with a large white title
  and a short gold underline, then a lede paragraph and the login card.
- **Inner pages:** a large gold h1, then a lede paragraph in larger grey
  text.
- **Tables:** gold header row, lightly striped rows. Allowed only where they
  fit at 360px (e.g. the archive's code / course / units / grade).
- **Cards:** near-square corners (6px), a thin gold-tinted border, a bronze
  title.
- **Footer:** divider lines, a short "prototype, not the official record"
  note.
- **Type:** Public Sans (Google Fonts) with system fallbacks, 18px base.
