// Plain Node tests for core.js: `npm test` (node --test).
const test = require("node:test");
const assert = require("node:assert");
const core = require("../core");

const profiles = core.resolveProfiles({});
const byName = Object.fromEntries(profiles.map((p) => [p.name, p]));
const rec = (fsPath, profile, status) => ({ fsPath, rel: fsPath, profile, status });

test("globToRegExp: ** spans folders, also none; * stays in one folder", () => {
    const g = core.globToRegExp("**/tasks/*.md");
    assert.ok(g.test("tasks/A.md"));
    assert.ok(g.test("docs/SavesV2/tasks/SAVE-V0_Container.md"));
    assert.ok(!g.test("docs/tasks/sub/A.md"));
    assert.ok(!g.test("docs/subtasks/A.md"));
    assert.ok(core.globToRegExp("doc/tasks/[0-9][0-9][0-9]-*.md").test("doc/tasks/001-x.md"));
    assert.ok(core.globToRegExp("docs/**").test("docs/a/b.md"));
});

test("resolveProfiles: setting wins, then 0.2 settings as 'default', then the built-ins", () => {
    assert.deepStrictEqual(profiles.map((p) => p.name), ["task", "decision", "spec", "reference"]);
    const legacy = core.resolveProfiles({ legacy: { include: ["doc/*.md"], statuses: { Planned: { icon: "todo" } } } });
    assert.strictEqual(legacy.length, 1);
    assert.strictEqual(legacy[0].name, "default");
    assert.ok(legacy[0].statuses.planned);
    const own = core.resolveProfiles({ profiles: { a: { include: ["x/*.md"] } }, legacy: { include: ["doc/*.md"] } });
    assert.deepStrictEqual(own.map((p) => p.name), ["a"]);
});

test("resolveProfiles: a built-in name inherits statuses and include it does not set", () => {
    const [task, other] = core.resolveProfiles({ profiles: { task: { include: ["docs/*/tasks/*.md"] }, other: {} } });
    assert.deepStrictEqual(task.include, ["docs/*/tasks/*.md"]);
    assert.ok(task.statuses.check && task.statuses.done.rollup === "done");
    assert.deepStrictEqual(other.include, []);
    assert.deepStrictEqual(other.statuses, {});
    const [own] = core.resolveProfiles({ profiles: { task: { statuses: { x: {} } } } });
    assert.deepStrictEqual(Object.keys(own.statuses), ["x"]);
    assert.deepStrictEqual(own.include, ["**/tasks/*.md"]);
});

test("profileFor: the first matching profile owns the file", () => {
    const ps = core.resolveProfiles({ profiles: { first: { include: ["docs/**/*.md"] }, second: { include: ["docs/tasks/*.md"] } } });
    assert.strictEqual(core.profileFor("docs/tasks/A.md", ps).name, "first");
    assert.strictEqual(core.profileFor("other/A.md", ps), undefined);
    assert.strictEqual(core.profileFor("x/decisions/D.md", profiles).name, "decision");
});

test("readStatus: first word, lower-cased, ' by …' dropped", () => {
    const one = new RegExp(core.DEFAULT_PATTERN);
    assert.strictEqual(core.readStatus("# T\n\n**Status:** Active\n", one), "active");
    assert.strictEqual(core.readStatus("**Status:** read-only. Facts.", one), "read-only");
    assert.strictEqual(core.readStatus("no status here", one), null);
    assert.strictEqual(core.readStatus("**Status:** Superseded by 004", /\*\*Status:\*\*\s*([^·\n]+)/), "superseded");
});

test("iconGroups: one group per (profile, status); a name in two states gets no icon", () => {
    const g = core.iconGroups([
        rec("a/tasks/T1.md", "task", "done"),
        rec("b/tasks/T2.md", "task", "done"),
        rec("a/decisions/D1.md", "decision", "open"),
        rec("a/spec/README.md", "spec", "draft"),
        rec("b/spec/README.md", "spec", "living"),
        rec("c/spec/x.md", "spec", "nonsense"),
    ], byName);
    assert.deepStrictEqual(Object.keys(g.byId).sort(), ["record-decision-open", "record-task-done"]);
    assert.deepStrictEqual(g.byId["record-task-done"].names, ["t1.md", "t2.md"]);
    assert.deepStrictEqual(g.shared, ["readme.md"]);
    // The same name in the same state keeps its icon.
    const same = core.iconGroups([rec("a/spec/README.md", "spec", "draft"), rec("b/spec/README.md", "spec", "draft")], byName);
    assert.deepStrictEqual(same.byId["record-spec-draft"].names, ["readme.md"]);
});

