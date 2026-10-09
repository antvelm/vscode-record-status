// Record Status: shows the status written inside a Markdown file on that file in the Explorer.
//
// Two layers, both driven by the same status read from the file:
//  - a FileDecoration (name colour, optional badge), the API git uses for "M";
//  - the file icon itself, through Material Icon Theme: VS Code has no API for one extension to
//    set another file's icon, but Material Icon Theme builds per-file-name "clone" icons from its
//    `customClones` setting and re-renders when that setting changes. This extension keeps a set
//    of `record-*` clones in the workspace settings, listing the exact file names in each status.
//
// File names are never touched, so links to the files stay valid.
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const MATERIAL = "PKief.material-icon-theme";
const CLONE_PREFIX = "record-";

/** Reads the extension's settings, recompiling the pattern each time they change. */
function settings() {
    const config = vscode.workspace.getConfiguration("recordStatus");
    let pattern;
    try {
        pattern = new RegExp(config.get("statusPattern"));
    } catch (e) {
        console.error("record-status: bad statusPattern", e);
        pattern = /\*\*Status:\*\*\s*([^·\n]+)/;
    }
    const statuses = {};
    for (const [key, look] of Object.entries(config.get("statuses") || {})) {
        statuses[key.toLowerCase()] = look || {};
    }
    return {
        include: config.get("include") || [],
        pattern,
        statuses,
        icons: config.get("icons") !== false,
    };
}

/** The status written in a file, normalised, or null. */
function readStatus(fsPath, pattern) {
    try {
        const m = pattern.exec(fs.readFileSync(fsPath, "utf8"));
        if (!m || !m[1]) { return null; }
        return m[1].trim().toLowerCase().split(" by ")[0].trim();
    } catch {
        return null;
    }
}

class RecordStatus {
    constructor() {
        this._emitter = new vscode.EventEmitter();
        this.onDidChangeFileDecorations = this._emitter.event;
        /** fsPath -> status, for every matched file. */
        this._status = new Map();
        this._settings = settings();
        this._pending = undefined;
    }

    /** Finds every matched file and reads its status, then refreshes everything that shows it. */
    async rescan() {
        this._settings = settings();
        const found = new Map();
        for (const glob of this._settings.include) {
            for (const uri of await vscode.workspace.findFiles(glob, null)) {
                found.set(uri.fsPath, readStatus(uri.fsPath, this._settings.pattern));
            }
        }
        this._status = found;
        this._emitter.fire(undefined);
        await this.syncIcons();
    }

    /** Re-reads one file after it changed. */
    update(uri) {
        if (!this._status.has(uri.fsPath) && !this.matches(uri)) { return; }
        this._status.set(uri.fsPath, readStatus(uri.fsPath, this._settings.pattern));
        this._emitter.fire(uri);
        this.scheduleIcons();
    }

    /** Is a file one of ours? Checked by a rescan when a new file appears. */
    matches(uri) {
        return this._settings.include.some((glob) => {
            const folder = vscode.workspace.getWorkspaceFolder(uri);
            if (!folder) { return false; }
            const rel = path.relative(folder.uri.fsPath, uri.fsPath).split(path.sep).join("/");
            return globToRegExp(glob).test(rel);
        });
    }

    provideFileDecoration(uri) {
        if (uri.scheme !== "file") { return undefined; }
        const status = this._status.get(uri.fsPath);
        const look = status && this._settings.statuses[status];
        if (!look || (!look.nameColor && !look.badge)) { return undefined; }
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return new vscode.FileDecoration(look.badge || undefined, label,
            look.nameColor ? new vscode.ThemeColor(look.nameColor) : undefined);
    }

    scheduleIcons() {
        clearTimeout(this._pending);
        this._pending = setTimeout(() => this.syncIcons().catch((e) => console.error("record-status:", e)), 300);
    }

    /** Writes one Material Icon Theme clone per status, listing the file names in that status. */
    async syncIcons() {
        if (!vscode.extensions.getExtension(MATERIAL)) { return; }
        const config = vscode.workspace.getConfiguration("material-icon-theme.files");
        const current = (config.inspect("customClones") || {}).workspaceValue || [];
        const kept = current.filter((c) => !(c && typeof c.name === "string" && c.name.startsWith(CLONE_PREFIX)));

        const clones = [];
        if (this._settings.icons) {
            const names = {};
            for (const [fsPath, status] of this._status) {
                const look = status && this._settings.statuses[status];
                if (!look || !look.icon) { continue; }
                (names[status] = names[status] || []).push(path.basename(fsPath).toLowerCase());
            }
            for (const status of Object.keys(names).sort()) {
                const look = this._settings.statuses[status];
                const clone = { name: CLONE_PREFIX + status.replace(/\s+/g, "-"), base: look.icon, fileNames: names[status].sort() };
                if (look.iconColor) { clone.color = look.iconColor; }
                clones.push(clone);
            }
        }

        const next = kept.concat(clones);
        if (JSON.stringify(next) === JSON.stringify(current)) { return; }
        await config.update("customClones", next.length ? next : undefined, vscode.ConfigurationTarget.Workspace);
    }
}

/** Minimal glob -> RegExp for `*`, `**`, `?` and `[...]`, matched against a forward-slash path. */
function globToRegExp(glob) {
    let re = "";
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === "*") {
            if (glob[i + 1] === "*") { re += ".*"; i++; if (glob[i + 1] === "/") { i++; } }
            else { re += "[^/]*"; }
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

function activate(context) {
    const records = new RecordStatus();
    context.subscriptions.push(vscode.window.registerFileDecorationProvider(records));

    // Any Markdown file may become one of ours, so watch them all and filter by the include globs.
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.md");
    watcher.onDidChange((uri) => records.update(uri));
    watcher.onDidCreate((uri) => { if (records.matches(uri)) { records.rescan(); } });
    watcher.onDidDelete((uri) => { if (records._status.has(uri.fsPath)) { records.rescan(); } });
    context.subscriptions.push(watcher);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => records.update(doc.uri)));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("recordStatus")) { records.rescan(); }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => records.rescan()));

    records.rescan().catch((e) => console.error("record-status:", e));
}

function deactivate() {}

module.exports = { activate, deactivate, _test: { globToRegExp, readStatus } };
