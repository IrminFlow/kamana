import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { EMAIL_RE, MSG, assertServer, clean, fail, normalizeIndianMobile } from "./lib";
import { verifyPhone } from "./otp";
import { canonicalProfession, matchesProfession } from "../lib/professions";

const OTHER_STATE = "__OTHER_STATE__";
const OTHER_CITY = "__OTHER__";
const BY_PIN = "__PIN__";
const OTHER_TRADE = "__OTHER_TRADE__";
const OTHER_JOB = "__OTHER__";
const PIN_RE = /^[1-9]\d{5}$/;
const MAX_RESULTS = 60;
const MAX_SCANNED = 4000; // keeps each search well inside Convex read limits

/** The raw fields posted by the Apply for Job form (names match the HTML inputs). */
export const applicationFields = v.object({
  name: v.string(),
  state: v.string(),
  state_other: v.optional(v.string()),
  city: v.string(),
  city_other: v.optional(v.string()),
  pincode: v.optional(v.string()),
  trade: v.optional(v.string()),
  trade_other: v.optional(v.string()),
  profession: v.optional(v.string()), // the combined "Trade / Job Profile" box
  job_profile: v.string(), // older form: job dropdown
  job_other: v.optional(v.string()),
  work_experience: v.optional(v.string()),
  expected_salary: v.optional(v.string()),
  experience: v.optional(v.string()), // older form: this name held the expected salary
  description: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.string(),
});

type ProfileInput = Omit<Doc<"profiles">, "_id" | "_creationTime" | "createdAt" | "updatedAt" | "status">;

const lower = (s: string | undefined) => (s ?? "").toLocaleLowerCase("en-IN");

/** Turns form fields into a clean profile, or returns a user-facing error. */
export function parseApplication(f: typeof applicationFields.type): { ok: true; profile: ProfileInput } | { ok: false; message: string } {
  const name = clean(f.name, 100);
  if (!name) return fail("Please enter your name.");

  const state = f.state === OTHER_STATE ? clean(f.state_other, 100) : clean(f.state, 100);
  if (!state) return fail("Please choose your state.");

  let locationMode: "city" | "pincode" = "city";
  let city: string | undefined;
  let pincode: string | undefined;
  if (f.city === BY_PIN) {
    locationMode = "pincode";
    pincode = clean(f.pincode, 6);
    if (!PIN_RE.test(pincode)) return fail("Please enter a valid 6-digit PIN code.");
  } else {
    city = f.city === OTHER_CITY ? clean(f.city_other, 100) : clean(f.city, 100);
    if (!city) return fail("Please choose your city.");
  }

  const trade = (f.trade === OTHER_TRADE ? clean(f.trade_other, 100) : clean(f.trade, 100)) || undefined;
  const typedJob = clean(f.profession, 120) || (f.job_profile === OTHER_JOB ? clean(f.job_other, 120) : clean(f.job_profile, 120));
  const jobProfile = clean(canonicalProfession(typedJob), 120);
  if (!jobProfile) return fail("Please enter your trade or job profile.");

  const email = clean(f.email, 254).toLowerCase() || undefined;
  if (email && !EMAIL_RE.test(email)) return fail("Please enter a valid email address.");

  const phone = normalizeIndianMobile(f.phone);
  if (!phone) return fail(MSG.invalidPhone);

  return {
    ok: true,
    profile: {
      name,
      phone,
      email,
      state,
      locationMode,
      city,
      pincode,
      trade,
      jobProfile,
      experience: clean(f.work_experience, 80) || undefined,
      expectedSalary: clean(f.expected_salary ?? f.experience, 80) || undefined,
      specialisation: clean(f.description, 1200, true) || undefined,
      search: { state: lower(state), city: lower(city), trade: lower(trade), job: lower(jobProfile) },
    },
  };
}

/** Called by /api/profile: verifies the Firebase phone sign-in, then creates or replaces the profile for that phone. */
export const submit = action({
  args: { secret: v.string(), ip: v.string(), idToken: v.string(), fields: applicationFields },
  handler: async (ctx, args): Promise<{ ok: boolean; message: string; replaced?: boolean }> => {
    assertServer(args.secret);
    const parsed = parseApplication(args.fields);
    if (!parsed.ok) return parsed;

    const verified = await verifyPhone(ctx, parsed.profile.phone, args.ip, args.idToken);
    if (!verified.ok) return verified;

    const replaced: boolean = await ctx.runMutation(internal.profiles.upsert, { profile: parsed.profile });
    return { ok: true, message: MSG.verified, replaced };
  },
});

