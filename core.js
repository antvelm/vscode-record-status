// Record Status core: everything that does not need VS Code, so it can be tested with plain Node.
//
// A *record* is a Markdown file matched by a *profile* (a kind of record: task, decision, spec, …).
// Each profile has its own include globs, status pattern and status words, and each status word
// has a *look*: an icon (a Material Icon Theme icon name), its colour, a name colour, a badge, and
// a glyph used when icons are not available.
const path = require("path");
const PALETTE = require("./palette.json");

const DEFAULT_PATTERN = "\\*\\*Status:\\*\\*\\s*([A-Za-z-]+)";
const CLONE_PREFIX = "record-";

/** Profiles used when the user sets none: the layout of tasks/, decisions/ and spec/ folders. */
const DEFAULT_PROFILES = {
    task: {
        include: ["**/tasks/*.md"],
        statuses: {
            planned: { icon: "todo",     iconColor: "gray-500",  nameColor: "recordStatus.planned",    glyph: "·" },
            active:  { icon: "settings", iconColor: "amber-500", nameColor: "recordStatus.inProgress", glyph: "●" },
            check:   { icon: "search",   iconColor: "cyan-500",  nameColor: "recordStatus.check",      glyph: "◐" },
            done:    { icon: "verified", iconColor: "green-500", nameColor: "recordStatus.completed",  glyph: "✓", rollup: "done" },
            blocked: { icon: "lock",     iconColor: "red-500",   nameColor: "recordStatus.blocked",    glyph: "✗" },
            dropped: { icon: "todo",     iconColor: "gray-700",  nameColor: "recordStatus.dropped",    glyph: "–", rollup: "skip" },
            split:   { icon: "diff",     iconColor: "gray-700",  nameColor: "recordStatus.dropped",    glyph: "→", rollup: "skip" },
        },
    },
    decision: {
        include: ["**/decisions/*.md"],
        statuses: {
            open:       { icon: "routing", iconColor: "amber-500", nameColor: "recordStatus.proposed",  glyph: "?" },
            decided:    { icon: "routing", iconColor: "green-500", nameColor: "recordStatus.completed", glyph: "✓" },
            superseded: { icon: "routing", iconColor: "gray-700",  nameColor: "recordStatus.dropped",   glyph: "–" },
            dropped:    { icon: "routing", iconColor: "gray-700",  nameColor: "recordStatus.dropped",   glyph: "–" },
        },
    },
    spec: {
        include: ["**/spec/*.md"],
        statuses: {
            draft:      { icon: "document",     iconColor: "gray-500",      nameColor: "recordStatus.planned",   glyph: "·" },
            review:     { icon: "document",     iconColor: "amber-500",     nameColor: "recordStatus.proposed",  glyph: "?" },
            accepted:   { icon: "document",     iconColor: "green-500",     nameColor: "recordStatus.completed", glyph: "✓" },
            living:     { icon: "document",     iconColor: "blue-500",      nameColor: "recordStatus.living",    glyph: "●" },
            superseded: { icon: "document",     iconColor: "gray-700",      nameColor: "recordStatus.dropped",   glyph: "–" },
            explainer:  { icon: "instructions", iconColor: "blue-gray-500", nameColor: "",                       glyph: "" },
        },
    },
    reference: {
        include: ["**/assessments/*.md"],
        statuses: {
            research:   { icon: "bibliography", iconColor: "green-500",     nameColor: "", glyph: "" },
            assessment: { icon: "lighthouse",   iconColor: "green-500",     nameColor: "", glyph: "" },
            explainer:  { icon: "instructions", iconColor: "blue-gray-500", nameColor: "", glyph: "" },
        },
    },
};

/**
 * Name-colour presets (`recordStatus.colorPreset`). A look names a colour slot as
 * `recordStatus.<slot>`; a preset maps each slot to a theme colour id, or to "" for no colour.
 * "default" keeps the extension's own colours, which `workbench.colorCustomizations` can retune.
 */
