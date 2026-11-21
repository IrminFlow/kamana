/**
 * Shared helpers for the Vercel functions in /api. They are thin proxies: they add the
 * client IP (for rate limits) and the server secret, then call a Convex action over HTTP.
 */

const MAX_BODY = 16 * 1024;

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Vercel sets x-real-ip to the connecting client; fall back to the first forwarded hop. */
function clientIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Blocks cross-site form posts (CSRF): the browser always sends Origin on fetch POSTs. */
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") || request.headers.get("host"));
  } catch {
    return false;
  }
}

/** Keeps only string fields from a JSON body. */
function strings(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) if (typeof v === "string") out[k] = v;
  }
  return out;
}

async function callAction(path: string, args: Record<string, unknown>) {
  const url = process.env.CONVEX_URL;
  const secret = process.env.SERVER_SECRET;
  if (!url || !secret) throw new Error("CONVEX_URL / SERVER_SECRET not configured");
  const res = await fetch(`${url}/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args: { ...args, secret }, format: "json" }),
  });
  const data = (await res.json()) as { status: string; value?: unknown; errorMessage?: string };
  if (data.status !== "success") throw new Error(data.errorMessage || `Convex ${path} failed`);
  return data.value;
}

/**
 * Builds a POST handler. `toArgs` maps the request body to the action's args, minus
 * `secret` and `ip`, which are added here.
 */
export function proxy(path: string, toArgs: (body: Record<string, string>) => Record<string, unknown>) {
  return async function POST(request: Request) {
    if (!sameOrigin(request)) return json({ ok: false, message: "Please try again." }, 403);
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ ok: false, message: "Please try again." }, 413);
    let body: Record<string, string>;
    try {
      body = strings(JSON.parse(text));
    } catch {
      return json({ ok: false, message: "Please try again." }, 400);
    }
    try {
      const result = (await callAction(path, { ...toArgs(body), ip: clientIp(request) })) as { ok: boolean };
      return json(result, result.ok ? 200 : 422);
    } catch (err) {
      console.error(path, err);
      return json({ ok: false, message: "Please try again." }, 500);
    }
  };
}

/** Picks the listed keys, dropping missing ones (Convex optional args reject undefined-as-null). */
export function pick(body: Record<string, string>, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) if (k in body) out[k] = body[k];
  return out;
}
