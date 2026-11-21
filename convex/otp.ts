import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { MSG, assertServer, fail, hashKey, normalizeIndianMobile, rateLimiter, type LimitName } from "./lib";
import { devMode, verifiedPhone } from "./firebase";

/**
 * Checks every limit first and only consumes them if all pass, so a request blocked by
 * one limit doesn't use up the others. Returns the name of the first limit hit.
 */
export async function consumeLimits(
  ctx: ActionCtx,
  limits: { name: LimitName; key?: string }[],
): Promise<LimitName | null> {
  for (const { name, key } of limits) {
    const { ok } = await rateLimiter.check(ctx, name, { key });
    if (!ok) return name;
  }
  for (const { name, key } of limits) {
    await rateLimiter.limit(ctx, name, { key });
  }
  return null;
}

/** Rate-limits and checks the Firebase ID token for a phone. Shared by profile submit and delete. */
export async function verifyPhone(ctx: ActionCtx, phone: string, ip: string, idToken: string) {
  const blocked = await consumeLimits(ctx, [
    { name: "verifyPhone", key: await hashKey("phone", phone) },
    { name: "verifyIp", key: await hashKey("ip", ip) },
  ]);
  if (blocked) return fail(MSG.tooManyAttempts);
  return verifiedPhone(idToken.trim(), phone);
}

/**
 * Called by /api/send-otp before the browser asks Firebase to send the SMS. Applies our rate
 * limits and tells the browser whether this number already has a profile. Firebase adds its
 * own reCAPTCHA, quotas and SMS region policy on top.
 */
export const send = action({
  args: {
    secret: v.string(),
    ip: v.string(),
    phone: v.string(),
    purpose: v.union(v.literal("profile"), v.literal("delete")),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; message: string; phone?: string; dev?: boolean; warning?: string }> => {
    assertServer(args.secret);
    const phone = normalizeIndianMobile(args.phone);
    if (!phone) return fail(MSG.invalidPhone);

    const existing: boolean = await ctx.runQuery(internal.profiles.existsByPhone, { phone });
    // Don't spend an SMS on deleting a profile that isn't there.
    if (args.purpose === "delete" && !existing) return fail(MSG.noProfile);

    const phoneKey = await hashKey("phone", phone);
    const blocked = await consumeLimits(ctx, [
      { name: "otpPhoneMinute", key: phoneKey },
      { name: "otpPhoneHour", key: phoneKey },
      { name: "otpIpHour", key: await hashKey("ip", args.ip) },
      { name: "otpGlobalHour" },
    ]);
    if (blocked === "otpPhoneMinute") return fail(MSG.waitMinute);
    if (blocked) return fail(MSG.tooManyCodes);

    return {
      ok: true,
      message: MSG.sent,
      phone,
      dev: devMode(),
      ...(args.purpose === "profile" && existing ? { warning: MSG.profileExists } : {}),
    };
  },
});
