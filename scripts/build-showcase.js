// Builds docs/showcase.md and its images in docs/showcase/: every status, icon mode and roll-up
// case drawn as VS Code Explorer rows, in dark and light, from the same data the extension uses
// (core.js DEFAULT_PROFILES, the bundled theme's icons, package.json colours).
//
//   npm run build-theme      (once; the icons come from theme/)
//   npm run showcase
const fs = require("fs");
const path = require("path");
const core = require("../core");
const { showcaseHtml } = require("./showcase-html");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const THEME = path.join(ROOT, "theme");
const OUT = path.join(ROOT, "docs", "showcase");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

if (!fs.existsSync(path.join(THEME, "material-icons.base.json"))) {
    console.error("theme/ is missing; run `npm run build-theme` first.");
    process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(THEME, "material-icons.base.json"), "utf8"));
const COLORS = Object.fromEntries(pkg.contributes.colors.map((c) => [c.id, c.defaults]));
// Theme colours the presets use, as VS Code's Dark Modern and Light Modern themes draw them
// (approximate; a real colour theme changes them).
const THEME_PREVIEW = {
    "descriptionForeground": { dark: "#9d9d9d", light: "#616161" },
    "disabledForeground": { dark: "#6e6e6e", light: "#a8a8a8" },
    "charts.yellow": { dark: "#cca700", light: "#bf8803" },
    "charts.green": { dark: "#89d185", light: "#388a34" },
    "charts.red": { dark: "#f14c4c", light: "#e51400" },
    "charts.blue": { dark: "#3794ff", light: "#1a85ff" },
    "charts.purple": { dark: "#b180d7", light: "#652d90" },
    "terminal.ansiCyan": { dark: "#11a8cd", light: "#0598bc" },
    "gitDecoration.modifiedResourceForeground": { dark: "#e2c08d", light: "#895503" },
    "gitDecoration.addedResourceForeground": { dark: "#81b88b", light: "#587c0c" },
    "gitDecoration.deletedResourceForeground": { dark: "#c74e39", light: "#ad0707" },
    "gitDecoration.submoduleResourceForeground": { dark: "#8db9e2", light: "#1258a7" },
    "gitDecoration.ignoredResourceForeground": { dark: "#8c8c8c", light: "#8e8e90" },
};
/** Preview hex of a look's name colour under a preset, or null for none. */
function nameHex(nameColor, skin, preset = "default") {
    const id = core.resolveNameColor(nameColor, preset);
    const c = COLORS[id] || THEME_PREVIEW[id];
    return id && c ? c[skin] : null;
}
// Icons the showcase page offers as alternatives for specs and decisions.
const SPEC_ICONS = ["document", "log", "contributing", "toc", "architecture"];
const DECISION_ICONS = ["routing", "key", "git", "chess", "tune", "label", "certificate", "pipeline"];

const SKINS = {
    dark: { bg: "#181818", fg: "#cccccc", dim: "#8b8b8b", guide: "#404040", tipBg: "#252526", tipBorder: "#454545" },
    light: { bg: "#f8f8f8", fg: "#3b3b3b", dim: "#6f6f6f", guide: "#d4d4d4", tipBg: "#f3f3f3", tipBorder: "#c8c8c8" },
};
const ROW = 22;
const WIDTH = 340;
const FONT = "Segoe UI, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";

// ---- icons ---------------------------------------------------------------------------------

function iconSvg(name) {
    const def = manifest.iconDefinitions[name];
    if (!def) { throw new Error(`no icon ${name}`); }
    return fs.readFileSync(path.join(THEME, def.iconPath), "utf8");
}

/** An icon as a nested <svg> element at (x, y), 16 px, optionally recoloured. */
function placeIcon(name, x, y, color) {
    let svg = iconSvg(name);
    if (color) { svg = core.recolorSvg(svg, core.resolveColor(color) || color); }
    const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1] || "0 0 24 24";
    const rootFill = (svg.match(/<svg[^>]*\sfill="([^"]+)"/) || [])[1];
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return `<svg x="${x}" y="${y}" width="16" height="16" viewBox="${viewBox}"${rootFill ? ` fill="${rootFill}"` : ""}>${inner}</svg>`;
}

function fileIcon(name) {
    const n = name.toLowerCase();
    return manifest.fileNames[n] || manifest.fileExtensions[n.split(".").pop()] || manifest.file;
}

