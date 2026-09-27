import { PACKS, STATS } from "./data/puzzles.js";
import { VARIANTS, COLLECTIONS, collectionOf } from "../core/variants/index.js";
import { RULE_TEXT, TIER_NAMES as ROAD_TIERS } from "../core/road/human.js";
import * as roadArt from "../core/render/board.js";
import * as cableArt from "../core/render/cable.js";
import * as forestArt from "../core/render/forest.js";
import * as roadPlay from "./play.js";
import * as tracksPlay from "./play-tracks.js";
import * as hidePlay from "./play-hide.js";
import { NOTES, METRIC_INFO, TECHNIQUE_NAMES } from "./notes.js";

const LEVELS = [["gentle", "Gentle"], ["medium", "Medium"], ["hard", "Hard"]];

// Each puzzle family has its own art and its own interactive board.
const FAMILY = {
  road: { art: roadArt, play: roadPlay, howto: "Drag between squares to build road; drag over it again to remove it. Tap a gap, or right-click it, to mark it with an ×.", solvedLine: "The bridge is open." },
  tracks: { art: cableArt, play: tracksPlay, howto: "Drag between squares to lay track; drag over it again to lift it. Tap a gap, or right-click it, to mark it with an ×. Rails take a line's colour once they reach its turntable.", solvedLine: "All aboard: the cable cars are running." },
  hide: { art: forestArt, play: hidePlay, howto: "Tap a hiker to turn them clockwise (right-click turns them back). Tap an open square to hide the Sasquatch there. Squares nobody can see are in shadow.", solvedLine: "Nobody saw a thing." },
};
const VARIANT_HINTS = {
  spans: {
    span: "Over water the road can't turn, so this span carries straight on to land.",
    nospan: "A span this way would hit the edge or a rock before reaching land, so it isn't built.",
  },
  lanes: {
    span: "The road may only cross a lane straight over, so it carries on across.",
    nospan: "The road can't cross the lane at this point, so it doesn't come this way.",
  },
};
const tierNames = (v) => v.tierNames || ROAD_TIERS;
const ruleHint = (v, rule) => v.ruleHints?.[rule] || VARIANT_HINTS[v.id]?.[rule] || RULE_TEXT[rule]
  || (rule === "spot" ? "Every hiker is facing the right way: the one square left in shadow is where the Sasquatch hides." : "");

const store = {
  get(k, d) { try { const v = localStorage.getItem("gg:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("gg:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "notes") return { page: "notes", variant: VARIANTS[parts[1]] ? parts[1] : null };
  if (parts[0] === "c" && COLLECTIONS.some((c) => c.id === parts[1])) return { page: "collection", collection: parts[1] };
  const variant = VARIANTS[parts[0]] ? parts[0] : null;
  if (!variant) return { page: "home" };
  const level = LEVELS.some(([l]) => l === parts[1]) ? parts[1] : "gentle";
  const list = PACKS[variant]?.[level] || [];
  const idx = Math.min(Math.max(1, +(parts[2] || 1)), Math.max(1, list.length)) - 1;
  return { page: "play", variant, level, idx };
}

let board = null, timer = null;

function render() {
  clearInterval(timer);
  board = null;
  const r = route();
  const col = r.variant ? collectionOf(r.variant).id : r.collection || "";
  document.body.dataset.collection = col;
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.c === (col || r.page)));
  brand(col);
  const main = $("#main");
  if (r.page === "home") main.innerHTML = home();
  else if (r.page === "collection") main.innerHTML = collectionPage(COLLECTIONS.find((c) => c.id === r.collection));
  else if (r.page === "notes") main.innerHTML = notesPage();
  else play(main, r);
  if (r.page === "notes" && r.variant) $("#n-" + r.variant)?.scrollIntoView();
  else window.scrollTo?.(0, 0);
}

