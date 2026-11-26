import "../polyfills";
import { escapeHtml } from "../http";
import { onUser, signIn, signOutAdmin, token } from "../admin-auth";

type Profile = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  state: string;
  locationMode: "city" | "pincode";
  city?: string;
  pincode?: string;
  trade?: string;
  jobProfile: string;
  experience?: string;
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
let profileRows: Profile[] = [];
let grievanceRows: Grievance[] = [];
let categories: string[] = [];
type StateRow = { name: string; districts: { name: string }[] };
let states: StateRow[] = [];
let trades: Record<string, string[]> = {};

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
    row("Experience", p.experience) +
    row("Salary", p.expectedSalary) +
    row("About", p.specialisation) +
    `</dl></div><div class="review-actions">` +
    `<span class="status${p.status === "published" ? " approved" : " rejected"}">${p.status}</span>` +
    (p.status === "published"
      ? `<button class="reject" data-act="hide">Hide</button>`
      : `<button class="approve" data-act="publish">Publish</button>`) +
    `<button class="reject" data-act="edit">Edit</button>` +
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
    `<button class="approve" data-act="save">Save</button>` +
    `<button class="reject" data-act="edit">Edit all fields</button>` +
    `<button class="reject" data-act="delete-g">Delete</button></div></article>`
  );
}

// ----- Create / edit forms -------------------------------------------------------------------

async function loadLookups() {
  if (!states.length) {
    const [st, tr] = await Promise.all([
      fetch("/static/data/india_states_districts.json").then((r) => r.json()).catch(() => []),
      fetch("/static/data/trades_jobs.json").then((r) => r.json()).catch(() => ({})),
    ]);
    states = st as StateRow[];
    trades = tr as Record<string, string[]>;
  }
  if (!categories.length) categories = await convex<string[]>("query", "admin:categories", {});
}

const opts = (values: string[]) =>
  [...new Set(values)].filter((x) => x && !/^Other/.test(x)).map((x) => `<option value="${escapeHtml(x)}"></option>`).join("");

function field(label: string, name: string, value = "", attrs = "", wide = false) {
  return `<label${wide ? ' class="wide"' : ""}>${label}<input name="${name}" value="${escapeHtml(value)}" ${attrs}></label>`;
}
function area(label: string, name: string, value = "") {
  return `<label class="wide">${label}<textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
}
function select(label: string, name: string, value: string, choices: [string, string][]) {
  return (
    `<label>${label}<select name="${name}">` +
    choices.map(([v, l]) => `<option value="${escapeHtml(v)}"${v === value ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") +
    `</select></label>`
  );
}

function districtsFor(state: string) {
  return states.find((s) => s.name.toLowerCase() === state.trim().toLowerCase())?.districts.map((d) => d.name) ?? [];
}

function profileForm(p?: Profile) {
  const jobs = p?.trade && trades[p.trade] ? trades[p.trade] : Object.values(trades).flat();
  return (
    `<form class="form-card admin-edit" data-form="profile"${p ? ` data-id="${escapeHtml(p._id)}"` : ""}>` +
    `<h3>${p ? "Edit profile" : "New profile"}</h3><div class="form-grid">` +
    field("Full name", "name", p?.name, "required maxlength=100") +
    field("Mobile number", "phone", p?.phone, 'required inputmode="tel" placeholder="10-digit mobile"') +
    field("Email", "email", p?.email, 'type="email"') +
    select("Status", "status", p?.status ?? "published", [["published", "Published"], ["hidden", "Hidden"]]) +
    field("State", "state", p?.state, 'required list="dl-states" autocomplete="off"') +
    select("Location by", "locationMode", p?.locationMode ?? "city", [["city", "City / district"], ["pincode", "PIN code"]]) +
    field("City / district", "city", p?.city, 'list="dl-cities" autocomplete="off"') +
    field("PIN code", "pincode", p?.pincode, 'inputmode="numeric" maxlength=6') +
    field("Trade", "trade", p?.trade, 'list="dl-trades" autocomplete="off"') +
    field("Job profile", "jobProfile", p?.jobProfile, 'required list="dl-jobs" autocomplete="off"') +
    field("Experience", "experience", p?.experience, "maxlength=80") +
    field("Expected salary", "expectedSalary", p?.expectedSalary, "maxlength=80") +
    area("Specialisation / about", "specialisation", p?.specialisation) +
    `</div>` +
    `<datalist id="dl-states">${opts(states.map((s) => s.name))}</datalist>` +
    `<datalist id="dl-cities">${opts(districtsFor(p?.state ?? ""))}</datalist>` +
    `<datalist id="dl-trades">${opts(Object.keys(trades))}</datalist>` +
    `<datalist id="dl-jobs">${opts(jobs)}</datalist>` +
    `<div class="edit-actions"><button class="button" type="submit">${p ? "Save changes" : "Create profile"}</button>` +
    `<button class="reject" type="button" data-act="cancel">Cancel</button></div></form>`
  );
}

