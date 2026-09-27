import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { axeViolations, Client, textOf } from "./http";

// The crit 7 contracts, driven over HTTP against the built server:
// - "models a slice of a real ANU system, wired end to end": log in, see the
//   archive and GPA, enter marks, set targets, plan a GPA.
// - "the core flow persists across a reload": everything created is still
//   there on a fresh request.
// - a student only ever sees their own data (CLAUDE.md).
const baseUrl = inject("baseUrl");
const DEMO = { uniId: "u7654321", password: "demo1234" };

// Logged-in pages: the invariants in invariants.test.ts only see public
// routes, so the same floor is asserted here for these.
const AUTHED_ROUTES = ["/", "/archive/", "/planner/", "/courses/new/"];

const uniqueUniId = () => `u${String(Date.now() + Math.floor(Math.random() * 1e6)).slice(-7)}`;

describe("login", () => {
  it("sends a logged-out visitor from a private page to the login page", async () => {
    const res = await new Client(baseUrl).get("/archive/");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/login/");
  });

  it("refuses a wrong password", async () => {
    const c = new Client(baseUrl);
    const res = await c.post("/api/login", { uniId: DEMO.uniId, password: "nope", next: "/" });
    expect(res.headers.get("location")).toContain("error=");
    expect(c.cookie).toBe("");
  });

  it("logs the demo student in and shows their dashboard", async () => {
    const c = new Client(baseUrl);
    await c.login(DEMO.uniId, DEMO.password);
    const text = textOf(await c.html("/"));
    expect(text).toContain("Career GPA");
    expect(text).toContain("This semester");
  });

  it("logs out", async () => {
    const c = new Client(baseUrl);
    await c.login(DEMO.uniId, DEMO.password);
    await c.post("/api/logout", {});
    expect((await c.get("/archive/")).status).toBe(303);
  });
});

describe("logged-in pages meet the accessibility floor", () => {
  const c = new Client(baseUrl);
  beforeAll(() => c.login(DEMO.uniId, DEMO.password));

  for (const route of [...AUTHED_ROUTES, "/courses/1/"]) {
    it(`${route}: one h1, a nav, and no axe violations`, async () => {
      const html = await c.html(route);
      const doc = new JSDOM(html).window.document;
      expect(doc.querySelectorAll("h1").length).toBe(1);
      expect(doc.querySelector("nav")).toBeTruthy();
      expect(await axeViolations(html, new URL(route, baseUrl).href)).toEqual([]);
    });
  }
});

describe("the archive shows released results the ANU way", () => {
  it("shows the demo student's career GPA from the ANU formula", async () => {
    const c = new Client(baseUrl);
    await c.login(DEMO.uniId, DEMO.password);
    await c.post("/api/demo/reset", {});
    // seeded history: 576 grade points over 108 GPA units (the WD is excluded,
    // the N counts as 6 units at 0 points)
    const text = textOf(await c.html("/archive/"));
    expect(text).toContain("5.333");
    expect(text).toContain("576 points ÷ 108 units");
    expect(text).toContain("Semester 1 2024");
  });
});

