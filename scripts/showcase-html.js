// The interactive showcase page, docs/showcase.html: an Explorer mock-up where the theme and the
// icon mode can be switched and a file's status changed by clicking it, plus a legend of every
// status. Self-contained (icons inline, no network), so it works opened from disk or on GitHub
// Pages. Called by build-showcase.js with the data the extension uses.

/** Returns the page as a string. `data` = { icons, profiles, colors, tree, version }. */
function showcaseHtml(data) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Record Status Showcase</title>
<style>
:root {
  --page: #f6f6f4; --ink: #1f2328; --muted: #59636e; --line: #d8dee4; --card: #ffffff;
  --accent: #0969da;
  --ex-bg: #f8f8f8; --ex-fg: #3b3b3b; --ex-guide: #d4d4d4; --ex-hover: #e8e8e8;
}
:root[data-ex="dark"] { --ex-bg: #181818; --ex-fg: #cccccc; --ex-guide: #404040; --ex-hover: #2a2d2e; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --page: #0d1117; --ink: #e6edf3; --muted: #9198a1; --line: #30363d; --card: #151b23; --accent: #4493f8; }
}
:root[data-theme="dark"] { --page: #0d1117; --ink: #e6edf3; --muted: #9198a1; --line: #30363d; --card: #151b23; --accent: #4493f8; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink);
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
main { max-width: 1040px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { font-size: 28px; margin: 0 0 4px; }
h2 { font-size: 20px; margin: 40px 0 8px; }
p { margin: 0 0 12px; color: var(--muted); max-width: 70ch; }
.layout { display: grid; grid-template-columns: 360px 1fr; gap: 24px; align-items: start; margin-top: 20px; }
@media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
.controls { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0 0; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--card); }
.seg button { border: 0; background: none; color: var(--ink); font: inherit; font-size: 13px; padding: 6px 12px; cursor: pointer; }
.seg button + button { border-left: 1px solid var(--line); }
.seg button[aria-pressed="true"] { background: var(--accent); color: #fff; }
.label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 4px; }
.explorer { background: var(--ex-bg); color: var(--ex-fg); border-radius: 8px; padding: 4px 0;
  font: 13px/22px "Segoe UI", -apple-system, Helvetica, Arial, sans-serif; user-select: none;
  border: 1px solid var(--line); }
.row { display: flex; align-items: center; height: 22px; padding-right: 12px; position: relative; cursor: default; }
.row.file { cursor: pointer; }
.row:hover { background: var(--ex-hover); }
.row .chev { width: 16px; height: 16px; flex: none; }
.row .icon { width: 16px; height: 16px; flex: none; margin-right: 6px; }
.row .icon svg { width: 16px; height: 16px; display: block; }
.row .name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .badge { margin-left: 8px; font-size: 12px; min-width: 14px; text-align: right; }
.guide { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--ex-guide); }
.note { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; font-size: 14px; }
.note h3 { margin: 0 0 6px; font-size: 15px; }
.note p { color: var(--ink); margin: 0 0 8px; }
.note code, td code { font-size: 12.5px; background: color-mix(in srgb, var(--line) 45%, transparent); padding: 1px 5px; border-radius: 4px; }
.legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 12px; }
.kind { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; }
.kind h3 { margin: 0 0 2px; font-size: 15px; }
.kind .glob { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
td { padding: 3px 4px; vertical-align: middle; white-space: nowrap; }
td.i { width: 22px; } td.i svg { width: 16px; height: 16px; display: block; }
td.g { width: 24px; text-align: center; color: var(--muted); }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
.hint { font-size: 13px; color: var(--muted); margin-top: 8px; }
footer { margin-top: 48px; font-size: 13px; color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>Record Status</h1>
  <p>How the extension shows the status written inside a Markdown file in the VS Code Explorer.
  Click a file to cycle its status; switch the Explorer theme and the icon mode to see each case.
  Generated from the extension's own data (version ${data.version}); icons are Material Icon Theme's.</p>

  <div class="controls">
    <div><span class="label">Explorer theme</span><div class="seg" id="ex">
      <button data-v="dark" aria-pressed="true">Dark</button><button data-v="light" aria-pressed="false">Light</button></div></div>
    <div><span class="label">Icon mode</span><div class="seg" id="mode">
      <button data-v="bundled" aria-pressed="true">bundled</button><button data-v="material" aria-pressed="false">material</button><button data-v="badge" aria-pressed="false">badge</button><button data-v="off" aria-pressed="false">off</button></div></div>
  </div>

  <div class="layout">
    <div>
      <div class="explorer" id="tree" role="tree" aria-label="Explorer mock-up"></div>
      <div class="hint">Click a file to change its status. Hover for the tooltip.</div>
    </div>
    <div class="note" id="modeNote"></div>
  </div>

  <h2>Every status</h2>
  <p>Shape = kind of record, colour = state. The glyph is what badge mode shows instead of an icon.</p>
  <div class="legend" id="legend"></div>

  <footer>Record Status · regenerate with <code>npm run showcase</code></footer>
</main>
<script>
const DATA = ${JSON.stringify(data)};
const MODE_NOTES = {
  bundled: "<h3>bundled</h3><p>Record Status Icons is the file icon theme: Material Icon Theme's icons plus one recoloured icon per status. Nothing is written into the workspace.</p><p>Recommended when <code>.vscode/settings.json</code> is under version control.</p>",
  material: "<h3>material</h3><p>Material Icon Theme stays the file icon theme. Looks the same as bundled, but the icons come from <code>record-*</code> clones the extension writes into the workspace's <code>.vscode/settings.json</code> on every status change.</p>",
  badge: "<h3>badge</h3><p>Any icon theme. Files keep their own icon; a glyph after the name, in the name colour, carries the status.</p>",
  off: "<h3>off</h3><p>Name colour only.</p>",
};
const state = { ex: "dark", mode: "bundled", tree: DATA.tree.map((r) => ({ ...r })) };
// Links can pick the view: showcase.html#mode=badge&ex=light
for (const [k, v] of new URLSearchParams(location.hash.slice(1))) {
  if (k === "mode" && MODE_NOTES[v]) state.mode = v;
  if (k === "ex" && (v === "dark" || v === "light")) state.ex = v;
}

function look(r) { const p = DATA.profiles[r.profile]; return p && p.statuses[r.status]; }
function colorOf(id) { const c = DATA.colors[id]; return c ? c[state.ex] : null; }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function title(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** File names used by records in different (profile, status) pairs get no status icon. */
function sharedNames() {
  const seen = {};
  for (const r of state.tree) {
    if (!r.profile || !look(r) || !look(r).icon) continue;
    const key = r.profile + "/" + r.status, n = r.name.toLowerCase();
    (seen[n] = seen[n] || new Set()).add(key);
  }
  return new Set(Object.keys(seen).filter((n) => seen[n].size > 1));
}

/** Done and counted tasks under each folder row (the folder above the tasks/ folder). */
function rollups() {
  const out = {};
  state.tree.forEach((r) => {
    if (r.profile !== "task" || r.rollupInto == null) return;
    const l = look(r) || {};
    if (l.rollup === "skip") return;
    const c = out[r.rollupInto] = out[r.rollupInto] || { done: 0, counted: 0 };
    c.counted++; if (l.rollup === "done") c.done++;
  });
  return out;
}

function render() {
  document.documentElement.dataset.ex = state.ex;
  const shared = sharedNames(), roll = rollups(), iconMode = state.mode === "bundled" || state.mode === "material";
  let html = "";
  state.tree.forEach((r, i) => {
    let icon, color = null, badge = "", tip = "";
    if (r.folder) {
      icon = DATA.icons[r.open ? r.iconOpen : r.iconClosed];
      const c = roll[r.id];
      if (c && c.counted) {
        badge = c.done >= c.counted ? "✓" : String(Math.floor(100 * c.done / c.counted));
        if (c.done >= c.counted) color = colorOf("recordStatus.completed");
        tip = c.done + " of " + c.counted + " done";
      }
    } else {
      const l = look(r);
      icon = DATA.icons[r.plainIcon];
      if (l) {
        if (iconMode && l.icon && !shared.has(r.name.toLowerCase())) icon = DATA.icons["status:" + r.profile + "/" + r.status];
        if (l.nameColor) color = colorOf(l.nameColor);
        badge = l.badge || (state.mode === "badge" ? l.glyph || "" : "");
        tip = title(r.profile) + ": " + title(r.status);
      }
    }
    const pad = 8 + r.depth * 12;
    let guides = "";
    for (let d = 1; d <= r.depth; d++) guides += '<span class="guide" style="left:' + (8 + d * 12 - 4) + 'px"></span>';
    const chev = r.folder
      ? '<svg class="chev" viewBox="0 0 16 16"><path d="' + (r.open ? "M4 6l4 4 4-4" : "M6 4l4 4-4 4") + '" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>'
      : '<span class="chev"></span>';
    html += '<div class="row ' + (r.folder ? "folder" : "file") + '" data-i="' + i + '" title="' + esc(tip) + '" style="padding-left:' + pad + 'px' + (color ? ";color:" + color : "") + '">'
      + guides + chev + '<span class="icon">' + icon + '</span><span class="name">' + esc(r.name) + '</span>'
      + (badge ? '<span class="badge">' + esc(badge) + "</span>" : "") + "</div>";
  });
  document.getElementById("tree").innerHTML = html;
  document.getElementById("modeNote").innerHTML = MODE_NOTES[state.mode];
  document.querySelectorAll("#ex button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === state.ex));
  document.querySelectorAll("#mode button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === state.mode));
  renderLegend();
}

function renderLegend() {
  let html = "";
  for (const [name, p] of Object.entries(DATA.profiles)) {
    html += '<div class="kind"><h3>' + title(name) + '</h3><div class="glob">' + p.include.map(esc).join(", ") + "</div><table>";
    for (const [word, l] of Object.entries(p.statuses)) {
      const c = l.nameColor ? colorOf(l.nameColor) : null;
      html += '<tr><td class="i">' + DATA.icons["status:" + name + "/" + word] + "</td><td><code>" + esc(word) + "</code></td>"
        + "<td>" + (c ? '<span class="swatch" style="background:' + c + '"></span>' : "") + "</td>"
        + '<td class="g">' + esc(l.glyph || "") + "</td><td>" + (l.rollup === "done" ? "done" : l.rollup === "skip" ? "not counted" : "") + "</td></tr>";
    }
    html += "</table></div>";
  }
  document.getElementById("legend").innerHTML = html;
}

document.getElementById("tree").addEventListener("click", (e) => {
  const row = e.target.closest(".row.file");
  if (!row) return;
  const r = state.tree[+row.dataset.i];
  if (!r.profile) return;
  const words = Object.keys(DATA.profiles[r.profile].statuses);
  r.status = words[(words.indexOf(r.status) + 1) % words.length];
  render();
});
document.getElementById("ex").addEventListener("click", (e) => { if (e.target.dataset.v) { state.ex = e.target.dataset.v; render(); } });
document.getElementById("mode").addEventListener("click", (e) => { if (e.target.dataset.v) { state.mode = e.target.dataset.v; render(); } });
render();
</script>
</body>
</html>
`;
}

module.exports = { showcaseHtml };
