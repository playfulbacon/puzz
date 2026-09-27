import { PACKS, STATS } from "./data/puzzles.js";
import { VARIANTS, VARIANT_ORDER } from "../core/variants/index.js";
import { RULE_TEXT, TIER_NAMES } from "../core/road/human.js";
import { staticSvg } from "../core/render/board.js";
import { mountBoard } from "./play.js";
import { NOTES, METRIC_INFO, TECHNIQUE_NAMES } from "./notes.js";

const LEVELS = [["gentle", "Gentle"], ["medium", "Medium"], ["hard", "Hard"]];
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

const store = {
  get(k, d) { try { const v = localStorage.getItem("gg:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("gg:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "notes") return { page: "notes", variant: VARIANTS[parts[1]] ? parts[1] : null };
  const variant = VARIANTS[parts[0]] ? parts[0] : null;
  if (!variant) return { page: "home" };
  const level = LEVELS.some(([l]) => l === parts[1]) ? parts[1] : "gentle";
  const list = PACKS[variant][level] || [];
  const idx = Math.min(Math.max(1, +(parts[2] || 1)), Math.max(1, list.length)) - 1;
  return { page: "play", variant, level, idx };
}

let board = null, timer = null;

function render() {
  clearInterval(timer);
  const r = route();
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.v === (r.variant || r.page)));
  const main = $("#main");
  if (r.page === "home") main.innerHTML = home();
  else if (r.page === "notes") { main.innerHTML = notesPage(); if (r.variant) $("#n-" + r.variant)?.scrollIntoView(); }
  else play(main, r);
  window.scrollTo?.(0, 0);
}

// ------------------------------------------------------------------ home
function home() {
  const cards = VARIANT_ORDER.map((id) => {
    const v = VARIANTS[id], sample = PACKS[id].gentle[0];
    return `<a class="card" href="#/${id}/gentle/1">
      <div class="thumb">${sample ? staticSvg(sample, { s: 40, solved: true, id: "t" + id, cls: "thumb-svg" }) : ""}</div>
      <div class="card-body"><h2>${esc(v.name)}</h2><p class="tag">${esc(v.tagline)}</p><p class="rules">${esc(v.ruleText[1])}</p><span class="go">Play →</span></div>
    </a>`;
  }).join("");
  return `<section class="intro">
    <p class="lede">Three original logic puzzles set in the San Francisco Bay. Each ends the same way: with one orange road running from the toll plaza in San Francisco to Vista Point in Marin, across the water and around whatever is in the way.</p>
    <p class="lede small">Every puzzle has exactly one solution, and you can reach it by reasoning alone, without guessing. <a href="#/notes">How they were designed →</a></p>
  </section>
  <section class="cards">${cards}</section>`;
}

