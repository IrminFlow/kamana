import "../polyfills";
import { escapeHtml } from "../http";
import { onUser, signIn, signOutAdmin, token } from "../admin-auth";

type Profile = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  state: string;
  city?: string;
  pincode?: string;
  trade?: string;
  jobProfile: string;
  expectedSalary?: string;
  specialisation?: string;
  status: "published" | "hidden";
  createdAt: number;
  updatedAt: number;
};
type Grievance = {
  _id: string;
  ticket: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  profileUrl?: string;
  details: string;
  status: "received" | "in_review" | "resolved" | "rejected";
  resolutionNote?: string;
  createdAt: number;
};

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const signinView = $("[data-signin]");
const dashView = $("[data-dashboard]");
const signinError = $("[data-signin-error]");
const errorBox = $("[data-error]");
const list = $("[data-list]");
const filters = $<HTMLFormElement>("[data-filters]");
const qInput = filters.querySelector<HTMLInputElement>('[name="q"]')!;
const pStatus = $<HTMLSelectElement>("[data-status-profiles]");
const gStatus = $<HTMLSelectElement>("[data-status-grievances]");
let tab: "profiles" | "grievances" = "profiles";

async function convex<T>(kind: "query" | "mutation", path: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  const data = (await res.json()) as { status: string; value: T; errorMessage?: string; errorData?: unknown };
  if (data.status !== "success") {
    throw new Error(typeof data.errorData === "string" ? data.errorData : "Something went wrong. Please try again.");
  }
  return data.value;
}

function showError(el: HTMLElement, msg: string) {
  el.textContent = msg;
  el.hidden = !msg;
}

const date = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function row(label: string, value?: string, html = false) {
  if (!value) return "";
  return `<dt>${label}</dt><dd>${html ? value : escapeHtml(value)}</dd>`;
}

async function loadStats() {
  const s = await convex<Record<string, number>>("query", "admin:stats", {});
  const tiles: [string, number][] = [
    ["Profiles", s.profiles],
    ["Published", s.published],
    ["Hidden", s.hidden],
    ["New this week", s.newThisWeek],
    ["Open complaints", s.open],
    ["All complaints", s.complaints],
  ];
  $("[data-stats]").innerHTML = tiles.map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
}

function profileCard(p: Profile) {
  const place = [p.city || (p.pincode ? `PIN ${p.pincode}` : ""), p.state].filter(Boolean).join(", ");
  const digits = p.phone.replace(/\D/g, "");
  return (
    `<article class="admin-card" data-id="${escapeHtml(p._id)}"><div class="admin-main">` +
    `<h3>${escapeHtml(p.name)} <small>${escapeHtml(date(p.createdAt))}</small></h3>` +
    `<div class="role">${escapeHtml([p.trade, p.jobProfile].filter(Boolean).join(" · "))}</div>` +
    `<dl>` +
    row("Mobile", `<a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a> · <a href="https://wa.me/${digits}" target="_blank" rel="noopener">WhatsApp</a>`, true) +
    row("Email", p.email) +
    row("Location", place) +
    row("Salary", p.expectedSalary) +
    row("About", p.specialisation) +
    `</dl></div><div class="review-actions">` +
    `<span class="status${p.status === "published" ? " approved" : " rejected"}">${p.status}</span>` +
    (p.status === "published"
      ? `<button class="reject" data-act="hide">Hide</button>`
      : `<button class="approve" data-act="publish">Publish</button>`) +
    `<button class="reject" data-act="delete">Delete</button>` +
    `</div></article>`
  );
}

const G_LABEL = { received: "Received", in_review: "In review", resolved: "Resolved", rejected: "Closed" };
const G_CLASS = { received: "", in_review: "", resolved: " approved", rejected: " rejected" };

