import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { parseApplication } from "../convex/profiles";
import { previousIndiaDay, reportLine } from "../convex/profileReports";
import { canonicalProfession, matchesProfession, startsAWord } from "../lib/professions";

const modules = import.meta.glob("../convex/**/*.ts");
const ADMIN = { email: "info@kamana.in", emailVerified: true, issuer: "https://securetoken.google.com/kamana-b2c23", subject: "admin" };
const profile = {
  name: "Search Test", phone: "9000000001", email: "", state: "Delhi", locationMode: "city" as const,
  city: "New Delhi", pincode: "", trade: "", jobProfile: "IT Support", experience: "", expectedSalary: "15000",
  specialisation: "", status: "published" as const,
};

beforeEach(() => {
  process.env.ADMIN_EMAILS = "info@kamana.in";
});

describe("profession matching", () => {
  test("aliases map to one title", () => {
    expect(canonicalProfession("चौकीदार")).toBe("Security Guard");
    expect(canonicalProfession("  Bank  Security Guard ")).toBe("Security Guard");
    expect(canonicalProfession("Welder")).toBe("Welder");
  });

  test("matches from the start of a word only", () => {
    expect(startsAWord("IT Support", "it")).toBe(true);
    expect(startsAWord("Security Guard", "it")).toBe(false);
    expect(startsAWord("Auto / Three-Wheeler Driver", "wheeler")).toBe(true);
    expect(startsAWord("Electrician", "elec")).toBe(true);
  });

  test("related matching ignores filler words", () => {
    const p = { jobProfile: "Cook", specialisation: "Cooking and cleaning" };
    expect(matchesProfession(p, "Sales and Marketing", true)).toBe(false);
    expect(matchesProfession({ jobProfile: "Cleaner" }, "Office cleaner helper", true)).toBe(true);
  });
});

describe("apply form", () => {
  const form = { name: "A", state: "Delhi", city: "New Delhi", job_profile: "", phone: "9000000001" };

  test("uses the combined box, keeps experience and salary apart", () => {
    const r = parseApplication({ ...form, profession: "चौकीदार", work_experience: "2 years", expected_salary: "₹15,000" });
    expect(r).toMatchObject({ ok: true, profile: { jobProfile: "Security Guard", experience: "2 years", expectedSalary: "₹15,000" } });
  });

  test("still accepts the older form fields", () => {
    const r = parseApplication({ ...form, job_profile: "__OTHER__", job_other: "Welder", experience: "₹20,000" });
    expect(r).toMatchObject({ ok: true, profile: { jobProfile: "Welder", expectedSalary: "₹20,000" } });
    expect(parseApplication(form)).toMatchObject({ ok: false });
  });
});

describe("search", () => {
  test("finds old titles, and related results stay in the chosen place", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity(ADMIN);
    await a.mutation(api.admin.saveProfile, { fields: { ...profile, jobProfile: "Bank Security Guard", experience: "2 years" } });
    await a.mutation(api.admin.saveProfile, { fields: { ...profile, phone: "9000000002", jobProfile: "Tailor" } });
    const place = { state: "Delhi", city: "New Delhi" };

    const guards = await t.query(api.profiles.search, { ...place, profession: "चौकीदार" });
    expect(guards).toHaveLength(1);
    expect(guards[0]).toMatchObject({ experience: "2 years", expectedSalary: "15000" });

    expect(await t.query(api.profiles.search, { ...place, profession: "stitching" })).toEqual([]);
    const related = await t.query(api.profiles.search, { ...place, profession: "stitching", related: true });
    expect(related.map((p) => p.jobProfile)).toEqual(["Tailor"]);
    expect(await t.query(api.profiles.search, { ...place, city: "Other City", profession: "stitching", related: true })).toEqual([]);

    expect(await t.query(api.profiles.search, { state: "Delhi", profession: "" })).toHaveLength(2);
    expect(await t.query(api.profiles.search, { state: "Delhi", profession: "IT" })).toEqual([]); // not "securITy"
  });
});

describe("re-submitting a profile", () => {
  test("keeps the id, creation date, hidden status and specialisation", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity(ADMIN);
    const id = await a.mutation(api.admin.saveProfile, {
      fields: { ...profile, specialisation: "Night shifts", status: "hidden" },
    });
    const before = await t.run((ctx) => ctx.db.get(id));

    const parsed = parseApplication({
      name: "New Name", state: "Delhi", city: "New Delhi", job_profile: "", profession: "Driver", phone: "9000000001",
    });
    if (!parsed.ok) throw new Error(parsed.message);
    expect(await t.mutation(internal.profiles.upsert, { profile: parsed.profile })).toBe(true);

    const rows = await t.run((ctx) => ctx.db.query("profiles").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      _id: id, name: "New Name", jobProfile: "Driver", status: "hidden",
      specialisation: "Night shifts", createdAt: before!.createdAt,
    });

    const fresh = parseApplication({ name: "B", state: "Delhi", city: "New Delhi", job_profile: "", profession: "Cook", phone: "9000000003" });
    if (!fresh.ok) throw new Error(fresh.message);
    expect(await t.mutation(internal.profiles.upsert, { profile: fresh.profile })).toBe(false);
  });
});

describe("daily report", () => {
  test("covers the previous India-time day", () => {
    // 2026-11-26 00:10 IST = 2026-11-25 18:40 UTC
    const day = previousIndiaDay(Date.UTC(2026, 10, 25, 18, 40));
    expect(day.date).toBe("2026-11-25");
    expect(day.start).toBe(Date.UTC(2026, 10, 24, 18, 30));
    expect(day.end - day.start).toBe(24 * 3600 * 1000);
  });

  test("lists the useful fields", () => {
    const line = reportLine({
      ...profile, _id: "x" as never, _creationTime: 0, phone: "+919000000001", trade: undefined, email: undefined,
      pincode: undefined, experience: "2 years", specialisation: undefined, createdAt: 0, updatedAt: 0,
      search: { state: "", city: "", trade: "", job: "" },
    });
    expect(line).toBe("Search Test | IT Support | New Delhi | Delhi | 2 years | 15000 | +919000000001");
  });
});