function folderIcon(name, open) {
    const n = name.toLowerCase();
    return open ? (manifest.folderNamesExpanded[n] || manifest.folderExpanded) : (manifest.folderNames[n] || manifest.folder);
}

// ---- explorer mock-ups -----------------------------------------------------------------------

const profiles = core.resolveProfiles({});
const byName = Object.fromEntries(profiles.map((p) => [p.name, p]));

function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Rows: { depth, name, folder?: true, open?, profile?, status?, rollup?: {done, counted}, note? }.
 * `mode` is how icons are shown: bundled, material, badge, off.
 */
function explorer(rows, mode, skin, { tooltip, preset = "default" } = {}) {
    const s = SKINS[skin];
    const records = rows.filter((r) => r.profile).map((r) => ({ fsPath: `${r.dir || ""}/${r.name}`, profile: r.profile, status: r.status }));
    const groups = core.iconGroups(records, byName);
    const shared = new Set(groups.shared);
    const height = rows.length * ROW + 8 + (tooltip ? 34 : 0);
    let body = "";
    rows.forEach((r, i) => {
        const y = 4 + i * ROW;
        const x = 8 + r.depth * 12;
        const mid = y + ROW / 2;
        for (let d = 1; d <= r.depth; d++) {
            body += `<line x1="${8 + d * 12 - 4}" y1="${y}" x2="${8 + d * 12 - 4}" y2="${y + ROW}" stroke="${s.guide}" stroke-width="1"/>`;
        }
        let label = s.fg;
        let badge = "";
        let icon;
        if (r.folder) {
            const chevron = r.open ? `M${x + 1} ${mid - 2} l4 4 l4 -4` : `M${x + 3} ${mid - 4} l4 4 l-4 4`;
            body += `<path d="${chevron}" fill="none" stroke="${s.fg}" stroke-width="1.2"/>`;
            icon = placeIcon(folderIcon(r.name, r.open), x + 14, mid - 8);
            if (r.rollup) {
                badge = core.rollupBadge(r.rollup) || "";
                if (r.rollup.done >= r.rollup.counted && r.rollup.counted) { label = nameHex("recordStatus.completed", skin, preset) || label; }
            }
        } else {
            const look = r.profile ? core.lookOf({ profile: r.profile, status: r.status }, byName) : undefined;
            const iconMode = mode === "bundled" || mode === "material";
            const ownName = r.name.toLowerCase();
            if (look && iconMode && look.icon && !shared.has(ownName)) {
                icon = placeIcon(look.icon, x + 14, mid - 8, look.iconColor);
            } else {
                icon = placeIcon(fileIcon(r.name), x + 14, mid - 8);
            }
            if (look && mode !== "none") {
                label = nameHex(look.nameColor, skin, preset) || label;
                badge = look.badge || (mode === "badge" ? look.glyph || "" : "");
            }
        }
        body += icon;
        body += `<text x="${x + 36}" y="${mid + 4.5}" font-family="${FONT}" font-size="13" fill="${label}">${esc(r.name)}</text>`;
        if (badge) {
            body += `<text x="${WIDTH - 12}" y="${mid + 4.5}" font-family="${FONT}" font-size="12" text-anchor="end" fill="${label}">${esc(badge)}</text>`;
        }
        if (r.note) {
            body += `<text x="${WIDTH - (badge ? 34 : 12)}" y="${mid + 4.5}" font-family="${FONT}" font-size="11" font-style="italic" text-anchor="end" fill="${s.dim}">${esc(r.note)}</text>`;
        }
    });
    if (tooltip) {
        const y = 4 + tooltip.row * ROW + ROW + 2;
        const w = 8 + tooltip.text.length * 7;
        body += `<rect x="${tooltip.x}" y="${y}" width="${w}" height="26" rx="3" fill="${s.tipBg}" stroke="${s.tipBorder}"/>`;
        body += `<text x="${tooltip.x + 8}" y="${y + 17}" font-family="${FONT}" font-size="12" fill="${s.fg}">${esc(tooltip.text)}</text>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">`
        + `<rect width="100%" height="100%" rx="6" fill="${s.bg}"/>${body}</svg>\n`;
}

function write(name, rows, mode, opts) {
    for (const skin of ["dark", "light"]) {
        fs.writeFileSync(path.join(OUT, `${name}-${skin}.svg`), explorer(rows, mode, skin, opts));
    }
}

/** Markdown: the dark and the light image side by side. */
function pair(name, alt) {
    return `| Dark | Light |\n|---|---|\n| <img src="showcase/${name}-dark.svg" alt="${alt}, dark theme" width="${WIDTH}"> | <img src="showcase/${name}-light.svg" alt="${alt}, light theme" width="${WIDTH}"> |\n`;
}

function swatch(color, skin) {
    const hex = color && COLORS[color] ? COLORS[color][skin] : null;
    return hex ? `<img src="showcase/swatch-${hex.slice(1)}.svg" width="12" height="12"> \`${hex}\`` : "—";
}

function writeSwatches() {
    for (const c of Object.values(COLORS)) {
        for (const hex of [c.dark, c.light]) {
            fs.writeFileSync(path.join(OUT, `swatch-${hex.slice(1)}.svg`),
                `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" rx="2" fill="${hex}"/></svg>\n`);
        }
    }
}

function writeStatusIcon(profile, status, look) {
    const file = `icon-${profile}-${status}.svg`;
    const svg = core.recolorSvg(iconSvg(look.icon), core.resolveColor(look.iconColor));
    fs.writeFileSync(path.join(OUT, file), svg);
    return file;
}

// ---- the scenarios -------------------------------------------------------------------------

const DESCRIBE = {
    task: {
        planned: "Not started.", active: "Being worked on.", check: "Built; waiting for a person's look. Never blocks.",
        done: "Finished; counts as done in the roll-up.", blocked: "Can't start or continue; **Open:** says why.",
        dropped: "Won't be done; not counted in the roll-up.", split: "Points to other tasks; not counted.",
    },
    decision: { open: "Asked or to be asked.", decided: "Answered; the spec is updated.", superseded: "Replaced by a later decision.", dropped: "No longer relevant." },
    spec: {
        draft: "Being written.", review: "Ready for the developer to read.", accepted: "Signed off, not built yet.",
        living: "Being built; kept current.", superseded: "Replaced.", explainer: "Explains part of another spec.",
    },
    reference: { research: "v1 research, read-only.", assessment: "A dated assessment.", explainer: "An explainer." },
};

const SAMPLE = {
    task: { folder: "tasks", file: (s, i) => `SAVE-V${i}_${s[0].toUpperCase() + s.slice(1)}.md` },
    decision: { folder: "decisions", file: (s, i) => `SAVE-OD-${i + 1}_${s[0].toUpperCase() + s.slice(1)}.md` },
    spec: { folder: "spec", file: (s, i) => `0${i + 1}_${s[0].toUpperCase() + s.slice(1)}.md` },
    reference: { folder: "assessments", file: (s) => `${s[0].toUpperCase() + s.slice(1)}_2026-10.md` },
};

/** Data for the interactive page: an Explorer tree plus every icon it can show, inline. */
function htmlData() {
    const icons = {};
    const clean = (svg) => svg.replace(/<\?xml[^>]*>\s*/, "").trim();
    for (const [profile, p] of Object.entries(core.DEFAULT_PROFILES)) {
        for (const [status, look] of Object.entries(p.statuses)) {
            icons[`status:${profile}/${status}`] = clean(core.recolorSvg(iconSvg(look.icon), core.resolveColor(look.iconColor)));
        }
    }
    const tree = [];
    const folder = (depth, name, open, extra = {}) => {
        const iconOpen = folderIcon(name, true), iconClosed = folderIcon(name, false);
        icons[iconOpen] = icons[iconOpen] || clean(iconSvg(iconOpen));
        icons[iconClosed] = icons[iconClosed] || clean(iconSvg(iconClosed));
        tree.push({ id: tree.length, depth, name, folder: true, open, iconOpen, iconClosed, ...extra });
        return tree.length - 1;
    };
    const file = (depth, name, profile, status, extra = {}) => {
        const plainIcon = fileIcon(name);
        icons[plainIcon] = icons[plainIcon] || clean(iconSvg(plainIcon));
        tree.push({ id: tree.length, depth, name, profile, status, plainIcon, ...extra });
    };
    folder(0, "AIV2", true);
    file(1, "README.md", "spec", "living");
    folder(1, "tasks", true);
    file(2, "AI-A0_Harness.md", "task", "done", { rollupInto: 0 });
    file(2, "AI-A1_Slice.md", "task", "done", { rollupInto: 0 });
    file(2, "AI-A3a_Runtime.md", "task", "done", { rollupInto: 0 });
    const saves = folder(0, "SavesV2", true);
    folder(1, "decisions", true);
    file(2, "SAVE-OD-1_Compression.md", "decision", "open");
    file(2, "SAVE-OD-2_One_File.md", "decision", "decided");
    file(2, "SAVE-OD-3_Save_Any_Time.md", "decision", "superseded");
    folder(1, "spec", true);
    file(2, "01_Saves_v2.md", "spec", "living");
    file(2, "02_Build_Order.md", "spec", "review");
    folder(1, "tasks", true);
    for (const [i, [name, status]] of [["Decisions", "done"], ["Container", "done"], ["Pieces", "check"], ["Saving", "active"],
        ["Session", "planned"], ["Relations", "blocked"], ["Importer", "dropped"]].entries()) {
        file(2, `SAVE-V${i}_${name}.md`, "task", status, { rollupInto: saves });
    }
    file(1, "README.md", "spec", "review");
    folder(0, "assessments", true);
    file(1, "Refactor_Assessment.md", "reference", "assessment");
    const raw = {};
    for (const name of [...SPEC_ICONS, ...DECISION_ICONS]) { raw[name] = clean(iconSvg(name)); }
    const palette = {};
    for (const p of Object.values(core.DEFAULT_PROFILES)) {
        for (const look of Object.values(p.statuses)) { palette[look.iconColor] = core.resolveColor(look.iconColor); }
    }
    return {
        icons, raw, palette, tree, version: pkg.version,
        profiles: core.DEFAULT_PROFILES,
        colors: { ...THEME_PREVIEW, ...COLORS },
        presets: core.COLOR_PRESETS,
        specIcons: SPEC_ICONS,
        decisionIcons: DECISION_ICONS,
    };
}

const CHROMES = [
    process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
].filter(Boolean);

/**
 * docs/hero-dark.png and docs/hero-light.png for the README: the bundled-mode mock-up at 2x,
 * screenshotted with headless Chrome or Edge (the Marketplace does not allow SVG in a README).
 * Skipped with a warning when no browser is found.
 */
function renderHero() {
    const chrome = CHROMES.find((c) => fs.existsSync(c));
    if (!chrome) {
        console.warn("hero: no Chrome or Edge found (set CHROME); README images not updated");
        return;
    }
    for (const skin of ["dark", "light"]) {
        const svg = path.join(OUT, `mode-bundled-${skin}.svg`);
        const [, w, h] = fs.readFileSync(svg, "utf8").match(/width="(\d+)" height="(\d+)"/);
        const page = path.join(OUT, `hero-${skin}.tmp.html`);
        fs.writeFileSync(page, `<html><body style="margin:0;background:transparent"><img src="mode-bundled-${skin}.svg" width="${w}" height="${h}" style="display:block"></body></html>`);
        const out = path.join(ROOT, "docs", `hero-${skin}.png`);
        execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
            "--default-background-color=00000000", `--window-size=${w},${h}`, `--screenshot=${out}`, "file:///" + page.split(path.sep).join("/")],
        { stdio: "ignore" });
        fs.rmSync(page);
    }
    console.log("hero: docs/hero-dark.png, docs/hero-light.png");
}