describe("a new student's core flow persists across a reload", () => {
  const c = new Client(baseUrl);
  const uniId = uniqueUniId();
  let coursePath = "";

  beforeAll(async () => {
    const res = await c.post("/api/register", { uniId, name: "Test Student", password: "password123" });
    expect(res.status).toBe(303);
  });

  it("adds a course and lands on its page", async () => {
    const res = await c.post("/api/courses", {
      code: "comp 1100",
      title: "Programming as Problem Solving",
      units: "6",
      year: "2026",
      term: "S2",
      grade: "",
    });
    expect(res.status).toBe(303);
    coursePath = new URL(res.headers.get("location")!, baseUrl).pathname;
    expect(coursePath).toMatch(/^\/courses\/\d+\/$/);
    expect(textOf(await c.html(coursePath))).toContain("COMP1100");
  });

  it("adds assessments with marks, and they're there on a fresh load", async () => {
    const api = `/api${coursePath.replace(/\/$/, "")}`;
    await c.post(api, { _action: "add-assessment", name: "Assignment 1", weight: "20", outOf: "20", score: "16" });
    await c.post(api, { _action: "add-assessment", name: "Assignment 2", weight: "30", outOf: "30", score: "21" });
    await c.post(api, { _action: "add-assessment", name: "Final exam", weight: "50", outOf: "100", score: "" });
    const text = textOf(await c.html(coursePath));
    expect(text).toContain("16 / 20");
    expect(text).toContain("21 / 30");
    expect(text).toContain("Final exam");
  });

  it("sets a target and says what's needed on the final", async () => {
    const api = `/api${coursePath.replace(/\/$/, "")}`;
    await c.post(api, { _action: "target", target: "70", customTarget: "" });
    // 37 marks banked, 50% to come: (70 − 37) / 50 = 66%
    const text = textOf(await c.html(coursePath));
    expect(text).toContain("66%");
    expect(text).toContain("66 / 100 on Final exam");
  });

  it("updates a mark and the needed figure follows", async () => {
    const html = await c.html(coursePath);
    const action = new JSDOM(html).window.document
      .querySelector('form[action*="/assessments/"]')!
      .getAttribute("action")!;
    await c.post(action, { _action: "score", score: "20" }); // 16/20 → 20/20
    // 41 banked: (70 − 41) / 50 = 58%
    expect(textOf(await c.html(coursePath))).toContain("58%");
  });

  it("releases a grade, and the career GPA counts it", async () => {
    const api = `/api${coursePath.replace(/\/$/, "")}`;
    await c.post(api, {
      _action: "update",
      code: "COMP1100",
      title: "Programming as Problem Solving",
      units: "6",
      year: "2026",
      term: "S2",
      grade: "D",
    });
    const text = textOf(await c.html("/archive/"));
    expect(text).toContain("6.000");
  });

  it("saves a target GPA and plans the rest of the degree", async () => {
    await c.post("/api/plan", { targetGpa: "6.5", degreeUnits: "144" });
    // 36 points over 6 units; 138 units left: (6.5 × 144 − 36) / 138 = 6.52
    const text = textOf(await c.html("/planner/"));
    expect(text).toContain("6.52");
    expect(text).toContain("138 units");
  });

  it("rejects a mark bigger than the item is out of", async () => {
    const html = await c.html(coursePath);
    const action = new JSDOM(html).window.document
      .querySelector('form[action*="/assessments/"]')!
      .getAttribute("action")!;
    const res = await c.post(action, { _action: "score", score: "25" });
    const error = new URL(res.headers.get("location")!, baseUrl).searchParams.get("error");
    expect(error).toContain("between 0 and 20");
  });
});

describe("a student only sees their own data", () => {
  it("404s another student's course, for reads and writes", async () => {
    const demo = new Client(baseUrl);
    await demo.login(DEMO.uniId, DEMO.password);
    const archive = await demo.html("/archive/");
    const demoCourse = new JSDOM(archive).window.document
      .querySelector('a[href^="/courses/"]:not([href="/courses/new/"])')!
      .getAttribute("href")!;

    const other = new Client(baseUrl);
    await other.post("/api/register", { uniId: uniqueUniId(), name: "Nosy", password: "password123" });
    expect((await other.get(demoCourse)).status).toBe(404);
    const res = await other.post(`/api${demoCourse.replace(/\/$/, "")}`, { _action: "delete" });
    expect(res.status).toBe(404);
    expect((await demo.get(demoCourse)).status).toBe(200);
  });

  it("won't let anyone but the demo account reset data", async () => {
    const c = new Client(baseUrl);
    await c.post("/api/register", { uniId: uniqueUniId(), name: "Someone", password: "password123" });
    expect((await c.post("/api/demo/reset", {})).status).toBe(403);
  });
});

describe("live sync", () => {
  it("tells a student's other open devices when their data changes", async () => {
    const phone = new Client(baseUrl);
    await phone.post("/api/register", { uniId: uniqueUniId(), name: "Synced", password: "password123" });
    const laptop = new Client(baseUrl);
    laptop.cookie = phone.cookie;

    const stream = await fetch(new URL("/api/events", baseUrl), { headers: { cookie: laptop.cookie } });
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body!.getReader();

    await phone.post("/api/plan", { targetGpa: "6", degreeUnits: "144" });

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes("event: changed")) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain("event: changed");
  }, 10_000);

  it("streams an opening comment to anonymous clients (the deploy probe)", async () => {
    const res = await fetch(new URL("/api/events", baseUrl));
    const { value } = await res.body!.getReader().read();
    expect(new TextDecoder().decode(value)).toContain(": connected");
  });
});