const COLOR_SLOTS = ["planned", "inProgress", "check", "completed", "blocked", "living", "dropped", "proposed"];
const COLOR_PRESETS = {
    default: Object.fromEntries(COLOR_SLOTS.map((s) => [s, `recordStatus.${s}`])),
    // Follows the active colour theme's own palette.
    theme: {
        planned: "descriptionForeground", inProgress: "charts.yellow", check: "terminal.ansiCyan", completed: "charts.green",
        blocked: "charts.red", living: "charts.blue", dropped: "disabledForeground", proposed: "charts.purple",
    },
    // The colours git uses in the Explorer: modified, added, deleted, ignored.
    git: {
        planned: "", inProgress: "gitDecoration.modifiedResourceForeground", check: "terminal.ansiCyan",
        completed: "gitDecoration.addedResourceForeground", blocked: "gitDecoration.deletedResourceForeground",
        living: "gitDecoration.submoduleResourceForeground", dropped: "gitDecoration.ignoredResourceForeground",
        proposed: "charts.purple",
    },
    // Colour only what needs attention: active, check, blocked, open or in review.
    quiet: {
        planned: "", inProgress: "recordStatus.inProgress", check: "recordStatus.check", completed: "",
        blocked: "recordStatus.blocked", living: "", dropped: "recordStatus.dropped", proposed: "recordStatus.proposed",
    },
    // Shades of grey: attention brightest, done mid, dropped dimmest.
    monochrome: Object.fromEntries(COLOR_SLOTS.map((s) => [s, `recordStatus.mono.${s}`])),
    // Deeper, muted versions of the default colours.
    dark: Object.fromEntries(COLOR_SLOTS.map((s) => [s, `recordStatus.dark.${s}`])),
    none: Object.fromEntries(COLOR_SLOTS.map((s) => [s, ""])),
};

/**
 * The theme colour id a look's `nameColor` resolves to, or "" for none. `recordStatus.<slot>`
 * goes through `overrides[slot]` (`recordStatus.colors`) first, then the preset; any other id is
 * used as it is.
 */
function resolveNameColor(nameColor, preset = "default", overrides = {}) {
    if (!nameColor) { return ""; }
    const m = /^recordStatus\.(\w+)$/.exec(nameColor);
    if (!m || !COLOR_SLOTS.includes(m[1])) { return nameColor; }
    if (overrides && typeof overrides[m[1]] === "string") { return overrides[m[1]]; }
    const table = COLOR_PRESETS[preset] || COLOR_PRESETS.default;
    return table[m[1]];
}

/** Minimal glob -> RegExp for `*`, `**`, `?` and `[...]`, matched against a forward-slash path. */
function globToRegExp(glob) {
    let re = "";
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === "*") {
            if (glob[i + 1] === "*") {
                i++;
                // "**/" also matches no folder at all.
                if (glob[i + 1] === "/") { i++; re += "(?:.*/)?"; } else { re += ".*"; }
            } else {
                re += "[^/]*";
            }
        } else if (c === "?") {
            re += "[^/]";
        } else if (c === "[") {
            const end = glob.indexOf("]", i);
            if (end < 0) { re += "\\["; continue; }
            re += glob.slice(i, end + 1);
            i = end;
        } else {
            re += c.replace(/[.+^${}()|\\]/g, "\\$&");
        }
    }
    return new RegExp("^" + re + "$", "i");
}

function compilePattern(source, fallback) {
    try {
        return new RegExp(source || fallback || DEFAULT_PATTERN);
    } catch {
        return new RegExp(fallback || DEFAULT_PATTERN);
    }
}

function lowerKeys(statuses) {
    const out = {};
    for (const [key, look] of Object.entries(statuses || {})) { out[key.toLowerCase()] = look || {}; }
    return out;
}

/**
 * The profiles in effect, as an ordered list. `profiles` (the setting) wins when it has entries;
 * otherwise explicitly set 0.2 settings (`include`, `statuses`) act as one profile named "default";
 * otherwise the built-in profiles apply.
 */
