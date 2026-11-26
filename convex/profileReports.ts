import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { resend } from "./grievances";

/**
 * Daily email listing the profiles added the previous day (India time). Sent by crons.ts at
 * 12:10 a.m. IST, also on days with no new profiles. Large days are split into parts of 100.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+5:30
const PAGE = 100;

/** The India-time day that starts at `start` (a UTC timestamp of 00:00 IST). */
function indiaDay(start: number) {
  return { start, end: start + DAY_MS, date: new Date(start + IST_OFFSET_MS).toISOString().slice(0, 10) };
}

/** The India-time calendar day before the one containing `now`. */
export function previousIndiaDay(now: number) {
  const todayStart = Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return indiaDay(todayStart - DAY_MS);
}

export function reportLine(p: Doc<"profiles">) {
  const place = p.city || (p.pincode && `PIN ${p.pincode}`);
  return [p.name, p.jobProfile, p.trade, place, p.state, p.experience, p.expectedSalary, p.email, p.phone]
    .filter(Boolean)
    .join(" | ");
}

export const send = internalMutation({
  args: { start: v.optional(v.number()), cursor: v.optional(v.string()), part: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const from = process.env.MAIL_FROM;
    if (!from || !process.env.RESEND_API_KEY) {
      console.warn("Daily profile report skipped: MAIL_FROM and RESEND_API_KEY are required.");
      return;
    }
    const day = args.start === undefined ? previousIndiaDay(Date.now()) : indiaDay(args.start);
    const part = args.part ?? 1;

    const { page, isDone, continueCursor } = await ctx.db
      .query("profiles")
      .withIndex("by_created_at", (q) => q.gte("createdAt", day.start).lt("createdAt", day.end))
      .paginate({ cursor: args.cursor ?? null, numItems: PAGE });

    const site = process.env.SITE_URL ?? "https://kamana.in";
    const partLabel = part > 1 || !isDone ? ` · Part ${part}` : "";
    const first = (part - 1) * PAGE;
    const lines = page.length
      ? page.map((p, i) => `${first + i + 1}. ${reportLine(p)}`)
      : ["No new profiles were added."];

    await resend.sendEmail(ctx, {
      from,
      to: process.env.REPORT_INBOX || "info@kamana.in",
      subject: `Kamana daily profile report · ${day.date}${partLabel}`,
      text: [
        `Profiles added on ${day.date} (India time)${partLabel}`,
        "",
        ...lines,
        "",
        `Manage profiles: ${site}/admin`,
      ].join("\n"),
    });

    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.profileReports.send, {
        start: day.start,
        cursor: continueCursor,
        part: part + 1,
      });
    }
  },
});