function grievanceForm(g?: Grievance) {
  const cats = categories.map((c) => [c, c] as [string, string]);
  return (
    `<form class="form-card admin-edit" data-form="grievance"${g ? ` data-id="${escapeHtml(g._id)}"` : ""}>` +
    `<h3>${g ? `Edit complaint ${escapeHtml(g.ticket)}` : "New complaint"}</h3><div class="form-grid">` +
    field("Name", "name", g?.name, "required maxlength=100") +
    field("Email", "email", g?.email, 'type="email" required') +
    field("Phone", "phone", g?.phone) +
    select("Complaint type", "category", g?.category ?? categories[0] ?? "", cats) +
    select("Status", "status", g?.status ?? "received", Object.entries(G_LABEL) as [string, string][]) +
    field("Profile link", "profileUrl", g?.profileUrl, 'type="url" placeholder="https://"') +
    area("Details", "details", g?.details) +
    area("Resolution note (shown on the tracking page)", "resolutionNote", g?.resolutionNote) +
    `</div><div class="edit-actions"><button class="button" type="submit">${g ? "Save changes" : "Create complaint"}</button>` +
    `<button class="reject" type="button" data-act="cancel">Cancel</button></div></form>`
  );
}

async function openForm(kind: "profile" | "grievance", id: string | null, replace?: HTMLElement) {
  showError(errorBox, "");
  try {
    await loadLookups();
  } catch (err) {
    showError(errorBox, (err as Error).message);
    return;
  }
  const html =
    kind === "profile"
      ? profileForm(id ? profileRows.find((p) => p._id === id) : undefined)
      : grievanceForm(id ? grievanceRows.find((g) => g._id === id) : undefined);
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  const form = wrap.firstElementChild as HTMLFormElement;
  if (replace) replace.replaceWith(form);
  else list.prepend(form);
  form.querySelector<HTMLInputElement>("input")?.focus();
}

list.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  const form = input.closest<HTMLFormElement>('form[data-form="profile"]');
  if (!form) return;
  if (input.name === "state") form.querySelector("#dl-cities")!.innerHTML = opts(districtsFor(input.value));
  if (input.name === "trade") {
    const jobs = trades[input.value] ?? Object.values(trades).flat();
    form.querySelector("#dl-jobs")!.innerHTML = opts(jobs);
  }
});

list.addEventListener("submit", async (event) => {
  const form = event.target as HTMLFormElement;
  if (!form.dataset.form) return;
  event.preventDefault();
  const fields: Record<string, string> = {};
  new FormData(form).forEach((v, k) => (fields[k] = String(v)));
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  button.disabled = true;
  showError(errorBox, "");
  try {
    const id = form.dataset.id;
    await convex("mutation", form.dataset.form === "profile" ? "admin:saveProfile" : "admin:saveGrievance", {
      ...(id ? { id } : {}),
      fields,
    });
    await refresh();
  } catch (err) {
    button.disabled = false;
    showError(errorBox, (err as Error).message);
    errorBox.scrollIntoView({ block: "center" });
  }
});

$("[data-new]").addEventListener("click", () => openForm(tab === "profiles" ? "profile" : "grievance", null));

async function loadList() {
  showError(errorBox, "");
  list.innerHTML = '<p class="privacy-note">Loading…</p>';
  try {
    if (tab === "profiles") {
      const rows = await convex<Profile[]>("query", "admin:profiles", { status: pStatus.value, q: qInput.value });
      profileRows = rows;
      list.innerHTML = rows.length ? rows.map(profileCard).join("") : '<div class="empty"><h3>No profiles</h3></div>';
    } else {
      const rows = await convex<Grievance[]>("query", "admin:grievances", { status: gStatus.value, q: qInput.value });
      grievanceRows = rows;
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
  const act = button.dataset.act;
  if (act === "cancel") return loadList();
  const card = button.closest<HTMLElement>("[data-id]")!;
  const id = card.dataset.id!;
  if (act === "edit") return openForm(tab === "profiles" ? "profile" : "grievance", id, card);
  try {
    if (act === "hide" || act === "publish") {
      await convex("mutation", "admin:setProfileStatus", { id, status: act === "hide" ? "hidden" : "published" });
    } else if (act === "delete") {
      if (!confirm("Delete this profile permanently?")) return;
      await convex("mutation", "admin:deleteProfile", { id });
    } else if (act === "delete-g") {
      if (!confirm("Delete this complaint permanently?")) return;
      await convex("mutation", "admin:deleteGrievance", { id });
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
    $("[data-new]").textContent = tab === "profiles" ? "+ New profile" : "+ New complaint";
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
