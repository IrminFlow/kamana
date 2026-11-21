import { convexQuery, escapeHtml } from "../http";

type Ticket = {
  ticket: string;
  category: string;
  status: "received" | "in_review" | "resolved" | "rejected";
  statusLabel: string;
  resolutionNote?: string;
  createdAt: number;
} | null;

const params = new URLSearchParams(location.search);
const ticket = (params.get("ticket") || "").trim();
const out = document.querySelector<HTMLElement>("[data-track-result]")!;
document.querySelector<HTMLInputElement>('.track-form [name="ticket"]')!.value = ticket;

const NOT_FOUND =
  '<p>We could not find that reference. Check it and try again, or email <a href="mailto:info@kamana.in">info@kamana.in</a>.</p>';
const STATUS_CLASS = { received: "", in_review: "", resolved: " approved", rejected: " rejected" };

async function render() {
  if (!ticket) return;
  let t: Ticket;
  try {
    t = await convexQuery<Ticket>("grievances:track", { ticket });
  } catch {
    out.innerHTML = '<p>We could not check the status right now. Please try again shortly.</p>';
    return;
  }
  if (!t) {
    out.innerHTML = NOT_FOUND;
    return;
  }
  const date = new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  out.innerHTML =
    (params.get("new") === "1"
      ? `<p class="notice" style="max-width:790px;margin:0 auto 18px">Your complaint has been received. Keep this reference number to check its status: <strong>${escapeHtml(t.ticket)}</strong></p>`
      : "") +
    `<section class="policy-card"><h2>${escapeHtml(t.ticket)}</h2>` +
    `<p><span class="status${STATUS_CLASS[t.status]}">${escapeHtml(t.statusLabel)}</span></p>` +
    `<p>${escapeHtml(t.category)} · Submitted ${escapeHtml(date)}</p>` +
    (t.resolutionNote ? `<p>${escapeHtml(t.resolutionNote)}</p>` : "") +
    `</section>`;
}

render();