function main() {
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(OUT, { recursive: true });
    writeSwatches();

    let md = `# Record Status: design showcase

Every case the extension draws in the Explorer, generated from the extension's own data
(\`core.js\` built-in profiles, the bundled icon theme, \`package.json\` colours) by
\`npm run showcase\`. Regenerate it after changing a look, then review the diff.

Each picture is a mock-up of the Explorer at VS Code's sizes (22 px rows, 16 px icons), dark
and light. Icons are Material Icon Theme 5.39's, recoloured the way the bundled theme
recolours them. Text uses the system UI font, so it can differ slightly from VS Code's.

**Interactive version:** [\`showcase.html\`](showcase.html) (open it in a browser; switch theme and icon
mode, click files to change their status).

**Contents:** [1. Status words](#1-status-words) · [2. Icon modes](#2-icon-modes) ·
[3. Folder roll-up](#3-folder-roll-up) · [4. Shared file names](#4-shared-file-names) ·
[5. Tooltip](#5-tooltip) · [6. Questions to approve](#6-questions-to-approve)

## 1. Status words

The four built-in kinds. Shape = kind, colour = state. Icon mode \`bundled\` (the same pictures
as \`material\`).

`;
    for (const profile of ["task", "decision", "spec", "reference"]) {
        const p = core.DEFAULT_PROFILES[profile];
        const sample = SAMPLE[profile];
        const rows = [{ depth: 0, name: "SavesV2", folder: true, open: true }, { depth: 1, name: sample.folder, folder: true, open: true }];
        Object.keys(p.statuses).forEach((status, i) => {
            rows.push({ depth: 2, name: sample.file(status, i), profile, status, dir: sample.folder });
        });
        write(`status-${profile}`, rows, "bundled");

        md += `### ${profile[0].toUpperCase() + profile.slice(1)} — \`${p.include.join("`, `")}\`\n\n`;
        md += pair(`status-${profile}`, `${profile} statuses in the Explorer`);
        md += `\n| Icon | Word | Meaning | Icon (Material name, colour) | Name colour dark / light | Glyph (badge mode) | Roll-up |\n|---|---|---|---|---|---|---|\n`;
        for (const [status, look] of Object.entries(p.statuses)) {
            const icon = writeStatusIcon(profile, status, look);
            md += `| <img src="showcase/${icon}" width="20"> | \`${status}\` | ${DESCRIBE[profile][status] || ""} | \`${look.icon}\`, \`${look.iconColor}\` | `
                + `${look.nameColor ? `${swatch(look.nameColor, "dark")} / ${swatch(look.nameColor, "light")}` : "—"} | `
                + `${look.glyph ? `\`${look.glyph}\`` : "—"} | ${look.rollup === "done" ? "done" : look.rollup === "skip" ? "not counted" : profile === "task" ? "counted" : "—"} |\n`;
        }
        md += "\n";
    }

    // 2. icon modes on one small tree
    const tree = [
        { depth: 0, name: "SavesV2", folder: true, open: true, rollup: { done: 2, counted: 5 } },
        { depth: 1, name: "decisions", folder: true, open: true },
        { depth: 2, name: "SAVE-OD-1_Compression.md", profile: "decision", status: "open", dir: "d" },
        { depth: 2, name: "SAVE-OD-2_One_File.md", profile: "decision", status: "decided", dir: "d" },
        { depth: 1, name: "spec", folder: true, open: true },
        { depth: 2, name: "01_Saves_v2.md", profile: "spec", status: "living", dir: "s" },
        { depth: 1, name: "tasks", folder: true, open: true },
        { depth: 2, name: "SAVE-V0_Decisions.md", profile: "task", status: "done", dir: "t" },
        { depth: 2, name: "SAVE-V1_Container.md", profile: "task", status: "done", dir: "t" },
        { depth: 2, name: "SAVE-V2_Pieces.md", profile: "task", status: "check", dir: "t" },
        { depth: 2, name: "SAVE-V3_Saving.md", profile: "task", status: "active", dir: "t" },
        { depth: 2, name: "SAVE-V4_Session.md", profile: "task", status: "blocked", dir: "t" },
        { depth: 2, name: "SAVE-V9_Importer.md", profile: "task", status: "dropped", dir: "t" },
        { depth: 1, name: "README.md" },
    ];
    md += `## 2. Icon modes

One folder in each \`recordStatus.iconMode\`. Roll-up and name colours are the same in every mode.

### \`bundled\` — Record Status Icons is the file icon theme

Status icons, name colours. Writes nothing into the workspace.

`;
    write("mode-bundled", tree, "bundled");
    md += pair("mode-bundled", "bundled mode");
    md += `
### \`material\` — Material Icon Theme is the file icon theme

Looks the same as \`bundled\`, but the icons come from \`record-*\` clones written into the
workspace's \`.vscode/settings.json\` on every status change.

### \`badge\` — any icon theme

Files keep their theme icon (here Material's Markdown icon); a glyph after the name carries
the status, in the name colour.

`;
    write("mode-badge", tree, "badge");
    md += pair("mode-badge", "badge mode");
    md += `
### \`off\`

Name colour only.

`;
    write("mode-off", tree, "off");
    md += pair("mode-off", "off mode");

    md += `
### Name colours: \`recordStatus.colorPreset\`

The same folder with each preset. \`default\` is Record Status's own colours. \`theme\` and
\`git\` borrow colours from the active colour theme, so they change with it (shown here as
VS Code's Dark and Light Modern draw them). \`recordStatus.colors\` overrides single slots, and
\`workbench.colorCustomizations\` sets exact hex values for the \`recordStatus.*\` ids.

`;
    for (const preset of Object.keys(core.COLOR_PRESETS)) {
        write(`preset-${preset}`, tree, "bundled", { preset });
        md += `#### \`${preset}\`

${pair(`preset-${preset}`, `${preset} colour preset`)}
`;
    }

    // 3. roll-up
    md += `
## 3. Folder roll-up

The folder above a \`tasks/\` folder shows the share of its tasks that are done: \`0\`…\`99\`,
then \`✓\` with a green name at 100%. \`dropped\` and \`split\` tasks are not counted.

`;
    const rollupRows = [
        { depth: 0, name: "AIV2", folder: false, open: false, rollup: { done: 0, counted: 19 }, note: "0 of 19" },
        { depth: 0, name: "BuildingsV2", folder: false, open: false, rollup: { done: 2, counted: 12 }, note: "2 of 12" },
        { depth: 0, name: "NavLibV2", folder: false, open: false, rollup: { done: 9, counted: 16 }, note: "9 of 16" },
        { depth: 0, name: "PresentationV2", folder: false, open: false, rollup: { done: 7, counted: 8 }, note: "7 of 8" },
        { depth: 0, name: "SavesV2", folder: false, open: false, rollup: { done: 10, counted: 10 }, note: "10 of 10" },
        { depth: 0, name: "UIV2", folder: false, open: false },
    ].map((r) => ({ ...r, folder: true }));
    write("rollup", rollupRows, "bundled");
    md += pair("rollup", "folder roll-up badges");
    md += "\n`UIV2` has no `tasks/` folder yet, so no badge. The grey note is not drawn by VS Code; it is the tooltip text.\n";

    // 4. shared names
    md += `
## 4. Shared file names

Icon themes match by file name, not path. When files with the same name are in different
states, the name gets no status icon and keeps the theme's own; its name colour still shows the
status. Below: the two \`README.md\` files are \`review\` and \`living\` specs, so both keep the
README icon. The two \`02_Build_Order.md\` are both \`living\`, so they keep the status icon.

`;
    const sharedRows = [
        { depth: 0, name: "AIV2", folder: true, open: true },
        { depth: 1, name: "02_Build_Order.md", profile: "spec", status: "living", dir: "a" },
        { depth: 1, name: "README.md", profile: "spec", status: "living", dir: "a" },
        { depth: 0, name: "SavesV2", folder: true, open: true },
        { depth: 1, name: "02_Build_Order.md", profile: "spec", status: "living", dir: "b" },
        { depth: 1, name: "README.md", profile: "spec", status: "review", dir: "b" },
    ];
    write("shared", sharedRows, "bundled");
    md += pair("shared", "shared file names");

    // 5. tooltip
    md += `
## 5. Tooltip

Hovering a record names its kind and status; hovering a roll-up folder gives the count.

`;
    const tipRows = [
        { depth: 0, name: "tasks", folder: true, open: true },
        { depth: 1, name: "SAVE-V2_Pieces.md", profile: "task", status: "check", dir: "t" },
        { depth: 1, name: "SAVE-V3_Saving.md", profile: "task", status: "active", dir: "t" },
    ];
    write("tooltip", tipRows, "bundled", { tooltip: { row: 1, x: 190, text: "Task: Check" } });
    md += pair("tooltip", "tooltip on a task");

    md += `
## 6. Questions to approve

Decided 2026-10-10: specs use \`document\` (a page with lines of text), decisions use
\`routing\` (a signpost: "which way?"). Other shapes can still be tried with the pickers on the
[interactive page](showcase.html).

1. **Default colour preset:** \`default\`, or one of \`theme\`, \`git\`, \`quiet\`,
   \`monochrome\`, \`dark\`, \`none\`?
2. **Shapes per kind:** tasks use a different shape per state (todo, gear, magnifier, verified,
   lock); decisions and specs keep one shape. Keep, or give tasks one shape too?
3. **\`check\` in cyan with a magnifier:** distinct enough from \`active\` (amber gear)?
4. **\`dropped\` reuses the grey todo icon** and \`split\` the diff icon, both dark grey. Fine,
   or should \`dropped\` get its own shape?
5. **Name colours:** open decisions and specs in review are *blue* names with *amber* icons.
   Make the name amber too, or keep blue for "waiting on someone"?
6. **Glyphs in badge mode:** \`·\` for planned and draft is very small. Use \`○\` instead?
7. **Roll-up at 100%:** \`✓\` and a green folder name. Keep the green name?
`;
    fs.writeFileSync(path.join(ROOT, "docs", "showcase.md"), md);
    fs.writeFileSync(path.join(ROOT, "docs", "showcase.html"), showcaseHtml(htmlData()));
    renderHero();
    console.log(`showcase: ${fs.readdirSync(OUT).length} images, docs/showcase.md`);
}

main();
