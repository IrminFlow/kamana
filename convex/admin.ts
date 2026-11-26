import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { EMAIL_RE, MSG, clean, normalizeIndianMobile } from "./lib";
import { CATEGORIES, STATUS_LABELS, newTicket, resend } from "./grievances";

/**
 * Admin dashboard (/admin). The browser signs in with Google through Firebase and sends the
 * ID token; Convex verifies it (auth.config.ts). Access is limited to the comma-separated
 * emails in the ADMIN_EMAILS environment variable.
 */
async function requireAdmin(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in.");
  // Convex maps standard claims for OIDC providers; for customJwt they may arrive raw.
  const rawEmail = identity.email ?? identity["email"];
  const email = typeof rawEmail === "string" ? rawEmail.toLowerCase() : "";
  const verified = identity.emailVerified === true || identity["email_verified"] === true;
  if (!email || !verified) {
    console.warn("Admin sign-in without verified email; claims:", Object.keys(identity).join(","));
    throw new ConvexError("Sign in with a verified Google account.");
  }
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(email)) throw new ConvexError("This account does not have admin access.");
  return email;
}

const SCAN = 2000;
const PAGE = 100;

function matches(text: string, q: string) {
  return text.toLowerCase().includes(q);
}

export const me = query({
  args: {},
  handler: async (ctx) => ({ email: await requireAdmin(ctx) }),
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const profiles = await ctx.db.query("profiles").take(10000);
    const grievances = await ctx.db.query("grievances").take(10000);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return {
      profiles: profiles.length,
      published: profiles.filter((p) => p.status === "published").length,
      hidden: profiles.filter((p) => p.status === "hidden").length,
      newThisWeek: profiles.filter((p) => p.createdAt > weekAgo).length,
      complaints: grievances.length,
      open: grievances.filter((g) => g.status === "received" || g.status === "in_review").length,
    };
  },
});

export const profiles = query({
  args: {
    status: v.union(v.literal("all"), v.literal("published"), v.literal("hidden")),
    q: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const q = clean(args.q, 100).toLowerCase();
    const rows = await ctx.db.query("profiles").order("desc").take(SCAN);
    const out: Doc<"profiles">[] = [];
    for (const p of rows) {
      if (args.status !== "all" && p.status !== args.status) continue;
      if (q) {
        const hay = [p.name, p.phone, p.email, p.state, p.city, p.pincode, p.trade, p.jobProfile].join(" ");
        if (!matches(hay, q)) continue;
      }
      out.push(p);
      if (out.length >= PAGE) break;
    }
    return out;
  },
});

export const setProfileStatus = mutation({
  args: { id: v.id("profiles"), status: v.union(v.literal("published"), v.literal("hidden")) },
  handler: async (ctx, { id, status }) => {
    await requireAdmin(ctx);
    if (!(await ctx.db.get(id))) throw new ConvexError("Profile not found.");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

export const deleteProfile = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    if (await ctx.db.get(id)) await ctx.db.delete(id);
  },
});

const grievanceStatus = v.union(
  v.literal("received"),
  v.literal("in_review"),
  v.literal("resolved"),
  v.literal("rejected"),
);

export const grievances = query({
  args: { status: v.union(v.literal("all"), v.literal("open"), grievanceStatus), q: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const q = clean(args.q, 100).toLowerCase();
    const rows = await ctx.db.query("grievances").order("desc").take(SCAN);
    const out: Doc<"grievances">[] = [];
    for (const g of rows) {
      if (args.status === "open" && g.status !== "received" && g.status !== "in_review") continue;
      if (args.status !== "all" && args.status !== "open" && g.status !== args.status) continue;
      if (q && !matches([g.ticket, g.name, g.email, g.phone, g.category, g.details].join(" "), q)) continue;
      out.push(g);
      if (out.length >= PAGE) break;
    }
    return out;
  },
});

export const updateGrievance = mutation({
  args: { id: v.id("grievances"), status: grievanceStatus, resolutionNote: v.string(), notify: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const g = await ctx.db.get(args.id);
    if (!g) throw new ConvexError("Complaint not found.");
    const note = clean(args.resolutionNote, 2000, true);
    await ctx.db.patch(args.id, { status: args.status, resolutionNote: note || undefined, updatedAt: Date.now() });

    const changed = g.status !== args.status || (g.resolutionNote ?? "") !== note;
    if (args.notify && changed && process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
      const site = process.env.SITE_URL ?? "https://kamana.in";
      await resend.sendEmail(ctx, {
        from: process.env.MAIL_FROM,
        to: g.email,
        subject: `Update on your complaint (${g.ticket}): ${STATUS_LABELS[args.status]}`,
        text:
          `Hello ${g.name},\n\n` +
          `The status of your complaint ${g.ticket} is now: ${STATUS_LABELS[args.status]}.\n` +
          (note ? `\n${note}\n` : "") +
          `\nTrack it here: ${site}/grievance/track?ticket=${g.ticket}\n\n` +
          `Kamana Grievance Officer\ninfo@kamana.in\n`,
      });
    }
  },
});

// ---------------------------------------------------------------------------------------------
// Create / edit / delete everything.

const lower = (s: string | undefined) => (s ?? "").toLocaleLowerCase("en-IN");
const opt = (s: string) => s || undefined;

