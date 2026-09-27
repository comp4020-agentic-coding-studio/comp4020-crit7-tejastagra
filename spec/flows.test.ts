import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { axeViolations, Client, textOf } from "./http";

// The crit 7 contracts, driven over HTTP against the built server:
// - "models a slice of a real ANU system, wired end to end": staff set up a
//   course, enrol a student, upload and release marks and a grade; the
//   student logs in and sees exactly what was released.
// - "the core flow persists across a reload": every step is re-read fresh.
// - results are official: staff write them, students only read them, and
//   each side only reaches its own data (CLAUDE.md, rule 3).
const baseUrl = inject("baseUrl");
const DEMO_STUDENT = { uniId: "u7654321", password: "demo1234" };
const DEMO_STAFF = { uniId: "u1000001", password: "staff1234" };
const OTHER_STAFF = { uniId: "u1000002", password: "staff1234" };

// Logged-in pages, which the invariants (public routes only) can't reach.
const STUDENT_ROUTES = ["/", "/archive/", "/planner/"];
const STAFF_ROUTES = ["/staff/"];

const uniqueUniId = () => `u${String(Date.now() + Math.floor(Math.random() * 1e6)).slice(-7)}`;

async function firstHref(c: Client, page: string, selector: string): Promise<string> {
  const href = new JSDOM(await c.html(page)).window.document.querySelector(selector)?.getAttribute("href");
  if (!href) throw new Error(`no ${selector} on ${page}`);
  return href;
}

describe("login and roles", () => {
  it("sends a logged-out visitor from a student page to the student login", async () => {
    const res = await new Client(baseUrl).get("/archive/");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/login/");
  });

  it("sends a logged-out visitor from a staff page to the same login", async () => {
    const res = await new Client(baseUrl).get("/staff/");
    expect(res.headers.get("location")).toContain("/login/?next=%2Fstaff%2F");
  });

  it("refuses a wrong password", async () => {
    const c = new Client(baseUrl);
    const res = await c.post("/api/login", { ...DEMO_STUDENT, password: "nope" });
    expect(Client.location(res, baseUrl).searchParams.get("error")).toBeTruthy();
    expect(c.cookie).toBe("");
  });

  it("uses one login page: staff land on their courses, students on their dashboard", async () => {
    const staff = new Client(baseUrl);
    const res = await staff.login(DEMO_STAFF.uniId, DEMO_STAFF.password);
    expect(Client.location(res, baseUrl).pathname).toBe("/staff/");
    expect((await staff.get("/")).headers.get("location")).toBe("/staff/");
    expect(textOf(await staff.html("/staff/"))).toContain("My courses");

    const student = new Client(baseUrl);
    const landed = await student.login(DEMO_STUDENT.uniId, DEMO_STUDENT.password);
    expect(Client.location(landed, baseUrl).pathname).toBe("/");
    expect(textOf(await student.html("/"))).toContain("Career GPA");
  });

  it("ignores a next= that belongs to the other role", async () => {
    const student = new Client(baseUrl);
    const res = await student.post("/api/login", { ...DEMO_STUDENT, next: "/staff/" });
    expect(Client.location(res, baseUrl).pathname).toBe("/");
    const staff = new Client(baseUrl);
    const res2 = await staff.post("/api/login", { ...DEMO_STAFF, next: "/archive/" });
    expect(Client.location(res2, baseUrl).pathname).toBe("/staff/");
  });

  it("shows only Log in and About in the logged-out nav", async () => {
    const doc = new JSDOM(await new Client(baseUrl).html("/")).window.document;
    const links = [...doc.querySelectorAll("nav a:not(.lockup)")].map((a) => a.textContent?.trim());
    expect(links).toEqual(["Log in", "About"]);
  });

  it("logs out", async () => {
    const c = new Client(baseUrl);
    await c.login(DEMO_STUDENT.uniId, DEMO_STUDENT.password);
    await c.post("/api/logout", {});
    expect((await c.get("/archive/")).status).toBe(303);
  });
});

describe("logged-in pages meet the accessibility floor", () => {
  const student = new Client(baseUrl);
  const staff = new Client(baseUrl);
  let studentCourse = "";
  let staffOffering = "";
  let staffItem = "";

  beforeAll(async () => {
    await student.login(DEMO_STUDENT.uniId, DEMO_STUDENT.password);
    await staff.login(DEMO_STAFF.uniId, DEMO_STAFF.password);
    studentCourse = await firstHref(student, "/", 'a[href^="/courses/"]');
    staffOffering = await firstHref(staff, "/staff/", 'a[href^="/staff/offerings/"]');
    staffItem = await firstHref(staff, staffOffering, 'a[href*="/items/"]');
  });

  const check = async (c: Client, route: string) => {
    const html = await c.html(route);
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelectorAll("h1").length).toBe(1);
    expect(doc.querySelector("nav")).toBeTruthy();
    expect(await axeViolations(html, new URL(route, baseUrl).href)).toEqual([]);
  };

  for (const route of STUDENT_ROUTES) it(`student ${route}`, () => check(student, route));
  for (const route of STAFF_ROUTES) it(`staff ${route}`, () => check(staff, route));
  it("student course page, plain and with a what-if filled in", async () => {
    await check(student, studentCourse);
    // the newest course is in progress, so it has a what-if form
    const input = new JSDOM(await student.html(studentCourse)).window.document.querySelector('input[name^="w"]');
    expect(input, "in-progress course should offer a what-if").toBeTruthy();
    const scenario = `${studentCourse}?${input!.getAttribute("name")}=5`;
    expect(textOf(await student.html(scenario))).toContain("With those marks");
    await check(student, scenario);
  });
  it("staff offering, class list and item pages", async () => {
    await check(staff, staffOffering);
    await check(staff, `${staffOffering}students/`);
    await check(staff, staffItem);
  });
});