function resolveProfiles({ profiles, legacy, statusPattern } = {}) {
    if (profiles && Object.keys(profiles).length) {
        return Object.entries(profiles).map(([name, p]) => makeProfile(name, p || {}, statusPattern));
    }
    if (legacy && (legacy.include || legacy.statuses)) {
        return [makeProfile("default", { include: legacy.include, statuses: legacy.statuses || {} }, statusPattern)];
    }
    return Object.entries(DEFAULT_PROFILES).map(([name, p]) => makeProfile(name, p, statusPattern));
}

/** A profile named like a built-in one inherits its include globs and statuses when it sets none. */
function makeProfile(name, p, statusPattern) {
    const builtIn = DEFAULT_PROFILES[name] || {};
    const include = p.include || builtIn.include || [];
    return {
        name,
        include,
        matchers: include.map(globToRegExp),
        pattern: compilePattern(p.statusPattern, statusPattern),
        statuses: lowerKeys(p.statuses || builtIn.statuses),
    };
}

/** The first profile whose globs match a workspace-relative, forward-slash path, or undefined. */
function profileFor(relPath, profiles) {
    return profiles.find((p) => p.matchers.some((m) => m.test(relPath)));
}

/** The status word in a file's text: the first capture group, trimmed, lower-cased, " by …" dropped. */
function readStatus(text, pattern) {
    const m = pattern.exec(text);
    if (!m || !m[1]) { return null; }
    return m[1].trim().toLowerCase().split(" by ")[0].trim();
}

/** The look of a record, or undefined when its status is not one of its profile's words. */
function lookOf(record, profilesByName) {
    const profile = profilesByName[record.profile];
    return record.status && profile ? profile.statuses[record.status] : undefined;
}

/** Icon id for a (profile, status): `record-<profile>-<status>`; the 0.2 "default" profile keeps `record-<status>`. */
function iconId(profile, status) {
    const s = status.replace(/\s+/g, "-");
    return CLONE_PREFIX + (profile === "default" ? s : `${profile}-${s}`);
}

/**
 * Groups records that get an icon by file name. A name shared by records in different
 * (profile, status) pairs cannot carry one icon, so it goes into `shared` instead.
 * Returns { byId: { iconId: { profile, status, look, names: [...] } }, shared: [names] }.
 */
function iconGroups(records, profilesByName) {
    const byName = new Map();
    for (const r of records) {
        const look = lookOf(r, profilesByName);
        if (!look || !look.icon) { continue; }
        const name = path.basename(r.fsPath).toLowerCase();
        const id = iconId(r.profile, r.status);
        if (!byName.has(name)) { byName.set(name, new Map()); }
        byName.get(name).set(id, { profile: r.profile, status: r.status, look });
    }
    const byId = {};
    const shared = [];
    for (const [name, ids] of byName) {
        if (ids.size > 1) { shared.push(name); continue; }
        const [[id, g]] = ids;
        (byId[id] = byId[id] || { ...g, names: [] }).names.push(name);
    }
    for (const g of Object.values(byId)) { g.names.sort(); }
    return { byId, shared: shared.sort() };
}

/** Material Icon Theme `customClones`: the user's own clones kept, ours rebuilt from the records. */
function buildClones(current, groups) {
    const kept = (current || []).filter((c) => !(c && typeof c.name === "string" && c.name.startsWith(CLONE_PREFIX)));
    const ours = Object.keys(groups.byId).sort().map((id) => {
        const g = groups.byId[id];
        const clone = { name: id, base: g.look.icon, fileNames: g.names };
        if (g.look.iconColor) { clone.color = g.look.iconColor; }
        return clone;
    });
    return kept.concat(ours);
}

