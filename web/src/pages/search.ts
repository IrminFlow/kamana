import "../polyfills";
import "../options.js";
import { convexQuery, escapeHtml } from "../http";

type Profile = {
  id: string;
  name: string;
  state: string;
  city?: string;
  pincode?: string;
  trade?: string;
  jobProfile: string;
  experience?: string;
  expectedSalary?: string;
  specialisation?: string;
  email?: string;
  phone: string;
};

const p = new URLSearchParams(location.search);
const get = (k: string) => (p.get(k) || "").trim();
const main = document.querySelector("main")!;

/** Resolve the "Other / PIN code" dropdown choices the same way the form submits them. */
const state = get("state") === "__OTHER_STATE__" ? get("state_other") : get("state");
const byPin = get("location_mode") === "pincode" || get("city") === "__PIN__";
const pincode = byPin ? get("pincode") : "";
const city = byPin ? "" : get("city") === "__OTHER__" ? get("city_other") : get("city");
const trade = get("trade") === "__OTHER_TRADE__" ? get("trade_other") : get("trade");
const profession = get("q");
const job = get("job") === "__OTHER__" ? get("job_other") : get("job");

function card(r: Profile) {
  const role = r.trade && r.trade.toLowerCase() !== r.jobProfile.toLowerCase()
    ? `${r.trade} · ${r.jobProfile}` : r.jobProfile;
  const where = r.city ? `${r.city}, ${r.state}` : `PIN ${r.pincode}, ${r.state}`;
  const digits = r.phone.replace(/\D/g, "");
  return (
    `<article class="profile"><div class="profile-top"><span class="initial">${escapeHtml(r.name.charAt(0).toUpperCase())}</span>` +
    (r.experience ? `<span class="tag">${escapeHtml(r.experience)}</span>` : "") +
    `</div><h3>${escapeHtml(r.name)}</h3><div class="role">${escapeHtml(role)}</div>` +
    `<div class="location">⌖ ${escapeHtml(where)}</div>` +
    (r.expectedSalary ? `<p>Expected salary: ${escapeHtml(r.expectedSalary)}</p>` : "") +
    (r.specialisation ? `<p>${escapeHtml(r.specialisation)}</p>` : "") +
    `<div class="contact">` +
    (r.email ? `<a href="mailto:${escapeHtml(r.email)}">Email: ${escapeHtml(r.email)}</a>` : "") +
    `<div class="mobile-contact"><a href="tel:${escapeHtml(r.phone)}">Mobile: ${escapeHtml(r.phone)}</a>` +
    `<a class="message-button" href="https://wa.me/${digits}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>` +
    `</div></article>`
  );
}

async function render() {
  if (!state) return;
  const pill = [state, profession || trade, job, city || (pincode && `PIN ${pincode}`)].filter(Boolean).join(" · ");
  let related = false;
  const head = (count: number) =>
    `<section class="results-head"><div><div class="eyebrow">MATCHING PROFILES</div>` +
    (related ? `<h2>Closest matches for “${escapeHtml(profession)}”</h2></div>`
      : `<h2>${count} professional${count === 1 ? "" : "s"} found</h2></div>`) +
    `<span class="filter-pill">${escapeHtml(pill)}</span></section>`;

  let results: Profile[];
  try {
    const filters = { state, city, pincode, trade, job, profession };
    results = await convexQuery<Profile[]>("profiles:search", filters);
    if (profession && results.length === 0) {
      results = await convexQuery<Profile[]>("profiles:search", { ...filters, related: true });
      related = results.length > 0;
    }
  } catch {
    main.insertAdjacentHTML(
      "beforeend",
      `<div class="empty"><span>⌕</span><h3>Could not load profiles</h3><p>Please check your connection and try again.</p></div>`,
    );
    return;
  }
  main.insertAdjacentHTML(
    "beforeend",
    head(results.length) +
      (results.length
        ? `<section class="result-grid">${results.map(card).join("")}</section>`
        : `<div class="empty"><span>⌕</span><h3>No matches yet</h3><p>Try another city or job profile, or check back as the community grows.</p></div>`),
  );
}

render();
