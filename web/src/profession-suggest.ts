/**
 * Suggestions for the "Trade / Job Profile" box on the Apply and Find Employees forms.
 * People can pick a suggestion or keep whatever they typed.
 *
 * Markup: an input with [data-profession-search] and aria-controls pointing at an empty
 * listbox element placed next to it.
 */
import {
  STITCHING_JOBS,
  canonicalProfession,
  isStitchingQuery,
  normalizeProfession as normalize,
  startsAWord,
} from "../../lib/professions";

type Item = { value: string; type: string; aliases: string[] };

const MAX_SHOWN = 8;
// The Engineering group lists degree courses, and these two are courses too, not jobs.
const SKIPPED_TRADES = new Set(["Engineering"]);
const SKIPPED_TITLES = new Set(["information technology", "multimedia, animation & special effects"]);

function buildCatalog(tradeJobs: Record<string, string[]>): Item[] {
  const jobs = new Map<string, Item>();
  for (const [trade, titles] of Object.entries(tradeJobs)) {
    if (SKIPPED_TRADES.has(trade)) continue;
    for (const raw of titles ?? []) {
      const title = raw.trim();
      if (!title || normalize(title).startsWith("other") || SKIPPED_TITLES.has(normalize(title))) continue;
      const value = canonicalProfession(title);
      const key = normalize(value);
      const item = jobs.get(key) ?? { value, type: "Job Profile", aliases: [] };
      if (normalize(title) !== key && !item.aliases.includes(title)) item.aliases.push(title);
      jobs.set(key, item);
    }
  }
  if (!jobs.has("sampling master (tailor)")) {
    jobs.set("sampling master (tailor)", { value: "Sampling Master (Tailor)", type: "Job Profile", aliases: [] });
  }
  const trades = Object.keys(tradeJobs)
    .filter((t) => !normalize(t).startsWith("other"))
    .map((value) => ({ value, type: "Trade", aliases: [] }));
  return [...jobs.values(), ...trades];
}

/** Best matches first: title starts with the text, then a word in the title, then other names, then anywhere. */
function rank(item: Item, query: string): { score: number; alias?: string } | null {
  const value = normalize(item.value);
  if (value.startsWith(query)) return { score: 0 };
  if (startsAWord(value, query)) return { score: 1 };
  const alias = item.aliases.find((a) => startsAWord(a, query));
  if (alias) return { score: 2, alias };
  if (value.includes(query)) return { score: 3 };
  const inside = item.aliases.find((a) => normalize(a).includes(query));
  return inside ? { score: 3, alias: inside } : null;
}

function suggestions(catalog: Item[], typed: string) {
  const query = normalize(typed);
  if (!query) return [];
  const direct = catalog
    .map((item) => ({ item, match: rank(item, query) }))
    .filter((r): r is { item: Item; match: { score: number; alias?: string } } => r.match !== null)
    .sort((a, b) => a.match.score - b.match.score || a.item.value.length - b.item.value.length)
    .map(({ item, match }) => ({ value: item.value, type: item.type, alias: match.alias }));
  const related = isStitchingQuery(query) ? STITCHING_JOBS.map((value) => ({ value, type: "Related job", alias: undefined })) : [];
  const seen = new Set<string>();
  return [...direct, ...related]
    .filter((s) => {
      const key = normalize(s.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SHOWN);
}

function attach(input: HTMLInputElement, catalog: Item[]) {
  const list = document.getElementById(input.getAttribute("aria-controls") ?? "");
  const form = input.form;
  if (!list || !form) return;
  input.setAttribute("role", "combobox");
  let shown: ReturnType<typeof suggestions> = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    shown = [];
    active = -1;
  };
  const choose = (index: number) => {
    input.value = shown[index].value;
    close();
    input.focus();
  };
  const setActive = (index: number) => {
    active = index;
    list.querySelectorAll<HTMLElement>("[role=option]").forEach((option, i) => {
      option.setAttribute("aria-selected", i === active ? "true" : "false");
      if (i === active) {
        input.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      }
    });
  };
  const render = () => {
    shown = suggestions(catalog, input.value);
    if (!shown.length) return close();
    list.replaceChildren(
      ...shown.map((s, i) => {
        const option = document.createElement("div");
        option.id = `${list.id}-${i}`;
        option.className = "profession-suggestion";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        const name = document.createElement("span");
        name.textContent = s.value;
        if (s.alias) {
          const aka = document.createElement("small");
          aka.className = "aka";
          aka.textContent = s.alias;
          name.append(aka);
        }
        const kind = document.createElement("small");
        kind.textContent = s.type;
        option.append(name, kind);
        // Keep focus in the input so the list does not close before the click lands.
        option.addEventListener("mousedown", (e) => e.preventDefault());
        option.addEventListener("click", () => choose(i));
        return option;
      }),
    );
    active = -1;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    if (list.hidden) {
      if (e.key === "ArrowDown" && input.value) render();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(active + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(active - 1, 0));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      close();
    }
  });
  input.addEventListener("blur", close);
  form.addEventListener("submit", close);
}

export function setupProfessionSuggestions() {
  const inputs = document.querySelectorAll<HTMLInputElement>("[data-profession-search]");
  if (!inputs.length) return;
  fetch("/static/data/trades_jobs.json")
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, string[]>>) : {}))
    .catch(() => ({}))
    .then((data) => {
      const catalog = buildCatalog(data);
      inputs.forEach((input) => attach(input, catalog));
    });
}
