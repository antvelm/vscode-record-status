// Record Status: shows the status written inside a Markdown file on that file in the Explorer.
//
// The status read from each file drives:
//  - a FileDecoration (name colour, tooltip, optional badge), the API git uses for "M";
//  - the file icon, in one of these ways (`recordStatus.iconMode`):
//      bundled  - this extension's own file icon theme, "Record Status Icons": Material Icon
//                 Theme's icons copied in at build time, plus one recoloured icon per status. The
//                 theme manifest in the extension folder is rewritten when statuses change, and VS
//                 Code reloads it (`_watch` in package.json). Writes nothing into the workspace.
//      material - Material Icon Theme `customClones` in the workspace settings, as in 0.2.
//      badge    - no icon; a coloured glyph after the name.
//  - a roll-up badge on folders: the percentage of their tasks that are done.
//
// File names are never touched, so links to the files stay valid. The logic that needs no VS Code
// is in core.js.
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const core = require("./core");

const MATERIAL = "PKief.material-icon-theme";
const MATERIAL_THEME = "material-icon-theme";
const BUNDLED_THEME = "record-status-icons";
const PROMPTED_KEY = "recordStatus.iconPromptShown";

function explicit(config, key) {
    const i = config.inspect(key) || {};
    return i.workspaceFolderValue ?? i.workspaceValue ?? i.globalValue;
}

/** Reads the extension's settings into one object. */
function settings() {
    const config = vscode.workspace.getConfiguration("recordStatus");
    const profiles = core.resolveProfiles({
        profiles: config.get("profiles"),
        legacy: { include: explicit(config, "include"), statuses: explicit(config, "statuses") },
        statusPattern: config.get("statusPattern"),
    });
    const colorPreset = config.get("colorPreset") || core.DEFAULT_COLOR_PRESET;
    // Some presets (monochrome) also recolour the icons.
    const byName = core.presetLooks(Object.fromEntries(profiles.map((p) => [p.name, p])), colorPreset);
    let iconMode = config.get("iconMode") || "auto";
    if (config.get("icons") === false) { iconMode = "off"; }
    const rollup = config.get("rollup") || {};
    return {
        profiles,
        byName,
        iconMode,
        colorPreset,
        colorOverrides: config.get("colors") || {},
        rollup: {
            enabled: rollup.enabled !== false,
            profiles: rollup.profiles || ["task"],
            folderMatchers: (rollup.folders || []).map(core.globToRegExp),
            nameColor: rollup.nameColor === undefined ? "recordStatus.completed" : rollup.nameColor,
        },
    };
}

function relPathOf(uri) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) { return null; }
    return { folder, rel: path.relative(folder.uri.fsPath, uri.fsPath).split(path.sep).join("/") };
}

function readFileStatus(fsPath, pattern) {
    try {
        return core.readStatus(fs.readFileSync(fsPath, "utf8"), pattern);
    } catch {
        return null;
    }
}

