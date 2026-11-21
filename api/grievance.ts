import { pick, proxy } from "../lib/server.js";

export const POST = proxy("grievances:submit", (b) => ({
  fields: {
    name: "", email: "", category: "", details: "",
    ...pick(b, ["name", "email", "phone", "category", "profile_url", "details", "website"]),
  },
}));