// ------------------------------------------------------------------ branding per collection
const EMBLEMS = {
  "": `<g fill="none" stroke-width="3"><rect x="6" y="10" width="28" height="28" rx="3" stroke="currentColor"/><path d="M6 24H34M20 10V38" stroke="currentColor" stroke-width="1.5"/><path d="M13 31V17H27" stroke="var(--orange)" stroke-width="4" stroke-linecap="round"/></g><circle cx="58" cy="24" r="4" fill="var(--orange)"/><circle cx="76" cy="24" r="4" fill="currentColor" opacity=".6"/><circle cx="94" cy="24" r="4" fill="currentColor" opacity=".35"/>`,
  goldengate: `<path d="M2 34H118" stroke="currentColor" stroke-width="3"/><path d="M30 44V6M90 44V6" stroke="var(--orange)" stroke-width="5" stroke-linecap="square"/><path d="M26 12H34M26 22H34M86 12H94M86 22H94" stroke="var(--orange)" stroke-width="2"/><path d="M2 30Q16 28 30 8Q60 40 90 8Q104 28 118 30" fill="none" stroke="var(--orange)" stroke-width="2"/><path d="M40 18V34M50 24V34M60 26V34M70 24V34M80 18V34" stroke="var(--orange)" stroke-width="1" opacity=".7"/>`,
  cablecars: `<path d="M4 44L116 14" stroke="currentColor" stroke-width="2.5"/><g transform="translate(60 27) rotate(-15)"><rect x="-26" y="-13" width="52" height="21" rx="4" fill="var(--orange)"/><rect x="-20" y="-9" width="40" height="9" fill="#F3E6C8"/><path d="M-7 -9v9M7 -9v9" stroke="var(--orange)" stroke-width="2"/><circle cx="-15" cy="11" r="3.5" fill="currentColor"/><circle cx="15" cy="11" r="3.5" fill="currentColor"/></g>`,
  sasquatch: `<g fill="var(--orange)"><ellipse cx="42" cy="30" rx="11" ry="15"/><circle cx="33" cy="11" r="4"/><circle cx="42" cy="8" r="4"/><circle cx="51" cy="10" r="3.5"/><circle cx="58" cy="15" r="3"/></g><path d="M78 44L90 10L102 44Z" fill="currentColor" opacity=".8"/><path d="M96 44L107 18L118 44Z" fill="currentColor" opacity=".55"/>`,
};
function brand(col) {
  const c = COLLECTIONS.find((x) => x.id === col);
  $(".brand .emblem").innerHTML = EMBLEMS[col || ""];
  $(".brand b").textContent = c ? c.name : "puzz";
  $(".brand small").textContent = c ? `logic puzzles · ${c.place}` : "original themed logic puzzles";
  $(".brand").setAttribute("href", c ? `#/c/${c.id}` : "#/");
  document.title = c ? `${c.name} · puzz` : "puzz · themed logic puzzles";
}

const thumb = (id, s = 40) => {
  const v = VARIANTS[id], sample = PACKS[id]?.gentle?.[0];
  return sample ? FAMILY[v.family].art.staticSvg(sample, { s, solved: true, id: "t" + id, cls: "thumb-svg" }) : "";
};
function variantCard(id) {
  const v = VARIANTS[id];
  return `<a class="card" href="#/${id}/gentle/1">
    <div class="thumb">${thumb(id)}</div>
    <div class="card-body"><h2>${esc(v.name)}</h2><p class="tag">${esc(v.tagline)}</p><p class="rules">${esc(v.ruleText[v.ruleText.length - 1])}</p><span class="go">Play →</span></div>
  </a>`;
}

// ------------------------------------------------------------------ home and collections
function home() {
  const sections = COLLECTIONS.filter((c) => c.variants.some((id) => PACKS[id])).map((c) => `<section class="collection" data-collection="${c.id}">
    <header class="collection-head"><h2><a href="#/c/${c.id}">${esc(c.name)}</a></h2><p class="tag">${esc(c.place)}</p><p class="blurb">${esc(c.blurb)}</p></header>
    <div class="cards">${c.variants.map(variantCard).join("")}</div>
  </section>`).join("");
  return `<section class="intro">
    <p class="lede">Original logic puzzles in the Japanese tradition, each built around a place and a story. The rules come from the story: bridges can't bend, streets run straight up the hills, and a Sasquatch needs the one square nobody is looking at.</p>
    <p class="lede small">Every puzzle has exactly one solution, and you can reach it by reasoning alone, without guessing. <a href="#/notes">How they were designed →</a></p>
  </section>${sections}`;
}

function collectionPage(c) {
  return `<section class="intro"><p class="lede">${esc(c.blurb)}</p></section>
  <section class="collection" data-collection="${c.id}"><div class="cards">${c.variants.map(variantCard).join("")}</div></section>
  <p class="more"><a href="#/notes">Design notes →</a></p>`;
}

