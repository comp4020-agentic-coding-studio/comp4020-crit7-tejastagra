# Visual design: a university website, in the A2 house style

The app should look like a page on a university site, not a startup
dashboard. The reference is my A2 course site
(`comp4020-ass2-tejastagra`, built on `astro-theme-university` with the Slop
brand palette). This app copies its look without depending on the theme.
Why: students trust a results page that looks like the rest of the
university, and one consistent style across my work is a deliberate choice.

The values below were **measured** from the built A2 site (computed styles
in headless Chrome, 2026-09-28), not eyeballed. Don't "improve" them with a
colour of your own: the earlier cream background and bronze buttons were
rejected for exactly that reason.

## Tokens (at an 18px root, as on A2)

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `oklch(0.994 0.004 73)` | page, header, cards (cards have no fill of their own) |
| `--text` | `oklch(0.2 0.01 73)` | body text |
| `--text-2` | `--text` at 78% | lede, nav links, secondary text |
| `--muted` | `--text` at 62% | footer, hints, small print |
| `--divider` | `--text` at 12% | every border: cards, inputs, tables, footer rule |
| `--gold` | `#b97d1c` | headings, current nav item, buttons, table header, hero underline |
| `--link` | `oklch(0.536 0.127 73)` | links in text |
| `--on-gold` | `oklch(0.16 0 73)` | text on gold (buttons, table header): dark, not white |
| `--gold-soft` | gold at 10% | hover, selected, what-if result tint |
| `--stripe` | gold at 6% | even table rows |

Spacing is A2's scale: 9 / 18 / 27 / 36 / 72px (0.5 / 1 / 1.5 / 2 / 4rem).
Radius 6.75px on inputs and buttons; **cards are square**.

## Type (Public Sans)

- h1: 2.5rem (45px), **weight 400**, gold, letter-spacing -0.02em.
- h2: 1.875rem, weight 600, gold. h3: 1.375rem, 600, gold.
- Card titles: 1.125rem, 600, gold.
- Body 1rem (18px) 400, line-height 1.6. Lede 1.25rem in `--text-2`.
- Nav links 0.875rem, 400, `--text-2`; current page gold. Wordmark 600.
- Gold text is used only at these sizes/weights (large or 600+), where it
  passes contrast; small text links use `--link`.

## Layout

- **About 80% of the window, centred.** Content sits in a centred column
  80% of the window wide (capped at 80rem) on screens 1000px and wider;
  below that it's the full width minus a 1rem/2rem gutter. Not 100%: a
  full-bleed page with everything side by side was tried and read as too
  busy.
- **Functional, not busy.** Each page shows what the user came to do and
  nothing else: no marketing blocks ("What you can do"), no decorative
  hero, no duplicate summaries of what another page already shows. At most
  two columns (main + side) and never more than one row of stats. When in
  doubt, leave it out.
- **Centred reading pages.** The About page (the README) is a centred
  column of readable width (~48rem).
- **No vertical rule** down the page, and no coloured accent bars on any
  box. Boxes are one even 1px `--divider` border.
- **Header:** same background as the page, no bottom border; crest mark +
  "ANU / Grades" wordmark left, nav links right. Don't use ANU's real
  crest or logo: this is a prototype, not the official system.
- **Nav contents:** logged out, only **Log in** and **About** (the lockup is
  the way home). Students: Dashboard, Archive, Planner, About, Log out.
  Staff: My courses, About, Log out.
- **One login page** for everyone. The account's role decides where it
  lands (students to the dashboard, staff to My courses) and what the nav
  shows. There is no separate staff login.
- **Logged-out `/`:** just the login, in a narrow centred card. No hero,
  no feature list.
- **Boxes over tables.** Information is shown in boxes (the dashboard's
  course cards: code in gold, title, one meta line, grade badge on the
  right) so it's easy to scan. Past courses in the archive use the same
  course boxes as "This semester", grouped by session. Use a table only
  where comparing many rows side by side is the job (e.g. staff typing
  marks for a whole class), and say why in a comment.
- **Tables, where they're justified:** gold header row with dark text,
  weight 700; striped rows; cells padded 9px 13.5px.
- **Buttons:** gold fill with dark text, weight 600; secondary is a gold
  outline with gold text.
- **Footer:** a 1px divider rule, muted 0.875rem text.