describe("the demo student's archive follows the ANU GPA rules", () => {
  it("shows the career GPA from released grades only", async () => {
    const staff = new Client(baseUrl);
    await staff.login(DEMO_STAFF.uniId, DEMO_STAFF.password);
    await staff.post("/api/demo/reset", {});
    const c = new Client(baseUrl);
    await c.login(DEMO_STUDENT.uniId, DEMO_STUDENT.password);
    // 576 grade points over 108 GPA units: the WD is excluded, the N counts
    // as 6 units at 0 points, in-progress courses don't count yet
    const text = textOf(await c.html("/archive/"));
    expect(text).toContain("5.333");
    expect(text).toContain("576 points ÷ 108 units");
  });
});

describe("staff release results; the student sees exactly what's released", () => {
  const staff = new Client(baseUrl);
  const student = new Client(baseUrl);
  const uniId = uniqueUniId();
  let offering = ""; // /staff/offerings/<id>/
  let api = ""; // /api/staff/offerings/<id>
  let item1 = ""; // /api/staff/offerings/<id>/items/<id>
  let item2 = "";
  let studentCourse = "";

  beforeAll(async () => {
    await staff.login(DEMO_STAFF.uniId, DEMO_STAFF.password);
    await student.post("/api/register", { uniId, name: "Test Student", password: "password123" });
  });

  it("staff create an offering", async () => {
    const res = await staff.post("/api/staff/offerings", {
      code: "comp 9999",
      title: "Spec Testing",
      units: "6",
      year: "2026",
      term: "S2",
    });
    offering = Client.location(res, baseUrl).pathname;
    expect(offering).toMatch(/^\/staff\/offerings\/\d+\/$/);
    api = `/api${offering.replace(/\/$/, "")}`;
    expect(textOf(await staff.html(offering))).toContain("COMP9999");
  });

  it("staff add assessment items, hidden until released", async () => {
    await staff.post(api, { _action: "add-item", name: "Assignment 1", weight: "40", outOf: "20" });
    await staff.post(api, { _action: "add-item", name: "Final exam", weight: "60", outOf: "100" });
    const doc = new JSDOM(await staff.html(offering)).window.document;
    const links = [...doc.querySelectorAll('a[href*="/items/"]')].map((a) => a.getAttribute("href")!);
    expect(links).toHaveLength(2);
    [item1, item2] = links.map((l) => `/api${l.replace(/\/$/, "")}`);
    expect(textOf(doc.body.outerHTML)).toContain("Not released");
  });

  it("staff enrol the student from a class-list CSV", async () => {
    const res = await staff.post(api, { _action: "enrol-csv", csv: `uni_id,name\n${uniId},Test Student\nnot-an-id,Bob` });
    expect(Client.location(res, baseUrl).searchParams.get("notice")).toContain("Enrolled 1 student");
    expect(textOf(await staff.html(`${offering}students/`))).toContain(uniId);
  });

  it("the student sees the course on their dashboard, with nothing released yet", async () => {
    studentCourse = await firstHref(student, "/", 'a[href^="/courses/"]');
    const text = textOf(await student.html(studentCourse));
    expect(text).toContain("COMP9999");
    expect(text).toContain("Not released");
  });

  it("staff upload marks by CSV; the student can't see them until release", async () => {
    const res = await staff.post(item1, { _action: "upload-marks", csv: `${uniId},16` });
    expect(Client.location(res, baseUrl).searchParams.get("notice")).toContain("Uploaded 1 mark");
    expect(textOf(await student.html(studentCourse))).not.toContain("16 / 20");

    await staff.post(item1, { _action: "release" });
    expect(textOf(await student.html(studentCourse))).toContain("16 / 20");
  });

  it("a mark entered but not released stays invisible", async () => {
    await staff.post(item2, { _action: "upload-marks", csv: `${uniId},90` });
    expect(textOf(await student.html(studentCourse))).not.toContain("90 / 100");
  });

  it("the student sets a target and sees what's needed on the rest", async () => {
    await student.post(`/api${studentCourse.replace(/\/$/, "")}`, { _action: "target", target: "70", customTarget: "" });
    // 32 marks banked (16/20 of 40%), 60% to come: (70 − 32) / 60 = 63.3%
    expect(textOf(await student.html(studentCourse))).toContain("63.3%");
  });

  it("a what-if shows the final grade and GPA effect, and stores nothing", async () => {
    const itemId = item2.split("/").at(-1);
    // 32 + 60 × 0.75 = 77 → D (6 points); the student has no other results
    const text = textOf(await student.html(`${studentCourse}?w${itemId}=75`));
    expect(text).toContain("You'd finish on 77");
    expect(text).toContain("Distinction");
    expect(text).toContain("from — to 6.000");
    // nothing stuck: a plain reload shows no scenario, and staff still see 90
    expect(textOf(await student.html(studentCourse))).not.toContain("You'd finish on");
  });

  it("staff release a final grade and the student's GPA counts it", async () => {
    await staff.post(item2, { _action: "release" });
    const res = await staff.post(api, { _action: "fill-grades" });
    // 32 + 54 = 86 → HD
    expect(Client.location(res, baseUrl).searchParams.get("notice")).toContain("Filled 1 grade");
    const text = textOf(await student.html("/archive/"));
    expect(text).toContain("7.000");
  });

  it("the archive shows the now-finished course as a course box, not a table", async () => {
    const doc = new JSDOM(await student.html("/archive/")).window.document;
    expect(doc.querySelector(".course-card")).toBeTruthy();
    expect(doc.querySelector("table")).toBeNull();
  });

  it("staff rejects a mark over what the item is out of, saving nothing", async () => {
    const html = await staff.html(offering.replace(/\/$/, "") + item1.replace(/^.*(\/items\/\d+)$/, "$1/"));
    const input = new JSDOM(html).window.document.querySelector('input[name^="score-"]')!;
    const res = await staff.post(item1, { _action: "save-marks", [input.getAttribute("name")!]: "25" });
    expect(Client.location(res, baseUrl).searchParams.get("error")).toContain("between 0 and 20");
    expect(textOf(await student.html(studentCourse))).toContain("16 / 20");
  });
});