// ------------------------------------------------------------------ play
function play(main, r) {
  const v = VARIANTS[r.variant], fam = FAMILY[v.family], col = collectionOf(r.variant);
  const list = PACKS[r.variant]?.[r.level] || [], p = list[r.idx];
  if (!p) { main.innerHTML = `<p class="lede">No puzzles here yet.</p>`; return; }
  const saved = store.get(p.id, {});
  const levelTabs = LEVELS.map(([l, name]) => `<a class="seg ${l === r.level ? "on" : ""}" href="#/${r.variant}/${l}/1">${name}</a>`).join("");
  const dots = list.map((q, i) => {
    const done = store.get(q.id, {}).solved;
    return `<a class="dot ${i === r.idx ? "on" : ""} ${done ? "done" : ""}" href="#/${r.variant}/${r.level}/${i + 1}" title="Puzzle ${i + 1}${done ? " (solved)" : ""}">${i + 1}</a>`;
  }).join("");
  const siblings = col.variants.length > 1 ? `<nav class="variant-tabs">${col.variants.map((id) => `<a class="${id === r.variant ? "on" : ""}" href="#/${id}/${r.level}/1">${esc(VARIANTS[id].name)}</a>`).join("")}</nav>` : "";
  main.innerHTML = `${siblings}<section class="play" data-family="${v.family}">
    <div class="board-col">
      <div class="picker"><div class="segs">${levelTabs}</div><div class="dots">${dots}</div></div>
      <div class="banner" hidden></div>
      <div id="board" class="board-wrap"></div>
    </div>
    <aside class="side">
      <div class="panel">
        <h2>${esc(v.name)}</h2>
        <p class="tag">${esc(v.tagline)}</p>
        <ol class="rules">${v.ruleText.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
        <p class="howto">${esc(fam.howto)}</p>
      </div>
      <div class="panel controls">
        <div class="row"><button data-act="undo">Undo</button><button data-act="clear">Clear</button><button data-act="check">Check</button></div>
        <div class="row"><button class="primary" data-act="hint">Hint</button><button data-act="apply" hidden>Show me</button></div>
        <p class="hint-text" aria-live="polite"></p>
        <p class="meta"><span class="timer">0:00</span> · ${p.rows}×${p.cols} · difficulty band ${p.rating.band}/5</p>
      </div>
      <details class="panel notes">
        <summary>Setter's notes for this puzzle</summary>
        ${setterNotes(p, v)}
      </details>
      <p class="more"><a href="#/notes/${r.variant}">Why these rules? Design notes →</a></p>
    </aside>
  </section>`;

  let seconds = saved.seconds || 0;
  const timerEl = $(".timer", main), banner = $(".banner", main), hintText = $(".hint-text", main), applyBtn = $('[data-act="apply"]', main);
  const fmt = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  timerEl.textContent = fmt(seconds);
  const persist = (extra = {}) => store.set(p.id, { ...store.get(p.id, {}), seconds, ...extra });
  const showBanner = () => {
    banner.hidden = false;
    banner.innerHTML = `<strong>${esc(fam.solvedLine)}</strong> Solved in ${fmt(seconds)}. ${r.idx + 1 < list.length ? `<a href="#/${r.variant}/${r.level}/${r.idx + 2}">Next puzzle →</a>` : `<a href="#/notes/${r.variant}">Read the design notes →</a>`}`;
  };
  board = fam.play.mountBoard($("#board", main), p, {
    saved: saved.state ?? saved.edges,
    onChange: (state) => persist({ state }),
    onSolved: () => { clearInterval(timer); persist({ solved: true }); showBanner(); $(".dot.on", main)?.classList.add("done"); hintText.textContent = ""; applyBtn.hidden = true; },
  });
  if (board.solved) showBanner();
  else timer = setInterval(() => { if (document.hidden) return; seconds++; timerEl.textContent = fmt(seconds); if (seconds % 5 === 0) persist(); }, 1000);

  main.querySelector(".controls").addEventListener("click", (ev) => {
    const act = ev.target.closest("button")?.dataset.act;
    if (!act) return;
    if (act !== "hint" && act !== "apply") { hintText.textContent = ""; applyBtn.hidden = true; }
    if (act === "undo") board.undo();
    if (act === "clear") board.clear();
    if (act === "check") {
      const bad = board.check();
      hintText.textContent = board.solved ? "Solved!" : bad ? `${bad} thing${bad > 1 ? "s" : ""} don't fit. They're highlighted in red.` : "Everything so far is right.";
    }
    if (act === "hint") {
      hintText.textContent = "Thinking…";
      setTimeout(() => {
        const h = board.hint();
        applyBtn.hidden = true;
        if (!h) hintText.textContent = board.solved ? "Solved!" : "No hint available.";
        else if (h.kind === "mistake") hintText.textContent = `Fix what's highlighted first: ${h.count} thing${h.count > 1 ? "s" : ""} don't fit.`;
        else {
          hintText.innerHTML = `<b>${esc(TECHNIQUE_NAMES[h.rule] || h.rule)}</b> <span class="tier">${esc(tierNames(v)[h.tier] || "")}</span><br>${esc(ruleHint(v, h.rule))}`;
          applyBtn.hidden = !h.count;
        }
      }, 20);
    }
    if (act === "apply") { board.applyHint(); applyBtn.hidden = true; hintText.textContent = ""; }
  });
}