test("iconId: the 0.2 default profile keeps record-<status>", () => {
    assert.strictEqual(core.iconId("default", "in progress"), "record-in-progress");
    assert.strictEqual(core.iconId("task", "done"), "record-task-done");
});

test("buildClones: other clones kept, ours rebuilt and sorted", () => {
    const g = core.iconGroups([rec("a/tasks/T1.md", "task", "active"), rec("a/tasks/T0.md", "task", "planned")], byName);
    const current = [{ name: "mine", base: "todo", fileNames: ["x"] }, { name: "record-old", base: "lock", fileNames: ["y"] }];
    const next = core.buildClones(current, g);
    assert.deepStrictEqual(next.map((c) => c.name), ["mine", "record-task-active", "record-task-planned"]);
    assert.deepStrictEqual(next[1], { name: "record-task-active", base: "settings", fileNames: ["t1.md"], color: "amber-500" });
    assert.deepStrictEqual(core.buildClones(current, { byId: {} }).map((c) => c.name), ["mine"]);
});

test("resolveColor: palette names (gray and grey), hex, unknown", () => {
    assert.strictEqual(core.resolveColor("amber-500"), "#ffc107");
    assert.strictEqual(core.resolveColor("grey-500"), core.resolveColor("gray-500"));
    assert.strictEqual(core.resolveColor("blue-gray-500"), "#607d8b");
    assert.strictEqual(core.resolveColor("#ABC"), "#abc");
    assert.strictEqual(core.resolveColor("nope-500"), null);
    assert.strictEqual(core.resolveColor(""), null);
});

test("recolorSvg: fills and strokes recoloured, none kept", () => {
    const svg = '<svg fill="none"><path fill="#7cb342" stroke="#000"/><path style="fill:#123456;stroke:none"/></svg>';
    assert.strictEqual(core.recolorSvg(svg, "#ff0000"),
        '<svg fill="none"><path fill="#ff0000" stroke="#ff0000"/><path style="fill:#ff0000;stroke:none"/></svg>');
});

test("buildThemeManifest: adds definitions and names, light section too, base untouched", () => {
    const base = { iconDefinitions: { file: { iconPath: "./icons/file.svg" } }, fileNames: { "readme.md": "readme" }, light: { fileNames: {} } };
    const g = core.iconGroups([rec("a/tasks/T1.md", "task", "done")], byName);
    const m = core.buildThemeManifest(base, g, (id) => `./generated/${id}.svg`);
    assert.deepStrictEqual(m.iconDefinitions["record-task-done"], { iconPath: "./generated/record-task-done.svg" });
    assert.strictEqual(m.fileNames["t1.md"], "record-task-done");
    assert.strictEqual(m.light.fileNames["t1.md"], "record-task-done");
    assert.strictEqual(m.fileNames["readme.md"], "readme");
    assert.strictEqual(base.fileNames["t1.md"], undefined);
});

test("rollup: done and skip, only counted profiles, per folder", () => {
    const records = [
        rec("d/SavesV2/tasks/A.md", "task", "done"),
        rec("d/SavesV2/tasks/B.md", "task", "active"),
        rec("d/SavesV2/tasks/C.md", "task", "dropped"),
        rec("d/SavesV2/tasks/D.md", "task", "typo"),
        rec("d/SavesV2/decisions/X.md", "decision", "decided"),
        rec("d/AIV2/tasks/E.md", "task", "done"),
    ];
    const foldersOf = (r) => core.rollupFolders(r.rel, []);
    const counts = core.rollup(records, byName, { profiles: ["task"] }, foldersOf);
    assert.deepStrictEqual(counts.get("d/SavesV2"), { done: 1, counted: 3 });
    assert.deepStrictEqual(counts.get("d/AIV2"), { done: 1, counted: 1 });
    assert.strictEqual(counts.size, 2);
});

test("rollupBadge: 0…99, ✓ at 100%, none when nothing counts", () => {
    assert.strictEqual(core.rollupBadge({ done: 0, counted: 4 }), "0");
    assert.strictEqual(core.rollupBadge({ done: 999, counted: 1000 }), "99");
    assert.strictEqual(core.rollupBadge({ done: 1, counted: 3 }), "33");
    assert.strictEqual(core.rollupBadge({ done: 4, counted: 4 }), "✓");
    assert.strictEqual(core.rollupBadge({ done: 0, counted: 0 }), undefined);
});