// ------------------------------------------------------------------ play
function play(main, r) {
  const v = VARIANTS[r.variant], list = PACKS[r.variant][r.level], p = list[r.idx];
  const saved = store.get(p.id, {});
  const levelTabs = LEVELS.map(([l, name]) => `<a class="seg ${l === r.level ? "on" : ""}" href="#/${r.variant}/${l}/1">${name}</a>`).join("");
  const dots = list.map((q, i) => {
    const done = store.get(q.id, {}).solved;
    return `<a class="dot ${i === r.idx ? "on" : ""} ${done ? "done" : ""}" href="#/${r.variant}/${r.level}/${i + 1}" title="Puzzle ${i + 1}${done ? " (solved)" : ""}">${i + 1}</a>`;
  }).join("");
  main.innerHTML = `<section class="play">
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
        <p class="howto">Drag between squares to build road; drag over it again to remove it. Tap a gap, or right-click it, to mark it with an ×.</p>
      </div>
      <div class="panel controls">
        <div class="row"><button data-act="undo">Undo</button><button data-act="clear">Clear</button><button data-act="check">Check</button></div>
        <div class="row"><button class="primary" data-act="hint">Hint</button><button data-act="apply" hidden>Show me</button></div>
        <p class="hint-text" aria-live="polite"></p>
        <p class="meta"><span class="timer">0:00</span> · ${p.rows}×${p.cols} · difficulty band ${p.rating.band}/5</p>
      </div>
      <details class="panel notes">
        <summary>Setter's notes for this puzzle</summary>
        ${setterNotes(p)}
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
    banner.innerHTML = `<strong>The bridge is open.</strong> Solved in ${fmt(seconds)}. ${r.idx + 1 < list.length ? `<a href="#/${r.variant}/${r.level}/${r.idx + 2}">Next puzzle →</a>` : `<a href="#/notes/${r.variant}">Read the design notes →</a>`}`;
  };
  board = mountBoard($("#board", main), p, {
    saved: saved.edges,
    onChange: (edges) => persist({ edges }),
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
      hintText.textContent = board.solved ? "Solved!" : bad ? `${bad} mark${bad > 1 ? "s" : ""} don't fit. They're highlighted in red.` : "Everything so far is right.";
    }
    if (act === "hint") {
      hintText.textContent = "Thinking…";
      setTimeout(() => {
        const h = board.hint();
        applyBtn.hidden = true;
        if (!h) hintText.textContent = board.solved ? "Solved!" : "No hint available.";
        else if (h.kind === "mistake") hintText.textContent = `Fix what's highlighted first: ${h.count} mark${h.count > 1 ? "s" : ""} don't fit.`;
        else {
          const text = VARIANT_HINTS[r.variant]?.[h.rule] || RULE_TEXT[h.rule] || "";
          hintText.innerHTML = `<b>${esc(TECHNIQUE_NAMES[h.rule] || h.rule)}</b> <span class="tier">${esc(TIER_NAMES[h.tier])}</span><br>${esc(text)}`;
          applyBtn.hidden = !h.count;
        }
      }, 20);
    }
    if (act === "apply") { board.applyHint(); applyBtn.hidden = true; hintText.textContent = ""; }
  });
}

function setterNotes(p) {
  const a = p.rating;
  const rows = METRIC_INFO.map(([k, name, desc, target, ok]) => `<tr><td title="${esc(desc)}">${name}</td><td>${a[k]}</td><td class="target">${target}</td><td>${ok(a) ? "✓" : "✗"}</td></tr>`).join("");
  const tech = Object.entries(a.techniques).sort((x, y) => y[1] - x[1]).map(([k, n]) => `<span class="chip">${esc(TECHNIQUE_NAMES[k] || k)} ×${n}</span>`).join("");
  return `<p>Difficulty <b>band ${a.band} of 5</b>: the hardest step needs <i>${esc(TIER_NAMES[a.maxTier])}</i>. ${a.steps} deductions by the rule-based solver.${a.clueUse != null ? ` ${Math.round(a.clueUse * 100)}% of clues are used directly.` : ""}</p>
    <table class="metrics"><thead><tr><th>Measure</th><th>Value</th><th>Target</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="chips">${tech}</div>`;
}

// ------------------------------------------------------------------ notes
function notesPage() {
  const sections = VARIANT_ORDER.map((id) => {
    const v = VARIANTS[id], n = NOTES[id], st = STATS[id];
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
      ${st ? `<p class="stats">This build: ${st.unique} distinct puzzles from ${st.tried} attempts, ${st.passing} passing every quality gate. ${bands}.</p>` : ""}
    </section>`;
  }).join("");
  return `<article class="notes-page">
    <h1>Design notes</h1>
    <p class="lede">These follow the principles in the project's research notes: rules short enough to state in one or two sentences, one solution reached without guessing, a clear way in, a solve that flows, and a theme that explains the rules rather than decorating them.</p>
    <p>Every puzzle is computer-generated and then measured by a rule-based solver that works one deduction at a time, cheapest first, the way a person would. That trace gives the difficulty, a check on how the solve flows (a way in, a hard step in the middle, an easy finish), and the hints in the app. Open <i>Setter's notes</i> under any puzzle to see its measurements.</p>
    ${sections}
  </article>`;
}

document.addEventListener("keydown", (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z" && board) { ev.preventDefault(); board.undo(); }
});
window.addEventListener("hashchange", render);
render();