function setterNotes(p, v) {
  const a = p.rating;
  const rows = METRIC_INFO.map(([k, name, desc, target, ok]) => `<tr><td title="${esc(desc)}">${name}</td><td>${a[k]}</td><td class="target">${target}</td><td>${ok(a) ? "✓" : "✗"}</td></tr>`).join("");
  const tech = Object.entries(a.techniques).sort((x, y) => y[1] - x[1]).map(([k, n]) => `<span class="chip">${esc(TECHNIQUE_NAMES[k] || k)} ×${n}</span>`).join("");
  return `<p>Difficulty <b>band ${a.band} of 5</b>: the hardest step needs <i>${esc(tierNames(v)[a.maxTier])}</i>. ${a.steps} deductions by the rule-based solver.${a.clueUse != null ? ` ${Math.round(a.clueUse * 100)}% of clues are used directly.` : ""}</p>
    <table class="metrics"><thead><tr><th>Measure</th><th>Value</th><th>Target</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="chips">${tech}</div>`;
}

// ------------------------------------------------------------------ notes
function notesPage() {
  const section = (id) => {
    const v = VARIANTS[id], n = NOTES[id], st = STATS[id];
    if (!n) return "";
    const bands = st ? Object.entries(st.bands).map(([b, k]) => `band ${b}: ${k}`).join(" · ") : "";
    return `<section class="note" id="n-${id}">
      <h2>${esc(v.name)} <a class="play-link" href="#/${id}/gentle/1">Play →</a></h2>
      <p class="tag">${esc(v.tagline)}</p>
      <h3>The rules come from the story</h3>
      <dl>${n.fiction.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join("")}</dl>
      <h3>Techniques the rules produce</h3>
      <dl>${n.techniques.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join("")}</dl>
      <h3>Family and originality</h3><p>${esc(n.lineage)}</p>
      <h3>How the puzzles are made</h3><p>${esc(n.generator)}</p>
      ${n.process ? `<h3>What changed along the way</h3><p>${esc(n.process)}</p>` : ""}
      ${st ? `<p class="stats">This build: ${st.unique} distinct puzzles from ${st.tried} attempts, ${st.passing} passing every quality gate. ${bands}.</p>` : ""}
    </section>`;
  };
  const groups = COLLECTIONS.map((c) => `<h2 class="group-title">${esc(c.name)} <small>${esc(c.place)}</small></h2>${c.variants.map(section).join("")}`).join("");
  return `<article class="notes-page">
    <h1>Design notes</h1>
    <p class="lede">These follow the principles in the project's research notes: rules short enough to state in one or two sentences, one solution reached without guessing, a clear way in, a solve that flows, and a theme that explains the rules rather than decorating them.</p>
    <p>Every puzzle is computer-generated and then measured by a rule-based solver that works one deduction at a time, cheapest first, the way a person would. That trace gives the difficulty, a check on how the solve flows (a way in, a hard step in the middle, an easy finish), and the hints in the app. Open <i>Setter's notes</i> under any puzzle to see its measurements.</p>
    ${groups}
  </article>`;
}

document.addEventListener("keydown", (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z" && board) { ev.preventDefault(); board.undo(); }
});
window.addEventListener("hashchange", render);
render();
