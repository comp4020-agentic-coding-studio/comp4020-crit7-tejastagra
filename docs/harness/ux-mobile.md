# UX: mobile-first, plain, usable by any student

## Phone first

- Write CSS for a 360px-wide screen first, then widen with `min-width`
  media queries. Every feature (add a course, enter a mark, set a target,
  plan a GPA) must be doable on a phone. Why: the release email gets opened
  on a phone.
- No wide tables for assessment lists: use stacked cards or
  definition lists that reflow. A table is fine only when it fits at 360px.
- Tap targets at least 44px tall. Inputs at least 16px font so iOS doesn't
  zoom on focus. Use `inputmode="decimal"` for marks.
- No horizontal page scroll at any width.

## Works without JavaScript

Every form is a real `<form method="post">`. Client JS only enhances (live
sync refresh). Why: slow campus wifi, and it keeps the app testable over
plain HTTP.

## Accessibility

- Exactly one `<h1>` per page, a `<nav>`, a `lang`, a real `<title>`.
- Every input has a `<label>`. Errors are announced (`role="alert"`).
- Grade colour is never the only signal: the grade letters are always shown.
- Keep axe (jsdom) green on every route, including logged-in pages.

## Voice

Talk to the student plainly: "You need 64% on the final exam to get a D",
not "Required remaining performance: 0.64". Numbers carry their meaning in
words. Say what's impossible or already secured, kindly and directly.
Show GPAs to 3 decimal places (ANU's rule) and marks to at most 1.
