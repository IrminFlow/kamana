import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { EMAIL_RE, MSG, assertServer, clean, fail, normalizeIndianMobile } from "./lib";
import { canonicalProfession, normalizeProfession, isStitchingQuery, stitchingJobs } from "../lib/professions";
import { verifyPhone } from "./otp";

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
  profession: v.optional(v.string()),
  job_profile: v.string(),
  job_other: v.optional(v.string()),
  experience: v.optional(v.string()), // Legacy salary field.
  work_experience: v.optional(v.string()),
  expected_salary: v.optional(v.string()),
  description: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.string(),
});

type ProfileInput = Omit<Doc<"profiles">, "_id" | "_creationTime" | "createdAt" | "updatedAt" | "status">;

const lower = (s: string | undefined) => (s ?? "").toLocaleLowerCase("en-IN");

/** Turns form fields into a clean profile, or returns a user-facing error. */
function parseApplication(f: typeof applicationFields.type): { ok: true; profile: ProfileInput } | { ok: false; message: string } {
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
  const jobProfile = canonicalProfession(clean(f.profession, 120) ||
    (f.job_profile === OTHER_JOB ? clean(f.job_other, 120) : clean(f.job_profile, 120)));
  if (!jobProfile) return fail("Please choose your job profile.");

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

/** One profile per phone: a new submission replaces the old one. Returns true if it replaced. */
export const upsert = internalMutation({
  args: { profile: v.any() },
  handler: async (ctx, { profile }: { profile: ProfileInput }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", profile.phone))
      .collect();
    const [current, ...duplicates] = existing;
    for (const old of duplicates) await ctx.db.delete(old._id);
    const fields = {
      ...profile,
      status: current?.status ?? "published" as const,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    if (current) await ctx.db.replace(current._id, fields);
    else await ctx.db.insert("profiles", fields);
    return Boolean(current);
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
    trade: v.optional(v.string()),
    job: v.optional(v.string()),
    profession: v.optional(v.string()),
    related: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const state = lower(clean(args.state, 100));
    if (!state) return [];
    const city = lower(clean(args.city, 100));
    const pincode = (args.pincode ?? "").trim();
    const profession = normalizeProfession(canonicalProfession(clean(args.profession, 120)));
    const relatedWords = new Set(profession.split(/[^\p{L}\p{M}\p{N}]+/u).filter(word => word.length >= 3));
    const stitching = isStitchingQuery(profession);
    const trade = lower(clean(args.trade, 100));
    const job = lower(clean(args.job, 120));

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
      if (profession) {
        const title = normalizeProfession(canonicalProfession(p.jobProfile));
        const category = normalizeProfession(p.trade ?? "");
        const direct = title.includes(profession) || category.includes(profession);
        const related = args.related && (
          (stitching && stitchingJobs.some(role => title === normalizeProfession(role))) ||
          [title, category, p.specialisation ?? ""].join(" ").toLocaleLowerCase("en-IN")
            .split(/[^\p{L}\p{M}\p{N}]+/u).some(word => relatedWords.has(word))
        );
        if (!direct && !related) continue;
      }
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
