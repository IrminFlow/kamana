import { proxy } from "../lib/server.js";

export const POST = proxy("profiles:remove", (b) => ({ phone: b.phone ?? "", idToken: b.idToken ?? "" }));