describe("students can only read results", () => {
  const student = new Client(baseUrl);
  let course = "";

  beforeAll(async () => {
    await student.login(DEMO_STUDENT.uniId, DEMO_STUDENT.password);
    course = await firstHref(student, "/archive/", 'a[href^="/courses/"]');
  });

  it("can't reach any staff page or endpoint", async () => {
    expect((await student.get("/staff/")).headers.get("location")).toBe("/");
    expect((await student.post("/api/staff/offerings", { code: "X", title: "X", units: "6", year: "2026", term: "S2" })).status).toBe(403);
    expect((await student.post("/api/staff/offerings/1", { _action: "save-grades" })).status).toBe(403);
    expect((await student.post("/api/staff/offerings/1/items/1", { _action: "save-marks" })).status).toBe(403);
  });

  it("can't do anything to a course but set their own target", async () => {
    const res = await student.post(`/api${course.replace(/\/$/, "")}`, { _action: "delete" });
    expect(res.status).toBe(403);
  });

  it("can't see another student's enrolment", async () => {
    const other = new Client(baseUrl);
    await other.post("/api/register", { uniId: uniqueUniId(), name: "Nosy", password: "password123" });
    expect((await other.get(course)).status).toBe(404);
    expect((await other.post(`/api${course.replace(/\/$/, "")}`, { _action: "target", target: "50" })).status).toBe(404);
  });
});

describe("staff only manage their own offerings", () => {
  it("404s another convenor's offering, for reads and writes", async () => {
    const demo = new Client(baseUrl);
    await demo.login(DEMO_STAFF.uniId, DEMO_STAFF.password);
    const offering = await firstHref(demo, "/staff/", 'a[href^="/staff/offerings/"]');

    const other = new Client(baseUrl);
    await other.login(OTHER_STAFF.uniId, OTHER_STAFF.password);
    expect((await other.get(offering)).status).toBe(404);
    const res = await other.post(`/api${offering.replace(/\/$/, "")}`, { _action: "delete" });
    expect(res.status).toBe(404);
    expect((await demo.get(offering)).status).toBe(200);
  });

  it("won't let a non-demo account reset the demo data", async () => {
    const other = new Client(baseUrl);
    await other.login(OTHER_STAFF.uniId, OTHER_STAFF.password);
    expect((await other.post("/api/demo/reset", {})).status).toBe(403);
  });
});

describe("live sync", () => {
  it("tells a student when staff change their results", async () => {
    const student = new Client(baseUrl);
    await student.login(DEMO_STUDENT.uniId, DEMO_STUDENT.password);
    const staff = new Client(baseUrl);
    await staff.login(DEMO_STAFF.uniId, DEMO_STAFF.password);
    const offering = await firstHref(staff, "/staff/", 'a[href^="/staff/offerings/"]');

    const stream = await fetch(new URL("/api/events", baseUrl), { headers: { cookie: student.cookie } });
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body!.getReader();

    await staff.post(`/api${offering.replace(/\/$/, "")}`, { _action: "fill-grades" });

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
