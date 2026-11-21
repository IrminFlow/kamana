import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * English messages shown to users. The browser adds the Hindi translation, so keep
 * these strings in sync with `web/src/messages.ts`.
 */
export const MSG = {
  sent: "A verification code has been sent by SMS.",
  verified: "Mobile number verified.",
  waitMinute: "Please wait a minute before requesting another code.",
  tooManyCodes: "Too many code requests. Please try again later.",
  requestFirst: "Request a code for this number, then enter it here.",
  badCode: "That code was not accepted. Check it and try again.",
  retry: "Please try again.",
  providerFailed: "The SMS provider could not complete this request. Please try again.",
  providerUnreachable: "We could not reach the SMS service. Please try again shortly.",
  verifyFailed: "Verification could not be completed. Please try again.",
  invalidPhone: "Enter a valid 10-digit Indian mobile number.",
  profileExists: "A profile already exists for this mobile number. Submitting will replace it.",
  noProfile: "No profile was found for this mobile number.",
  deleted: "Your profile has been deleted.",
  tooManyAttempts: "Too many attempts. Please try again later.",
} as const;

export type Result<T extends object = object> =
  | ({ ok: true; message?: string } & T)
  | { ok: false; message: string };

export const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Write functions are only callable by our Vercel API routes, which hold this secret. */
export function assertServer(secret: string) {
  const expected = process.env.SERVER_SECRET;
  if (!expected || expected.length < 32) throw new Error("SERVER_SECRET is not configured");
  if (secret.length !== expected.length) throw new Error("Forbidden");
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) throw new Error("Forbidden");
}

/** One-way keyed hash so rate-limit tables never hold raw phone numbers or IPs. */
export async function hashKey(kind: string, value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.SERVER_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${kind}:${value}`));
  return [...new Uint8Array(sig).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Accepts common Indian formats and returns E.164 (+91XXXXXXXXXX), or null. */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** Trims, strips control characters and collapses whitespace. */
export function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== "string") return "";
  let s = value.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = multiline
    ? s.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
    : s.replace(/\s+/g, " ");
  return s.trim().slice(0, max);
}

export const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/;

const LIMITS = {
  // Sending OTPs costs money, so it gets the tightest limits.
  otpPhoneMinute: { kind: "token bucket", rate: 1, period: MINUTE, capacity: 1 },
  otpPhoneHour: { kind: "fixed window", rate: 5, period: HOUR },
  otpIpHour: { kind: "fixed window", rate: 10, period: HOUR },
  otpGlobalHour: { kind: "fixed window", rate: 300, period: HOUR, shards: 4 },
  // Guessing codes.
  verifyPhone: { kind: "token bucket", rate: 5, period: 10 * MINUTE, capacity: 5 },
  verifyIp: { kind: "fixed window", rate: 30, period: HOUR },
  // Complaints.
  grievanceIp: { kind: "fixed window", rate: 3, period: HOUR },
  grievanceEmail: { kind: "fixed window", rate: 3, period: HOUR },
  grievanceGlobal: { kind: "fixed window", rate: 100, period: HOUR },
} as const;

export type LimitName = keyof typeof LIMITS;
export const rateLimiter = new RateLimiter(components.rateLimiter, LIMITS);