/** A palette name ("amber-500", "gray-500"/"grey-500") or a hex colour, as lower-case hex; else null. */
function resolveColor(color) {
    if (!color) { return null; }
    const c = String(color).trim().toLowerCase();
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(c)) { return c; }
    return PALETTE[c] || PALETTE[c.replace(/grey/g, "gray")] || null;
}

/** An SVG with every fill and stroke colour replaced by one colour ("none" and "currentColor" kept). */
function recolorSvg(svg, hex) {
    return svg
        .replace(/(fill|stroke)="(?!none")(?!currentColor")[^"]*"/gi, `$1="${hex}"`)
        .replace(/(fill|stroke):\s*(?!none)(?!currentColor)[^;"]+/gi, `$1:${hex}`);
}

/**
 * The bundled icon theme: Material Icon Theme's manifest plus one icon definition per
 * (profile, status) in use and a file-name entry per record name. `svgPathFor(id)` is the path of
 * the recoloured SVG, relative to the manifest.
 */
function buildThemeManifest(base, groups, svgPathFor) {
    const manifest = JSON.parse(JSON.stringify(base));
    manifest.iconDefinitions = manifest.iconDefinitions || {};
    manifest.fileNames = manifest.fileNames || {};
    for (const id of Object.keys(groups.byId).sort()) {
        manifest.iconDefinitions[id] = { iconPath: svgPathFor(id) };
        for (const name of groups.byId[id].names) {
            manifest.fileNames[name] = id;
            // Light and high-contrast sections override some names; ours must win there too.
            for (const section of ["light", "highContrast"]) {
                if (manifest[section] && manifest[section].fileNames) { manifest[section].fileNames[name] = id; }
            }
        }
    }
    return manifest;
}

/**
 * Roll-up counts per folder: { folderPath: { done, counted } }. Records of the listed profiles
 * count, except statuses whose look says `rollup: "skip"`; `rollup: "done"` counts as done.
 * A record rolls up into every folder that `folderOf(relPath)` returns.
 */
function rollup(records, profilesByName, { profiles: countedProfiles = [] } = {}, foldersOf) {
    const out = new Map();
    for (const r of records) {
        if (countedProfiles.length && !countedProfiles.includes(r.profile)) { continue; }
        const look = lookOf(r, profilesByName) || {};
        if (look.rollup === "skip") { continue; }
        for (const folder of foldersOf(r)) {
            const c = out.get(folder) || { done: 0, counted: 0 };
            c.counted++;
            if (look.rollup === "done") { c.done++; }
            out.set(folder, c);
        }
    }
    return out;
}

/** The two-character roll-up badge: "0"…"99", or "✓" when everything counted is done. */
function rollupBadge({ done, counted }) {
    if (!counted) { return undefined; }
    if (done >= counted) { return "✓"; }
    return String(Math.floor((100 * done) / counted));
}

/**
 * Automatic roll-up folders for a record: the folder above the record's own folder, e.g.
 * `docs/SavesV2/tasks/SAVE-V0.md` rolls up into `docs/SavesV2`. With globs, every ancestor folder
 * that matches one of them.
 */
function rollupFolders(relPath, folderMatchers) {
    const parts = relPath.split("/");
    if (!folderMatchers || !folderMatchers.length) {
        return parts.length >= 3 ? [parts.slice(0, -2).join("/")] : [];
    }
    const out = [];
    for (let i = 1; i < parts.length; i++) {
        const folder = parts.slice(0, i).join("/");
        if (folderMatchers.some((m) => m.test(folder))) { out.push(folder); }
    }
    return out;
}

module.exports = {
    CLONE_PREFIX,
    COLOR_PRESETS,
    COLOR_SLOTS,
    DEFAULT_PATTERN,
    DEFAULT_PROFILES,
    globToRegExp,
    resolveProfiles,
    profileFor,
    readStatus,
    lookOf,
    iconId,
    iconGroups,
    buildClones,
    resolveColor,
    resolveNameColor,
    recolorSvg,
    buildThemeManifest,
    rollup,
    rollupBadge,
    rollupFolders,
};
