import { bilingual } from "./messages";
import { postJson, type ApiResult } from "./http";
import type { ConfirmationResult } from "firebase/auth";

/**
 * Wires a form with a "Send OTP" button and an OTP input, like the original site:
 * Send OTP → message under the field → Submit verifies the code and saves.
 *
 * 1. /api/send-otp applies our rate limits and warns if the number already has a profile.
 * 2. Firebase sends the SMS (in dev mode the server skips Firebase; use 000000).
 * 3. On submit Firebase confirms the code and gives us an ID token, which the server verifies.
 */
export function setupOtpForm(
  form: HTMLFormElement,
  purpose: "profile" | "delete",
  submit: (idToken: string) => Promise<ApiResult>,
  onSuccess: (result: ApiResult) => void,
) {
  const phone = form.querySelector<HTMLInputElement>('[name="phone"]')!;
  const code = form.querySelector<HTMLInputElement>("[data-otp-code]")!;
  const message = form.querySelector<HTMLElement>("[data-otp-message]")!;
  const send = form.querySelector<HTMLButtonElement>("[data-send-otp]")!;
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  let confirmation: ConfirmationResult | undefined;
  let devMode = false;
  let sentTo = "";
  let verifiedToken: string | undefined; // reused if the save fails for a non-OTP reason

  const show = (result: ApiResult) => {
    message.textContent = bilingual(result.message || "Please try again.");
    if (typeof result.warning === "string") {
      const warning = document.createElement("strong");
      warning.style.display = "block";
      warning.style.marginTop = "6px";
      warning.style.color = "#8e5447";
      warning.textContent = `⚠ ${bilingual(result.warning)}`;
      message.appendChild(warning);
    }
    message.dataset.state = result.ok ? "ok" : "error";
  };
  const wait = () => {
    message.textContent = bilingual("Please wait…");
    message.dataset.state = "";
  };

  send.addEventListener("click", async () => {
    if (!phone.reportValidity()) return;
    send.disabled = true;
    wait();
    const result = await postJson("/api/send-otp", { phone: phone.value, purpose });
    if (result.ok && typeof result.phone === "string") {
      devMode = result.dev === true;
      sentTo = phone.value;
      verifiedToken = undefined;
      if (!devMode) {
        try {
          const firebase = await import("./firebase");
          confirmation = await firebase.sendSms(result.phone);
        } catch (err) {
          const { firebaseMessage } = await import("./firebase");
          show({ ok: false, message: firebaseMessage(err) });
          send.disabled = false;
          return;
        }
      }
    }
    show(result);
    send.disabled = false;
  });

  /** Turns the typed code into an ID token, or an error message. */
  async function token(): Promise<{ ok: true; idToken: string } | { ok: false; message: string }> {
    const typed = code.value.trim();
    if (phone.value !== sentTo || (!devMode && !confirmation)) {
      return { ok: false, message: "Request a code for this number, then enter it here." };
    }
    if (devMode) return { ok: true, idToken: `dev:${typed}` };
    if (verifiedToken) return { ok: true, idToken: verifiedToken };
    try {
      const { confirmCode } = await import("./firebase");
      verifiedToken = await confirmCode(confirmation!, typed);
      return { ok: true, idToken: verifiedToken };
    } catch (err) {
      const { firebaseMessage } = await import("./firebase");
      return { ok: false, message: firebaseMessage(err) };
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.otpSubmitting === "true") return;
    form.dataset.otpSubmitting = "true";
    if (submitButton) submitButton.disabled = true;
    wait();
    const t = await token();
    const result = t.ok ? await submit(t.idToken) : t;
    if (result.ok) return onSuccess(result);
    // The server rejected the sign-in itself: start over with a fresh code.
    if (t.ok && (result.message === "Request a code for this number, then enter it here." ||
        result.message === "Verification could not be completed. Please try again.")) {
      verifiedToken = undefined;
      confirmation = undefined;
    }
    show(result);
    delete form.dataset.otpSubmitting;
    if (submitButton) submitButton.disabled = false;
    code.focus();
  });

  [phone, code].forEach((input) =>
    input.addEventListener("input", () => {
      message.textContent = "";
      message.dataset.state = "";
    }),
  );
}