export const profileFields = v.object({
  name: v.string(),
  phone: v.string(),
  email: v.string(),
  state: v.string(),
  locationMode: v.union(v.literal("city"), v.literal("pincode")),
  city: v.string(),
  pincode: v.string(),
  trade: v.string(),
  jobProfile: v.string(),
  experience: v.optional(v.string()),
  expectedSalary: v.string(),
  specialisation: v.string(),
  status: v.union(v.literal("published"), v.literal("hidden")),
});

/** Creates a profile (no id) or updates one. Keeps the one-profile-per-phone rule. Returns the id. */
export const saveProfile = mutation({
  args: { id: v.optional(v.id("profiles")), fields: profileFields },
  handler: async (ctx, { id, fields: f }) => {
    await requireAdmin(ctx);
    const name = clean(f.name, 100);
    const phone = normalizeIndianMobile(f.phone);
    const email = clean(f.email, 254).toLowerCase();
    const state = clean(f.state, 100);
    const city = clean(f.city, 100);
    const pincode = clean(f.pincode, 6);
    const trade = clean(f.trade, 100);
    const jobProfile = clean(f.jobProfile, 120);
    if (!name) throw new ConvexError("Name is required.");
    if (!phone) throw new ConvexError(MSG.invalidPhone);
    if (email && !EMAIL_RE.test(email)) throw new ConvexError("Enter a valid email address.");
    if (!state) throw new ConvexError("State is required.");
    if (f.locationMode === "city" && !city) throw new ConvexError("City is required.");
    if (f.locationMode === "pincode" && !/^[1-9]\d{5}$/.test(pincode)) throw new ConvexError("Enter a valid 6-digit PIN code.");
    if (!jobProfile) throw new ConvexError("Job profile is required.");

    const clash = await ctx.db.query("profiles").withIndex("by_phone", (q) => q.eq("phone", phone)).first();
    if (clash && clash._id !== id) throw new ConvexError(`Another profile (${clash.name}) already uses ${phone}.`);

    const keepCity = f.locationMode === "city" ? city : "";
    const doc = {
      name,
      phone,
      email: opt(email),
      state,
      locationMode: f.locationMode,
      city: opt(keepCity),
      pincode: f.locationMode === "pincode" ? pincode : undefined,
      trade: opt(trade),
      jobProfile,
      experience: opt(clean(f.experience ?? "", 80)),
      expectedSalary: opt(clean(f.expectedSalary, 80)),
      specialisation: opt(clean(f.specialisation, 1200, true)),
      status: f.status,
      search: { state: lower(state), city: lower(keepCity), trade: lower(trade), job: lower(jobProfile) },
      updatedAt: Date.now(),
    };
    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing) throw new ConvexError("Profile not found.");
      await ctx.db.replace(id, { ...doc, createdAt: existing.createdAt });
      return id;
    }
    return await ctx.db.insert("profiles", { ...doc, createdAt: Date.now() });
  },
});

export const grievanceFields = v.object({
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  category: v.string(),
  profileUrl: v.string(),
  details: v.string(),
  status: grievanceStatus,
  resolutionNote: v.string(),
});

/** Creates a complaint (no id; a new reference number is issued) or updates every field of one. */
export const saveGrievance = mutation({
  args: { id: v.optional(v.id("grievances")), fields: grievanceFields },
  handler: async (ctx, { id, fields: f }) => {
    await requireAdmin(ctx);
    const name = clean(f.name, 100);
    const email = clean(f.email, 254).toLowerCase();
    const category = clean(f.category, 60);
    const details = clean(f.details, 4000, true);
    const profileUrl = clean(f.profileUrl, 500);
    const rawPhone = clean(f.phone, 40);
    if (!name) throw new ConvexError("Name is required.");
    if (!EMAIL_RE.test(email)) throw new ConvexError("Enter a valid email address.");
    if (!CATEGORIES.includes(category)) throw new ConvexError("Choose a complaint type.");
    if (!details) throw new ConvexError("Details are required.");
    if (profileUrl && !/^https?:\/\//i.test(profileUrl)) throw new ConvexError("Links must start with https://");
    const doc = {
      name,
      email,
      phone: rawPhone ? (normalizeIndianMobile(rawPhone) ?? rawPhone) : undefined,
      category,
      profileUrl: opt(profileUrl),
      details,
      status: f.status,
      resolutionNote: opt(clean(f.resolutionNote, 2000, true)),
      updatedAt: Date.now(),
    };
    if (id) {
      const g = await ctx.db.get(id);
      if (!g) throw new ConvexError("Complaint not found.");
      await ctx.db.replace(id, { ...doc, ticket: g.ticket, createdAt: g.createdAt });
      return { id, ticket: g.ticket };
    }
    let ticket = newTicket();
    while (await ctx.db.query("grievances").withIndex("by_ticket", (q) => q.eq("ticket", ticket)).first()) {
      ticket = newTicket();
    }
    const newId = await ctx.db.insert("grievances", { ...doc, ticket, createdAt: Date.now() });
    return { id: newId, ticket };
  },
});

export const deleteGrievance = mutation({
  args: { id: v.id("grievances") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    if (await ctx.db.get(id)) await ctx.db.delete(id);
  },
});

export const categories = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return CATEGORIES;
  },
});
