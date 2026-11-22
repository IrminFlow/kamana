import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { clean } from "./lib";
import { STATUS_LABELS, resend } from "./grievances";

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