/** Called by /api/delete-profile. */
export const remove = action({
  args: { secret: v.string(), ip: v.string(), phone: v.string(), idToken: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; message: string }> => {
    assertServer(args.secret);
    const phone = normalizeIndianMobile(args.phone);
    if (!phone) return fail(MSG.invalidPhone);

    const verified = await verifyPhone(ctx, phone, args.ip, args.idToken);
    if (!verified.ok) return verified;

    const deleted: boolean = await ctx.runMutation(internal.profiles.deleteByPhone, { phone });
    return deleted ? { ok: true, message: MSG.deleted } : fail(MSG.noProfile);
  },
});

export const existsByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) =>
    (await ctx.db.query("profiles").withIndex("by_phone", (q) => q.eq("phone", phone)).first()) !== null,
});

/**
 * One profile per phone: a new submission replaces the old details. The profile keeps its id,
 * its creation date and its visibility (a profile hidden by an admin stays hidden).
 * The form no longer asks for a specialisation, so an existing one is kept.
 * Returns true if a profile was replaced.
 */
export const upsert = internalMutation({
  args: { profile: v.any() },
  handler: async (ctx, { profile }: { profile: ProfileInput }) => {
    const now = Date.now();
    const [current, ...duplicates] = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", profile.phone))
      .collect();
    for (const old of duplicates) await ctx.db.delete(old._id);
    if (!current) {
      await ctx.db.insert("profiles", { ...profile, status: "published", createdAt: now, updatedAt: now });
      return false;
    }
    await ctx.db.replace(current._id, {
      ...profile,
      specialisation: profile.specialisation ?? current.specialisation,
      status: current.status,
      createdAt: current.createdAt,
      updatedAt: now,
    });
    return true;
  },
});

export const deleteByPhone = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const rows = await ctx.db.query("profiles").withIndex("by_phone", (q) => q.eq("phone", phone)).collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length > 0;
  },
});

/** Public search used by /search. Only returns published profiles and only the public fields. */
export const search = query({
  args: {
    state: v.string(),
    city: v.optional(v.string()),
    pincode: v.optional(v.string()),
    trade: v.optional(v.string()), // older links: exact trade
    job: v.optional(v.string()), // older links: exact job
    profession: v.optional(v.string()), // the "Trade / Job Profile" box
    related: v.optional(v.boolean()), // also return related jobs (used when nothing matches directly)
  },
  handler: async (ctx, args) => {
    const state = lower(clean(args.state, 100));
    if (!state) return [];
    const city = lower(clean(args.city, 100));
    const pincode = clean(args.pincode, 6);
    const trade = lower(clean(args.trade, 100));
    const job = lower(clean(args.job, 120));
    const profession = clean(args.profession, 120);
    const related = args.related === true;

    let q;
    if (pincode) {
      if (!PIN_RE.test(pincode)) return [];
      q = ctx.db.query("profiles").withIndex("by_state_pincode", (i) => i.eq("search.state", state).eq("pincode", pincode));
    } else if (city) {
      q = ctx.db.query("profiles").withIndex("by_state_city", (i) => i.eq("search.state", state).eq("search.city", city));
    } else {
      q = ctx.db.query("profiles").withIndex("by_state_city", (i) => i.eq("search.state", state));
    }

    const results = [];
    let scanned = 0;
    for await (const p of q.order("desc")) {
      if (++scanned > MAX_SCANNED) break;
      if (p.status !== "published") continue;
      if (trade && p.search.trade !== trade) continue;
      if (job && p.search.job !== job) continue;
      if (profession && !matchesProfession(p, profession, related)) continue;
      results.push({
        id: p._id,
        name: p.name,
        state: p.state,
        city: p.city,
        pincode: p.pincode,
        trade: p.trade,
        jobProfile: p.jobProfile,
        experience: p.experience,
        expectedSalary: p.expectedSalary,
        specialisation: p.specialisation,
        email: p.email,
        phone: p.phone,
      });
      if (results.length >= MAX_RESULTS) break;
    }
    return results;
  },
});
