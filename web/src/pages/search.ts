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
const job = get("job") === "__OTHER__" ? get("job_other") : get("job");

function card(r: Profile) {
  const role = [r.trade, r.jobProfile].filter(Boolean).join(" · ");
  const where = r.city ? `${r.city}, ${r.state}` : `PIN ${r.pincode}, ${r.state}`;
  const digits = r.phone.replace(/\D/g, "");
  return (
    `<article class="profile"><div class="profile-top"><span class="initial">${escapeHtml(r.name.charAt(0).toUpperCase())}</span>` +
    (r.expectedSalary ? `<span class="tag">${escapeHtml(r.expectedSalary)}</span>` : "") +
    `</div><h3>${escapeHtml(r.name)}</h3><div class="role">${escapeHtml(role)}</div>` +
    `<div class="location">⌖ ${escapeHtml(where)}</div>` +
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
  const pill = [state, trade, job, city || (pincode && `PIN ${pincode}`)].filter(Boolean).join(" · ");
  const head = (count: number) =>
    `<section class="results-head"><div><div class="eyebrow">MATCHING PROFILES</div>` +
    `<h2>${count} professional${count === 1 ? "" : "s"} found</h2></div>` +
    `<span class="filter-pill">${escapeHtml(pill)}</span></section>`;

  let results: Profile[];
  try {
    results = await convexQuery<Profile[]>("profiles:search", { state, city, pincode, trade, job });
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