function grievanceCard(g: Grievance) {
  const options = (Object.keys(G_LABEL) as (keyof typeof G_LABEL)[])
    .map((k) => `<option value="${k}"${k === g.status ? " selected" : ""}>${G_LABEL[k]}</option>`)
    .join("");
  return (
    `<article class="admin-card" data-id="${escapeHtml(g._id)}"><div class="admin-main">` +
    `<h3>${escapeHtml(g.ticket)} <small>${escapeHtml(date(g.createdAt))}</small></h3>` +
    `<div class="role">${escapeHtml(g.category)}</div>` +
    `<dl>` +
    row("Name", g.name) +
    row("Email", `<a href="mailto:${escapeHtml(g.email)}?subject=${encodeURIComponent(`Your complaint ${g.ticket}`)}">${escapeHtml(g.email)}</a>`, true) +
    row("Phone", g.phone) +
    row("Link", g.profileUrl ? `<a href="${escapeHtml(g.profileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(g.profileUrl)}</a>` : "", true) +
    `</dl><p class="details">${escapeHtml(g.details)}</p></div>` +
    `<div class="review-actions"><span class="status${G_CLASS[g.status]}">${G_LABEL[g.status]}</span>` +
    `<select name="status" aria-label="Status">${options}</select>` +
    `<textarea name="note" placeholder="Note shown on the tracking page" aria-label="Resolution note">${escapeHtml(g.resolutionNote)}</textarea>` +
    `<label><input type="checkbox" name="notify" checked> Email the complainant</label>` +
    `<button class="approve" data-act="save">Save</button></div></article>`
  );
}

async function loadList() {
  showError(errorBox, "");
  list.innerHTML = '<p class="privacy-note">Loading…</p>';
  try {
    if (tab === "profiles") {
      const rows = await convex<Profile[]>("query", "admin:profiles", { status: pStatus.value, q: qInput.value });
      list.innerHTML = rows.length ? rows.map(profileCard).join("") : '<div class="empty"><h3>No profiles</h3></div>';
    } else {
      const rows = await convex<Grievance[]>("query", "admin:grievances", { status: gStatus.value, q: qInput.value });
      list.innerHTML = rows.length ? rows.map(grievanceCard).join("") : '<div class="empty"><h3>No complaints</h3></div>';
    }
  } catch (err) {
    list.innerHTML = "";
    showError(errorBox, (err as Error).message);
  }
}

async function refresh() {
  await Promise.all([loadStats().catch(() => {}), loadList()]);
}

list.addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-act]");
  if (!button) return;
  const card = button.closest<HTMLElement>("[data-id]")!;
  const id = card.dataset.id!;
  const act = button.dataset.act;
  try {
    if (act === "hide" || act === "publish") {
      await convex("mutation", "admin:setProfileStatus", { id, status: act === "hide" ? "hidden" : "published" });
    } else if (act === "delete") {
      if (!confirm("Delete this profile permanently?")) return;
      await convex("mutation", "admin:deleteProfile", { id });
    } else if (act === "save") {
      button.disabled = true;
      await convex("mutation", "admin:updateGrievance", {
        id,
        status: card.querySelector<HTMLSelectElement>('[name="status"]')!.value,
        resolutionNote: card.querySelector<HTMLTextAreaElement>('[name="note"]')!.value,
        notify: card.querySelector<HTMLInputElement>('[name="notify"]')!.checked,
      });
    }
    await refresh();
  } catch (err) {
    button.disabled = false;
    showError(errorBox, (err as Error).message);
  }
});

document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) =>
  b.addEventListener("click", () => {
    tab = b.dataset.tab as typeof tab;
    document.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    pStatus.hidden = tab !== "profiles";
    gStatus.hidden = tab !== "grievances";
    qInput.placeholder = tab === "profiles" ? "Search name, phone, city, job…" : "Search reference, name, email…";
    qInput.value = "";
    loadList();
  }),
);
filters.addEventListener("submit", (e) => {
  e.preventDefault();
  loadList();
});
pStatus.addEventListener("change", loadList);
gStatus.addEventListener("change", loadList);

$("[data-google]").addEventListener("click", async () => {
  showError(signinError, "");
  try {
    await signIn();
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
      showError(signinError, "Sign-in failed. Please try again.");
    }
  }
});
$("[data-signout]").addEventListener("click", () => signOutAdmin());

onUser(async (user) => {
  if (!user) {
    signinView.hidden = false;
    dashView.hidden = true;
    return;
  }
  try {
    const { email } = await convex<{ email: string }>("query", "admin:me", {});
    $("[data-who]").textContent = email;
    signinView.hidden = true;
    dashView.hidden = false;
    refresh();
  } catch (err) {
    await signOutAdmin();
    showError(signinError, (err as Error).message);
  }
});
