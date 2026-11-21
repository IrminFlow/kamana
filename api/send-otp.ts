import { proxy } from "../lib/server.js";

export const POST = proxy("otp:send", (b) => ({
  phone: b.phone ?? "",
  purpose: b.purpose === "delete" ? "delete" : "profile",
}));
