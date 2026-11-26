import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { resend } from "./grievances";

const dayMs = 24 * 60 * 60 * 1000;
const indiaOffsetMs = 330 * 60 * 1000;

export const send = internalMutation({
  args: { start: v.optional(v.number()), cursor: v.optional(v.string()), part: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const from = process.env.MAIL_FROM;
    if (!from || !process.env.RESEND_API_KEY) {
      console.warn("Kamana profile report requires MAIL_FROM and RESEND_API_KEY.");
      return;
    }

    const midnight = Math.floor((Date.now() + indiaOffsetMs) / dayMs) * dayMs - indiaOffsetMs;
    const start = args.start ?? midnight - dayMs;
    const part = args.part ?? 1;
    const date = new Date(start + indiaOffsetMs).toISOString().slice(0, 10);
    const { page, isDone, continueCursor } = await ctx.db.query("profiles")
      .withIndex("by_created_at", q => q.gte("createdAt", start).lt("createdAt", start + dayMs))
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });

    const entries = page.map(p => [
      p.name,
      p.jobProfile,
      p.trade,
      p.city || p.pincode,
      p.state,
      p.experience,
      p.expectedSalary,
      p.email,
      p.phone,
    ].filter(Boolean).join(" | "));

    await resend.sendEmail(ctx, {
      from,
      to: "info@kamana.in",
      subject: `Kamana daily profile report · ${date}${part > 1 || !isDone ? ` · Part ${part}` : ""}`,
      text: [`Profiles added on ${date} (India time)`, "",
        ...(entries.length ? entries : ["No new profiles were added."])].join("\n"),
    });
    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.profileReports.send, {
        start, cursor: continueCursor, part: part + 1,
      });
    }
  },
});