test("rollupFolders: automatic is the folder above; globs match ancestors", () => {
    assert.deepStrictEqual(core.rollupFolders("docs/SavesV2/tasks/A.md", []), ["docs/SavesV2"]);
    assert.deepStrictEqual(core.rollupFolders("tasks/A.md", []), []);
    assert.deepStrictEqual(core.rollupFolders("docs/SavesV2/tasks/A.md", [core.globToRegExp("docs/*"), core.globToRegExp("docs")]),
        ["docs", "docs/SavesV2"]);
});

test("default looks use icons and colours that exist", () => {
    for (const p of Object.values(core.DEFAULT_PROFILES)) {
        for (const [word, look] of Object.entries(p.statuses)) {
            assert.ok(core.resolveColor(look.iconColor), `${word}: colour ${look.iconColor}`);
            assert.ok(!look.glyph || look.glyph.length <= 2, `${word}: glyph too long`);
        }
    }
});

test("resolveNameColor: presets, overrides, other ids pass through", () => {
    assert.strictEqual(core.DEFAULT_COLOR_PRESET, "git");
    assert.strictEqual(core.resolveNameColor("mdStatus.completed"), "gitDecoration.addedResourceForeground");
    assert.strictEqual(core.resolveNameColor("mdStatus.completed", "classic"), "mdStatus.completed");
    assert.strictEqual(core.resolveNameColor("mdStatus.completed", "theme"), "charts.green");
    assert.strictEqual(core.resolveNameColor("mdStatus.completed", "quiet"), "");
    assert.strictEqual(core.resolveNameColor("mdStatus.blocked", "none"), "");
    assert.strictEqual(core.resolveNameColor("mdStatus.blocked", "git", { blocked: "errorForeground" }), "errorForeground");
    assert.strictEqual(core.resolveNameColor("mdStatus.completed", "classic", { completed: "" }), "");
    assert.strictEqual(core.resolveNameColor("charts.red", "none"), "charts.red");
    assert.strictEqual(core.resolveNameColor("mdStatus.unknown", "none"), "mdStatus.unknown");
    assert.strictEqual(core.resolveNameColor("", "theme"), "");
    assert.strictEqual(core.resolveNameColor("mdStatus.check", "nonsense"), "terminal.ansiCyan");
    for (const [name, table] of Object.entries(core.COLOR_PRESETS)) {
        assert.deepStrictEqual(Object.keys(table).sort(), [...core.COLOR_SLOTS].sort(), name);
    }
});

test("presetLooks: monochrome greys every icon, per theme; other presets unchanged", () => {
    assert.strictEqual(core.presetLooks(byName, "default"), byName);
    const mono = core.presetLooks(byName, "monochrome");
    const active = mono.task.statuses.active;
    assert.deepStrictEqual([active.iconColor, active.iconColorLight], ["#eeeeee", "#212121"]);
    assert.strictEqual(mono.task.statuses.active.icon, "settings");
    assert.deepStrictEqual([mono.reference.statuses.research.iconColor, mono.reference.statuses.research.iconColorLight], ["#9e9e9e", "#616161"]);
    assert.strictEqual(byName.task.statuses.active.iconColor, "amber-500");
    for (const p of Object.values(mono)) {
        for (const look of Object.values(p.statuses)) {
            for (const hex of [look.iconColor, look.iconColorLight]) {
                const [r, g, b] = [1, 3, 5].map((i) => hex.slice(i, i + 2));
                assert.ok(r === g && g === b, `${hex} is not grey`);
            }
        }
    }
});

test("light-theme icon colours: a second icon in the manifest, lightColor on the clone", () => {
    const mono = core.presetLooks(byName, "monochrome");
    const g = core.iconGroups([rec("a/tasks/T1.md", "task", "done")], mono);
    const m = core.buildThemeManifest({ iconDefinitions: {}, fileNames: {}, light: { fileNames: {} } }, g, (id) => `./generated/${id}.svg`);
    assert.strictEqual(m.fileNames["t1.md"], "record-task-done");
    assert.strictEqual(m.light.fileNames["t1.md"], "record-task-done_light");
    assert.deepStrictEqual(m.iconDefinitions["record-task-done_light"], { iconPath: "./generated/record-task-done_light.svg" });
    const [clone] = core.buildClones([], g);
    assert.deepStrictEqual([clone.color, clone.lightColor], ["#9e9e9e", "#616161"]);
});

test("greySvg: every hex colour becomes the grey of its luminance", () => {
    assert.strictEqual(core.greySvg('<path fill="#42a5f5"/><path fill="#FFF"/><g style="fill:#000000"/>'),
        '<path fill="#969696"/><path fill="#ffffff"/><g style="fill:#000000"/>');
    assert.strictEqual(core.greySvg('<path fill="none" d="M0 0h24"/>'), '<path fill="none" d="M0 0h24"/>');
});
