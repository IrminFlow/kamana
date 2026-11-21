import { createRemoteJWKSet, jwtVerify } from "jose";
import { MSG } from "./lib";

/**
 * Verifies a Firebase Authentication ID token (from phone sign-in) against Google's public
 * keys and returns the verified phone number. No service account needed, only the project ID.
 *
 * Dev mode: if OTP_DEV_MODE=true on a deployment, the token "dev:000000" is accepted for the
 * phone the form submitted. Never set it on production.
 */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
const MAX_SIGN_IN_AGE_SECONDS = 15 * 60;

export const devMode = () => process.env.OTP_DEV_MODE === "true";

export async function verifiedPhone(
  idToken: string,
  expectedPhone: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (devMode() && idToken === "dev:000000") return { ok: true };
  if (devMode() && idToken.startsWith("dev:")) return { ok: false, message: MSG.badCode };

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    const authTime = typeof payload.auth_time === "number" ? payload.auth_time : 0;
    if (!payload.sub || Date.now() / 1000 - authTime > MAX_SIGN_IN_AGE_SECONDS) {
      return { ok: false, message: MSG.requestFirst };
    }
    if (payload.phone_number !== expectedPhone) return { ok: false, message: MSG.requestFirst };
    return { ok: true };
  } catch (err) {
    console.warn("Firebase token rejected", (err as Error).message);
    return { ok: false, message: MSG.verifyFailed };
  }
}