function titleCase(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

class RecordStatus {
    constructor(context, log) {
        this._context = context;
        this._log = log;
        this._emitter = new vscode.EventEmitter();
        this.onDidChangeFileDecorations = this._emitter.event;
        /** fsPath -> { fsPath, rel, folder, profile, status } for every matched file. */
        this._records = new Map();
        /** folder fsPath -> { done, counted } */
        this._rollup = new Map();
        this._settings = settings();
        this._mode = "badge";
        this._pending = undefined;
        this._lastShared = "";
        this._themeDir = path.join(context.extensionPath, "theme");
    }

    /** The icon mode in effect: the setting, resolved against the active icon theme. */
    effectiveMode() {
        const mode = this._settings.iconMode;
        const theme = vscode.workspace.getConfiguration("workbench").get("iconTheme");
        const materialActive = theme === MATERIAL_THEME && !!vscode.extensions.getExtension(MATERIAL);
        switch (mode) {
            case "off": return "off";
            case "badge": return "badge";
            case "material": return "material";
            case "bundled": return theme === BUNDLED_THEME ? "bundled" : "badge";
            default:
                if (theme === BUNDLED_THEME) { return "bundled"; }
                return materialActive ? "material" : "badge";
        }
    }

    /** Finds every matched file and reads its status, then refreshes everything that shows it. */
    async rescan() {
        this._settings = settings();
        this._mode = this.effectiveMode();
        const found = new Map();
        const globs = new Set(this._settings.profiles.flatMap((p) => p.include));
        for (const glob of globs) {
            for (const uri of await vscode.workspace.findFiles(glob, null)) {
                if (found.has(uri.fsPath)) { continue; }
                const record = this.recordFor(uri);
                if (record) { found.set(uri.fsPath, record); }
            }
        }
        this._records = found;
        this.recomputeRollup();
        this._emitter.fire(undefined);
        await this.applyIcons();
        this.maybePrompt();
    }

    /** A record for a file, or null when no profile matches it. */
    recordFor(uri) {
        const where = relPathOf(uri);
        if (!where) { return null; }
        const profile = core.profileFor(where.rel, this._settings.profiles);
        if (!profile) { return null; }
        return {
            fsPath: uri.fsPath,
            rel: where.rel,
            folder: where.folder.uri.fsPath,
            profile: profile.name,
            status: readFileStatus(uri.fsPath, profile.pattern),
        };
    }

    /** Re-reads one file after it changed. */
    update(uri) {
        const record = this.recordFor(uri);
        if (!record) { return; }
        const before = this._records.get(uri.fsPath);
        if (before && before.status === record.status && before.profile === record.profile) { return; }
        this._records.set(uri.fsPath, record);
        this._emitter.fire([uri, ...this.recomputeRollup()]);
        this.scheduleIcons();
    }

    /** Rebuilds the roll-up counts; returns the folder URIs whose badge may have changed. */
    recomputeRollup() {
        const old = this._rollup;
        const r = this._settings.rollup;
        if (!r.enabled) {
            this._rollup = new Map();
        } else {
            const foldersOf = (rec) =>
                core.rollupFolders(rec.rel, r.folderMatchers).map((f) => path.join(rec.folder, ...f.split("/")));
            this._rollup = core.rollup([...this._records.values()], this._settings.byName, r, foldersOf);
        }
        const keys = new Set([...old.keys(), ...this._rollup.keys()]);
        return [...keys].map((k) => vscode.Uri.file(k));
    }

    provideFileDecoration(uri) {
        if (uri.scheme !== "file") { return undefined; }
        const record = this._records.get(uri.fsPath);
        if (record) { return this.recordDecoration(record); }
        const counts = this._rollup.get(uri.fsPath);
        if (counts) { return this.folderDecoration(counts); }
        return undefined;
    }

    recordDecoration(record) {
        const look = core.lookOf(record, this._settings.byName);
        if (!look) { return undefined; }
        let badge = look.badge || undefined;
        if (!badge && this._mode === "badge" && look.glyph) { badge = look.glyph; }
        const tooltip = `${titleCase(record.profile)}: ${titleCase(record.status)}`;
        return new vscode.FileDecoration(badge, tooltip, this.themeColor(look.nameColor));
    }

    folderDecoration(counts) {
        const badge = core.rollupBadge(counts);
        if (!badge) { return undefined; }
        const complete = counts.done >= counts.counted;
        const color = complete ? this.themeColor(this._settings.rollup.nameColor) : undefined;
        return new vscode.FileDecoration(badge, `${counts.done} of ${counts.counted} done`, color);
    }

    /** A look's name colour through the colour preset and overrides, as a ThemeColor or undefined. */
    themeColor(nameColor) {
        const id = core.resolveNameColor(nameColor, this._settings.colorPreset, this._settings.colorOverrides);
        return id ? new vscode.ThemeColor(id) : undefined;
    }

    scheduleIcons() {
        clearTimeout(this._pending);
        this._pending = setTimeout(() => this.applyIcons().catch((e) => this._log.appendLine(`icons: ${e}`)), 300);
    }

    /** Brings the icons in line with the records for the current mode. */
    async applyIcons() {
        const groups = core.iconGroups([...this._records.values()], this._settings.byName);
        const shared = groups.shared.join(", ");
        if (shared && shared !== this._lastShared) {
            this._log.appendLine(`No status icon for file names used by records in different states: ${shared}`);
        }
        this._lastShared = shared;

        // Material clones live in the workspace settings: write them only in material mode, and
        // remove ours once when another mode takes over.
        await this.syncClones(this._mode === "material" ? groups : { byId: {} });
        if (this._settings.iconMode !== "off") {
            try {
                this.writeBundledTheme(groups);
            } catch (e) {
                this._log.appendLine(`bundled theme: ${e}`);
            }
        }
    }

    async syncClones(groups) {
        if (!vscode.extensions.getExtension(MATERIAL)) { return; }
        const config = vscode.workspace.getConfiguration("material-icon-theme.files");
        const current = (config.inspect("customClones") || {}).workspaceValue;
        const next = core.buildClones(current || [], groups);
        if (JSON.stringify(next) === JSON.stringify(current || [])) { return; }
        await config.update("customClones", next.length ? next : undefined, vscode.ConfigurationTarget.Workspace);
    }

    /** Rewrites the bundled theme manifest and its recoloured status icons, when they changed. */
    writeBundledTheme(groups) {
        const basePath = path.join(this._themeDir, "material-icons.base.json");
        if (!fs.existsSync(basePath)) { return; }
        if (!this._base) { this._base = JSON.parse(fs.readFileSync(basePath, "utf8")); }
        const generated = path.join(this._themeDir, "generated");
        fs.mkdirSync(generated, { recursive: true });
        for (const [id, g] of Object.entries(groups.byId)) {
            // Look the icon up in the manifest: Material keeps derived icons as "<name>.clone.svg".
            const def = this._base.iconDefinitions[g.look.icon];
            const source = def && path.join(this._themeDir, def.iconPath);
            if (!source || !fs.existsSync(source)) {
                this._log.appendLine(`bundled theme: no icon "${g.look.icon}" (status ${g.profile}/${g.status})`);
                continue;
            }
            const hex = core.resolveColor(g.look.iconColor);
            if (g.look.iconColor && !hex) {
                this._log.appendLine(`bundled theme: unknown colour "${g.look.iconColor}" (status ${g.profile}/${g.status})`);
            }
            const svg = fs.readFileSync(source, "utf8");
            writeIfChanged(path.join(generated, `${id}.svg`), hex ? core.recolorSvg(svg, hex) : svg);
            const light = core.resolveColor(g.look.iconColorLight);
            if (light) { writeIfChanged(path.join(generated, `${id}_light.svg`), core.recolorSvg(svg, light)); }
        }
        const base = core.GREYSCALE_PRESETS.includes(this._settings.colorPreset) ? this.greyBase() : this._base;
        const manifest = core.buildThemeManifest(base, groups, (id) => `./generated/${id}.svg`);
        writeIfChanged(path.join(this._themeDir, "record-status-icons.json"), JSON.stringify(manifest));
    }

    /**
     * The base manifest pointing at greyscale copies of every icon in theme/grey/, so a
     * monochrome Explorer has no colour left (folders and other files included). The copies are
     * written once.
     */
    greyBase() {
        if (this._greyBase) { return this._greyBase; }
        const grey = path.join(this._themeDir, "grey");
        fs.mkdirSync(grey, { recursive: true });
        const base = JSON.parse(JSON.stringify(this._base));
        for (const def of Object.values(base.iconDefinitions)) {
            const file = path.basename(def.iconPath);
            const target = path.join(grey, file);
            if (!fs.existsSync(target)) {
                fs.writeFileSync(target, core.greySvg(fs.readFileSync(path.join(this._themeDir, def.iconPath), "utf8")));
            }
            def.iconPath = `./grey/${file}`;
        }
        this._greyBase = base;
        return base;
    }

    /** Once per user: offer an icon source when records exist but only badges can be shown. */
    maybePrompt() {
        if (!this._records.size || this._mode !== "badge" || this._settings.iconMode === "badge") { return; }
        const state = this._context.globalState;
        if (state.get(PROMPTED_KEY)) { return; }
        state.update(PROMPTED_KEY, true);
        const use = "Use Record Status Icons";
        const badges = "Badges only";
        vscode.window.showInformationMessage(
            "Record Status: show each record's status as its Explorer icon? This switches your file icon theme to Record Status Icons (Material Icon Theme's icons plus status icons).",
            use, badges,
        ).then((choice) => {
            if (choice === use) {
                vscode.workspace.getConfiguration("workbench").update("iconTheme", BUNDLED_THEME, vscode.ConfigurationTarget.Global);
            } else if (choice === badges) {
                vscode.workspace.getConfiguration("recordStatus").update("iconMode", "badge", vscode.ConfigurationTarget.Global);
            }
        });
    }
}

function writeIfChanged(file, text) {
    try {
        if (fs.readFileSync(file, "utf8") === text) { return; }
    } catch {
        // missing: write it
    }
    fs.writeFileSync(file, text);
}

/** "Record Status: Configure…": adds a folder's Markdown files to a profile in the workspace settings. */
async function configure() {
    const config = vscode.workspace.getConfiguration("recordStatus");
    const current = config.get("profiles");
    const profiles = JSON.parse(JSON.stringify(current && Object.keys(current).length ? current : core.DEFAULT_PROFILES));
    const pick = await vscode.window.showQuickPick(
        Object.entries(profiles).map(([name, p]) => ({ label: name, description: Object.keys(p.statuses || {}).join(" · ") })),
        { placeHolder: "Which kind of record are the files?" },
    );
    if (!pick) { return; }
    const folders = await vscode.window.showOpenDialog({
        canSelectFolders: true, canSelectFiles: false, canSelectMany: true,
        defaultUri: vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri,
        openLabel: `Use as ${pick.label} records`,
    });
    if (!folders || !folders.length) { return; }
    const include = profiles[pick.label].include = profiles[pick.label].include || [];
    for (const uri of folders) {
        const where = relPathOf(uri);
        if (!where) {
            vscode.window.showWarningMessage(`${uri.fsPath} is not inside the workspace.`);
            continue;
        }
        const glob = where.rel ? `${where.rel}/*.md` : "*.md";
        if (!include.includes(glob)) { include.push(glob); }
    }
    await config.update("profiles", profiles, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Record Status: ${pick.label} records now include ${include.join(", ")}.`);
}

function activate(context) {
    const log = vscode.window.createOutputChannel("Record Status");
    const records = new RecordStatus(context, log);
    context.subscriptions.push(log, vscode.window.registerFileDecorationProvider(records));

    // Any Markdown file may become one of ours, so watch them all and filter by profile.
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.md");
    watcher.onDidChange((uri) => records.update(uri));
    watcher.onDidCreate((uri) => { if (records.recordFor(uri)) { records.rescan(); } });
    watcher.onDidDelete((uri) => { if (records._records.has(uri.fsPath)) { records.rescan(); } });
    context.subscriptions.push(watcher);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => records.update(doc.uri)));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("recordStatus") || e.affectsConfiguration("workbench.iconTheme")) { records.rescan(); }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => records.rescan()));
    context.subscriptions.push(vscode.commands.registerCommand("recordStatus.configure", configure));
    context.subscriptions.push(vscode.commands.registerCommand("recordStatus.showLog", () => log.show()));

    records.rescan().catch((e) => log.appendLine(`rescan: ${e}`));
}

function deactivate() {}

module.exports = { activate, deactivate };
