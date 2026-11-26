import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
const ADMIN = { email: "info@kamana.in", emailVerified: true, issuer: "https://securetoken.google.com/kamana-b2c23", subject: "admin" };

const profile = {
  name: "Admin Test", phone: "9000000001", email: "", state: "Delhi", locationMode: "city" as const,
  city: "New Delhi", pincode: "", trade: "IT", jobProfile: "IT Support", expectedSalary: "15000",
  specialisation: "Created from admin test", status: "published" as const,
};
const complaint = {
  name: "Admin Test", email: "info@kamana.in", phone: "", category: "Other", profileUrl: "",
  details: "Created from admin test", status: "received" as const, resolutionNote: "",
};

beforeEach(() => {
  process.env.ADMIN_EMAILS = "info@kamana.in";
});

describe("admin access", () => {
  test("rejects anonymous, unverified and non-listed accounts", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.admin.me, {})).rejects.toThrow(/sign in/i);
    await expect(t.withIdentity({ ...ADMIN, emailVerified: false }).query(api.admin.me, {})).rejects.toThrow(/verified/i);
    await expect(t.withIdentity({ ...ADMIN, email: "x@y.com" }).query(api.admin.me, {})).rejects.toThrow(/access/i);
    await expect(t.withIdentity({ subject: "phone-user", phoneNumber: "+919000000001" }).query(api.admin.stats, {})).rejects.toThrow();
    expect(await t.withIdentity(ADMIN).query(api.admin.me, {})).toEqual({ email: "info@kamana.in" });
  });
});

describe("profiles", () => {
  test("combined search finds old titles and keeps related results in the selected location", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity(ADMIN);
    await a.mutation(api.admin.saveProfile, { fields: {
      ...profile, jobProfile: "Bank Security Guard", experience: "2 years",
    } });
    await a.mutation(api.admin.saveProfile, { fields: {
      ...profile, phone: "9000000002", jobProfile: "Tailor",
    } });
    const filters = { state: "Delhi", city: "New Delhi" };
    const guards = await t.query(api.profiles.search, { ...filters, profession: "चौकीदार" });
    expect(guards).toHaveLength(1);
    expect(guards[0]).toMatchObject({ experience: "2 years", expectedSalary: "15000" });
    expect(await t.query(api.profiles.search, { ...filters, profession: "stitching" })).toEqual([]);
    const related = await t.query(api.profiles.search, { ...filters, profession: "stitching", related: true });
    expect(related.map(p => p.jobProfile)).toEqual(["Tailor"]);
    expect(await t.query(api.profiles.search, { ...filters, city: "Other City", profession: "stitching", related: true })).toEqual([]);
  });

  test("create, edit, duplicate phone, search, delete", async () => {
    const a = convexTest(schema, modules).withIdentity(ADMIN);
    const id = await a.mutation(api.admin.saveProfile, { fields: profile });
    let rows = await a.query(api.admin.profiles, { status: "all", q: "admin test" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: "+919000000001", city: "New Delhi", search: { state: "delhi", city: "new delhi", job: "it support" } });
    expect(await a.query(api.profiles.search, { state: "Delhi", city: "New Delhi" })).toHaveLength(1);

    await a.mutation(api.admin.saveProfile, {
      id, fields: { ...profile, name: "Admin Test Edited", locationMode: "pincode", pincode: "110001", status: "hidden" },
    });
    rows = await a.query(api.admin.profiles, { status: "hidden", q: "" });
    expect(rows[0]).toMatchObject({ name: "Admin Test Edited", pincode: "110001", status: "hidden" });
    expect(rows[0].city).toBeUndefined();
    expect(await a.query(api.profiles.search, { state: "Delhi", pincode: "110001" })).toHaveLength(0); // hidden

    await expect(a.mutation(api.admin.saveProfile, { fields: { ...profile, name: "Dup" } })).rejects.toThrow(/already uses/);
    await expect(a.mutation(api.admin.saveProfile, { fields: { ...profile, phone: "123" } })).rejects.toThrow(/mobile/i);
    await expect(a.mutation(api.admin.saveProfile, { fields: { ...profile, phone: "9000000002", locationMode: "pincode", pincode: "12" } })).rejects.toThrow(/PIN/);

    await a.mutation(api.admin.deleteProfile, { id });
    expect(await a.query(api.admin.profiles, { status: "all", q: "" })).toHaveLength(0);
  });
});

describe("complaints", () => {
  test("create, edit, track, delete", async () => {
    const a = convexTest(schema, modules).withIdentity(ADMIN);
    const { id, ticket } = await a.mutation(api.admin.saveGrievance, { fields: complaint });
    expect(ticket).toMatch(/^KAM-[A-Z0-9]{12}$/);
    await a.mutation(api.admin.saveGrievance, {
      id, fields: { ...complaint, details: "Edited details", status: "in_review", resolutionNote: "Looking into it" },
    });
    const rows = await a.query(api.admin.grievances, { status: "open", q: ticket });
    expect(rows[0]).toMatchObject({ ticket, details: "Edited details", status: "in_review", resolutionNote: "Looking into it" });
    expect(await a.query(api.grievances.track, { ticket })).toMatchObject({ statusLabel: "In review", resolutionNote: "Looking into it" });
    await expect(a.mutation(api.admin.saveGrievance, { fields: { ...complaint, category: "Nope" } })).rejects.toThrow(/type/);
    await a.mutation(api.admin.updateGrievance, { id, status: "resolved", resolutionNote: "Done", notify: false });
    expect((await a.query(api.admin.stats, {})).open).toBe(0);
    await a.mutation(api.admin.deleteGrievance, { id });
    expect(await a.query(api.grievances.track, { ticket })).toBeNull();
  });
});
