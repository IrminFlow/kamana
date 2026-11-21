import { v } from "convex/values";
import { Resend } from "@convex-dev/resend";
import { action, internalMutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { EMAIL_RE, MSG, assertServer, clean, fail, hashKey, normalizeIndianMobile } from "./lib";
import { consumeLimits } from "./otp";

export const CATEGORIES = [
  "Privacy or data request",
  "Profile correction or removal",
  "Fraud or misleading profile",
  "Harassment or safety concern",
  "Illegal or harmful content",
  "Other",
];

export const STATUS_LABELS = {
  received: "Received",
  in_review: "In review",
  resolved: "Resolved",
  rejected: "Closed",
} as const;

const resend = new Resend(components.resend, { testMode: process.env.RESEND_TEST_MODE === "true" });

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
function newTicket() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "KAM-" + [...bytes].map((b) => TICKET_ALPHABET[b % TICKET_ALPHABET.length]).join("");
}

/** Called by /api/grievance. */
export const submit = action({
  args: {
    secret: v.string(),
    ip: v.string(),
    fields: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      category: v.string(),
      profile_url: v.optional(v.string()),
      details: v.string(),
      website: v.optional(v.string()), // honeypot
    }),
  },
  handler: async (ctx, { secret, ip, fields: f }): Promise<{ ok: boolean; message: string; ticket?: string }> => {
    assertServer(secret);
    // Bots fill the hidden field. Pretend it worked and store nothing.
    if (clean(f.website, 200)) return { ok: true, message: "", ticket: newTicket() };

    const name = clean(f.name, 100);
    const email = clean(f.email, 254).toLowerCase();
    const category = clean(f.category, 60);
    const details = clean(f.details, 4000, true);
    const profileUrl = clean(f.profile_url, 500) || undefined;
    const rawPhone = clean(f.phone, 40);
    if (!name) return fail("Please enter your name.");
    if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address.");
    if (!CATEGORIES.includes(category)) return fail("Please choose a complaint type.");
    if (!details) return fail("Please tell us what happened.");
    if (profileUrl && !/^https?:\/\//i.test(profileUrl)) return fail("Please enter a full link starting with https://");
    const phone = rawPhone ? (normalizeIndianMobile(rawPhone) ?? rawPhone) : undefined;

    const blocked = await consumeLimits(ctx, [
      { name: "grievanceIp", key: await hashKey("ip", ip) },
      { name: "grievanceEmail", key: await hashKey("email", email) },
      { name: "grievanceGlobal" },
    ]);
    if (blocked) return fail(MSG.tooManyAttempts);

    const ticket: string = await ctx.runMutation(internal.grievances.create, {
      name,
      email,
      phone,
      category,
      profileUrl,
      details,
    });
    return { ok: true, message: "", ticket };
  },
});

export const create = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    category: v.string(),
    profileUrl: v.optional(v.string()),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    let ticket = newTicket();
    while (await ctx.db.query("grievances").withIndex("by_ticket", (q) => q.eq("ticket", ticket)).first()) {
      ticket = newTicket();
    }
    const now = Date.now();
    await ctx.db.insert("grievances", { ...args, ticket, status: "received", createdAt: now, updatedAt: now });

    if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
      const site = process.env.SITE_URL ?? "https://kamana.in";
      await resend.sendEmail(ctx, {
        from: process.env.MAIL_FROM,
        to: args.email,
        subject: `We received your complaint (${ticket})`,
        text:
          `Hello ${args.name},\n\n` +
          `We have received your complaint "${args.category}". Your reference number is ${ticket}.\n` +
          `We acknowledge complaints within 48 hours and aim to resolve them within one month.\n\n` +
          `Track its status: ${site}/grievance/track?ticket=${ticket}\n\n` +
          `Kamana Grievance Officer\ninfo@kamana.in\n`,
      });
      const inbox = process.env.GRIEVANCE_INBOX;
      if (inbox) {
        await resend.sendEmail(ctx, {
          from: process.env.MAIL_FROM,
          to: inbox,
          replyTo: [args.email],
          subject: `[Kamana complaint] ${ticket}: ${args.category}`,
          text:
            `Reference: ${ticket}\nName: ${args.name}\nEmail: ${args.email}\nPhone: ${args.phone ?? "-"}\n` +
            `Type: ${args.category}\nLink: ${args.profileUrl ?? "-"}\n\n${args.details}\n`,
        });
      }
    }
    return ticket;
  },
});

/** Public status lookup for /grievance/track. Returns no personal details. */
export const track = query({
  args: { ticket: v.string() },
  handler: async (ctx, args) => {
    const ticket = clean(args.ticket, 20).toUpperCase();
    if (!/^KAM-[A-Z0-9]{12}$/.test(ticket)) return null;
    const g = await ctx.db.query("grievances").withIndex("by_ticket", (q) => q.eq("ticket", ticket)).first();
    if (!g) return null;
    return {
      ticket: g.ticket,
      category: g.category,
      status: g.status,
      statusLabel: STATUS_LABELS[g.status],
      resolutionNote: g.resolutionNote,
      createdAt: g.createdAt,
    };
  },
});
