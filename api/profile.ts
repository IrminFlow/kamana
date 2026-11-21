import { pick, proxy } from "../lib/server.js";

const FIELDS = ["name", "state", "state_other", "city", "city_other", "pincode", "trade", "trade_other",
  "job_profile", "job_other", "experience", "description", "email", "phone"];

export const POST = proxy("profiles:submit", (b) => ({
  idToken: b.idToken ?? "",
  fields: { name: "", state: "", city: "", job_profile: "", phone: "", ...pick(b, FIELDS) },
}));
