import { formFields, postJson } from "../http";

const form = document.querySelector<HTMLFormElement>(".grievance-form")!;
const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const message = document.createElement("p");
message.className = "otp-message";
message.setAttribute("aria-live", "polite");
button.before(message);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  message.textContent = "Please wait…";
  const result = await postJson("/api/grievance", formFields(form));
  if (result.ok && typeof result.ticket === "string") {
    location.href = `/grievance/track?ticket=${encodeURIComponent(result.ticket)}&new=1`;
    return;
  }
  message.textContent = result.message || "Please try again.";
  button.disabled = false;
});
