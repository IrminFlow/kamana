import "../polyfills";
import "../options.js";
import { formFields, postJson } from "../http";
import { setupOtpForm } from "../otp";

const form = document.querySelector<HTMLFormElement>(".job-application-form")!;

setupOtpForm(
  form,
  "profile",
  (idToken) => postJson("/api/profile", { ...formFields(form), idToken }),
  (result) => {
    location.href = result.replaced ? "/post/success?replaced=1" : "/post/success";
  },
);
