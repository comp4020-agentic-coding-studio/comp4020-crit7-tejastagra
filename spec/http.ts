import axe from "axe-core";
import { JSDOM } from "jsdom";

// A tiny HTTP client that holds one student's session cookie, so specs can
// drive the running app the way a browser would.
export class Client {
  cookie = "";
  constructor(readonly baseUrl: string) {}

  async get(path: string): Promise<Response> {
    return fetch(new URL(path, this.baseUrl), {
      headers: this.cookie ? { cookie: this.cookie } : {},
      redirect: "manual",
    });
  }

  async html(path: string): Promise<string> {
    const res = await this.get(path);
    if (res.status !== 200) throw new Error(`GET ${path} → ${res.status}`);
    return res.text();
  }

  // Astro checks form POSTs carry a same-origin Origin header (CSRF
  // protection); browsers send it automatically, a bare fetch doesn't.
  async post(path: string, fields: Record<string, string>): Promise<Response> {
    const res = await fetch(new URL(path, this.baseUrl), {
      method: "POST",
      headers: { origin: this.baseUrl, ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: new URLSearchParams(fields),
      redirect: "manual",
    });
    const set = res.headers.get("set-cookie")?.match(/grades_session=[^;]*/);
    if (set) this.cookie = set[0];
    return res;
  }

  async login(uniId: string, password: string): Promise<void> {
    const res = await this.post("/api/login", { uniId, password, next: "/" });
    if (res.status !== 303 || !this.cookie) throw new Error(`login failed for ${uniId}`);
  }
}

/** Visible text of a page, whitespace collapsed. */
export function textOf(html: string): string {
  const doc = new JSDOM(html).window.document;
  for (const s of doc.querySelectorAll("script, style")) s.remove();
  return (doc.body.textContent ?? "").replace(/\s+/g, " ");
}

/** axe violations for a served page, with the same jsdom limits as the
 *  invariants (no colour contrast). */
export async function axeViolations(html: string, url: string): Promise<string[]> {
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
  const window = dom.window as unknown as { eval: (s: string) => void; axe: typeof axe };
  window.eval(axe.source);
  const results = await window.axe.run(dom.window.document, {
    rules: { "color-contrast": { enabled: false }, "link-in-text-block": { enabled: false } },
  });
  return results.violations.map(
    ({ id, help, nodes }) => `${id}: ${help} (${nodes.map((n) => n.target.join(" ")).join("; ")})`,
  );
}
