/**
 * Firebase phone sign-in. Loaded lazily (dynamic import) the first time someone taps
 * "Send OTP", so normal page loads stay small. Sessions live in memory only.
 */
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  inMemoryPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

let auth: Auth | undefined;
let verifier: RecaptchaVerifier | undefined;

function getAuthOnce() {
  if (!auth) {
    const app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    auth = initializeAuth(app, { persistence: inMemoryPersistence });
  }
  return auth;
}

/** Sends the SMS. `phone` must be E.164 (+91…). */
export async function sendSms(phone: string): Promise<ConfirmationResult> {
  const a = getAuthOnce();
  verifier?.clear();
  let holder = document.getElementById("recaptcha-holder");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "recaptcha-holder";
    document.body.appendChild(holder);
  }
  holder.replaceChildren();
  const container = document.createElement("div");
  holder.appendChild(container);
  verifier = new RecaptchaVerifier(a, container, { size: "invisible" });
  return signInWithPhoneNumber(a, phone, verifier);
}

/** Confirms the code and returns a short-lived ID token the server verifies. */
export async function confirmCode(confirmation: ConfirmationResult, code: string): Promise<string> {
  const { user } = await confirmation.confirm(code);
  const token = await user.getIdToken();
  await signOut(getAuthOnce());
  return token;
}

/** Maps Firebase error codes to our user-facing messages (see convex/lib.ts MSG). */
export function firebaseMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code":
      return "That code was not accepted. Check it and try again.";
    case "auth/code-expired":
    case "auth/session-expired":
      return "Request a code for this number, then enter it here.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "Too many code requests. Please try again later.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Enter a valid 10-digit Indian mobile number.";
    case "auth/network-request-failed":
      return "We could not reach the SMS service. Please try again shortly.";
    default:
      console.warn("Firebase auth error", code || err);
      return "The SMS provider could not complete this request. Please try again.";
  }
}
