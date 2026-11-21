import { postJson } from "../http";
import { setupOtpForm } from "../otp";

const form = document.querySelector<HTMLFormElement>(".delete-form")!;
const phone = form.querySelector<HTMLInputElement>('[name="phone"]')!;

setupOtpForm(
  form,
  "delete",
  (idToken) => postJson("/api/delete-profile", { phone: phone.value, idToken }),
  () => {
    form.hidden = true;
    document.querySelector<HTMLElement>("[data-deleted]")!.hidden = false;
  },
);
