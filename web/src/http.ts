export type ApiResult = { ok: boolean; message?: string; [key: string]: unknown };

/** POST to one of our /api functions. Never throws. */
export async function postJson(path: string, body: Record<string, string>): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ApiResult;
    return { ...data, ok: res.ok && !!data.ok };
  } catch {
    return { ok: false, message: "Could not connect. Please try again." };
  }
}

/** Calls a public Convex query over its HTTP API (no client library needed). */
export async function convexQuery<T>(path: string, args: Record<string, string>): Promise<T> {
  const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  const data = (await res.json()) as { status: string; value: T; errorMessage?: string };
  if (data.status !== "success") throw new Error(data.errorMessage || "Query failed");
  return data.value;
}

/** Form fields as a plain object of strings. */
export function formFields(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}

export function escapeHtml(s: string | undefined | null) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
