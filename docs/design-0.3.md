# Record Status 0.3: design

**Date:** 2026-10-09
**Status:** built in 0.3.0 (2026-10-10). Where the build differs from the text below, "As built" at the end says so.
**Origin:** design session for the Becastled `docs_refactor_v2` tree, where records come in four kinds (specs, decisions, tasks, reference) that each have their own status words. The docs side of that design is `docs_refactor_v2/Docs_Structure.md` in that project.

0.3 adds five things to 0.2:

1. **Profiles:** different status words, patterns and looks for different globs.
2. **Folder roll-up:** a folder's badge shows the percentage of its records that are done.
3. **Shared file names:** a file name used by files in different states gets no icon clone, instead of a random one.
4. **Icon modes:** a bundled icon theme and a badge mode, so Material Icon Theme is optional and the workspace settings stop changing (§4).
5. **Setup without editing JSON:** default profiles, a first-run prompt and a Configure command (§5).

0.2 settings keep working unchanged (§1.3).

## 1. Profiles

### 1.1 Setting

```jsonc
"recordStatus.profiles": {
    "task": {
        "include": ["docs_refactor_v2/*/tasks/*.md"],
        "statusPattern": "\\*\\*Status:\\*\\*\\s*([A-Za-z-]+)",   // optional; falls back to recordStatus.statusPattern
        "statuses": {
            "planned": { "icon": "todo",     "iconColor": "gray-500",  "nameColor": "recordStatus.planned" },
            "active":  { "icon": "settings", "iconColor": "amber-500", "nameColor": "recordStatus.inProgress" },
            "check":   { "icon": "search",   "iconColor": "cyan-500",  "nameColor": "recordStatus.check" },
            "done":    { "icon": "verified", "iconColor": "green-500", "nameColor": "recordStatus.completed", "rollup": "done" },
            "blocked": { "icon": "lock",     "iconColor": "red-500",   "nameColor": "recordStatus.blocked" },
            "dropped": { "icon": "todo",     "iconColor": "gray-700",  "nameColor": "recordStatus.dropped",   "rollup": "skip" },
            "split":   { "icon": "diff",     "iconColor": "gray-700",  "nameColor": "recordStatus.dropped",   "rollup": "skip" }
        }
    },
    "decision": {
        "include": ["docs_refactor_v2/*/decisions/*.md"],
        "statuses": {
            "open":       { "icon": "key", "iconColor": "amber-500", "nameColor": "recordStatus.proposed" },
            "decided":    { "icon": "key", "iconColor": "green-500", "nameColor": "recordStatus.completed" },
            "superseded": { "icon": "key", "iconColor": "gray-700",  "nameColor": "recordStatus.dropped" },
            "dropped":    { "icon": "key", "iconColor": "gray-700",  "nameColor": "recordStatus.dropped" }
        }
    },
    "spec": {
        "include": ["docs_refactor_v2/*/spec/*.md", "docs_refactor_v2/*/README.md"],
        "statuses": { "draft": { … }, "review": { … }, "accepted": { … }, "living": { … }, "superseded": { … }, "explainer": { … } }
    }
}
```

- The key (`task`, `decision`, `spec`) is the profile's name. It appears in clone names (§1.2) and in the hover.
- `include`, `statusPattern` and `statuses` have the same meaning as the 0.2 top-level settings, but apply only to this profile.
- `rollup` is new and optional (§2). Its value is `"done"` (counts as done), `"skip"` (not counted at all) or absent (counted, not done).
- **A file matched by several profiles** belongs to the first profile, in the order the keys are written. VS Code keeps object key order from `settings.json`.

### 1.2 Clones

Clone names become `record-<profile>-<status>`, for example `record-task-done` or `record-decision-open`. The prefix used to decide which clones the extension owns stays `record-`, so clones written by 0.2 are cleaned up on the first sync.

### 1.3 Compatibility

When `recordStatus.profiles` is not set, the 0.2 settings (`include`, `statusPattern`, `statuses`) act as a single profile named `default`. Its clone names stay `record-<status>`, as in 0.2, so nothing churns for existing users.

When `profiles` is set, the top-level `include` and `statuses` are ignored. The top-level `statusPattern` remains the fallback for profiles that do not set one.

### 1.4 New colours

| Id | Meaning | dark / light |
|---|---|---|
| `recordStatus.check` | Built, waiting for a person's look | `#22b8cf` / `#0e7490` |
| `recordStatus.blocked` | Blocked | `#f0605d` / `#b91c1c` |
| `recordStatus.living` | Spec being built and kept current | `#6cb6ff` / `#1d4ed8` |

The existing five colours stay.

### 1.5 Hover

A file's tooltip becomes `<Profile>: <Status>`, for example "Task: Check". (0.2 shows only the status.)

## 2. Folder roll-up

### 2.1 Setting

```jsonc
"recordStatus.rollup": {
    "folders": ["docs_refactor_v2/*"],   // globs of folders that get a badge
    "profiles": ["task"],                // whose records count; empty = all profiles
    "badge": "percent",                  // only value in 0.3
    "nameColor": "recordStatus.completed" // optional: colour of the folder name at 100%
}
```

### 2.2 Rule

For each folder matched by `folders`:

- **Counted records:** every record under the folder (at any depth) in one of the listed `profiles`, except those whose status has `rollup: "skip"`.
- **Done records:** those whose status has `rollup: "done"`.
- **Badge:** `floor(100 × done / counted)`, shown as `0`…`99`. When every counted record is done, the badge is `✓` and the folder name takes `nameColor`. With no counted records, there is no badge.
- **Tooltip:** `7 of 18 done`.

The badge is set on the folder itself; it does **not** use `FileDecoration.propagate`, so it does not also climb to parent folders. Badges are limited to 2 characters, which is why 100% shows as `✓`.

A record with no status, or with a status that is not in its profile, is counted as not done. A typo therefore shows up as a lower percentage instead of disappearing.

### 2.3 Refresh

Any change to a record fires a decoration change for its own URI and for every roll-up folder that contains it.

## 3. Shared file names

Material Icon Theme clones match a bare file name, so `AIV2/README.md` and `NavLibV2/README.md` cannot have different icons. In 0.2 such a name was listed in several clones, and which icon won was undefined.

0.3 rule: when one file name (compared in lower case) belongs to matched files with **different** `(profile, status)` pairs, the name is left out of every clone. Those files keep their theme icon, and the name colour (set per path) still shows their status. When every file with that name has the same pair, the name stays in that clone.

The extension logs each name it leaves out to its output channel (`Record Status`), so a user who expected an icon can see why it is missing.

## 4. Icon modes

Material Icon Theme clones have two costs. They need Material as the active icon theme, and they
are written into the workspace's `.vscode/settings.json` on every status change. When that file is
under version control (it is in Becastled, in Plastic), every status edit becomes a pending change,
and two people editing docs will conflict on it.

`recordStatus.iconMode` picks how the status reaches the icon:

| Mode | How | Needs | Writes workspace settings |
|---|---|---|---|
| `auto` (default) | `bundled` when "Record Status Icons" is the active icon theme, else `material` when Material Icon Theme is, else `badge` | nothing | depends on the mode chosen |
| `bundled` | The extension ships its own file icon theme, "Record Status Icons": Material Icon Theme's icons, copied at build time from a pinned version (MIT; its licence notice ships with them), plus the record icons. At runtime the extension rewrites its own theme manifest in its extension folder, adding a `fileNames` entry per record, as Material does for its own settings. | the user picks the theme once | **no** |
| `material` | Clones in `material-icon-theme.files.customClones`, as in 0.2 | Material Icon Theme | yes |
| `badge` | No icon change. A one-character badge after the name, in the status colour: `●` active, `◐` check, `✓` done or decided, `✗` blocked, `?` open, `·` planned or draft. Each status can override it with `badge`. | nothing | **no** |
| `off` | Name colour only | nothing | no |

`recordStatus.icons: false` (0.2) means `off`.

**Why `bundled` is not the only mode.** VS Code has one active file icon theme, so a bundled theme
replaces the user's own. It must carry the full Material set (5.39: 1,252 SVGs, about 3.6 MB) or
every other file loses its icon. It must be re-copied when Material updates. It still matches by
bare file name, so §3 still applies.

**Spike before building `bundled`.** Two things to check:
1. Does VS Code apply a rewritten icon theme manifest without a window reload?
2. Can Material's own manifest generator be used at build time, or do we copy its
   `dist/material-icons.json` and add to it?

## 5. Setup without editing JSON

0.2 needs `recordStatus.include` and `statuses` written into settings by hand. 0.3 removes that:

1. **Default profiles** matching the layout in Becastled's `Docs_Structure.md`: `**/tasks/*.md`,
   `**/decisions/*.md` and `**/spec/*.md`, with the task, decision and spec words and their looks.
   A project with that layout needs no settings at all.
2. **First run:** if no icon source is available, a notification offers **Use Record Status Icons**
   (sets `workbench.iconTheme` in *user* settings, never the workspace) or **Badges only** (sets
   `iconMode` to `badge` in user settings).
3. **Command "Record Status: Configure…"**: picks folders from the workspace and a profile for each,
   then writes the include globs to workspace settings. This is for projects with a different
   layout, and it runs once.

## 6. Distribution

- **`.vsix`** (now): `python install.py` builds and installs it; `--package` only builds it. Attach
  it to each GitHub Release, so anyone can install it from **Extensions → … → Install from VSIX…**.
- **VS Code Marketplace** (later, needs the `antvelm` publisher and an Azure DevOps token): gives a
  one-click Install button, updates, a `vscode:extension/antvelm.record-status` link, and lets a
  project recommend it in `.vscode/extensions.json`. Add a 128 px `icon` before publishing.
- **Open VSX** (`npx ovsx publish`) for Cursor and VSCodium.
- No `extensionDependencies` on Material Icon Theme. With `bundled` and `badge`, it is optional.

## 7. Not in 0.3

These were discussed and left for later:

- **Ready and blocked worked out from a `**Needs:**` line.** A `planned` task whose needs are all done would show as ready. This needs ID → file resolution across the tree.
- **A "Set status" command** that rewrites the status line and adds the date.
- **A Records tree view.** It would overlap with the project's own dashboard.
- **A roll-up badge showing the most urgent child** (red when anything is blocked) as an alternative to `percent`.

## 8. Tests

`_test` already exports `globToRegExp` and `readStatus`. 0.3 adds pure functions with plain-Node tests (no VS Code host):

- `profileFor(relPath, profiles)`: the first profile that matches wins; no match gives none; with no profiles set, the 0.2 settings act as the `default` profile.
- `buildClones(statusByPath, profiles)`: clone names, sorted file names, colours, shared-name exclusion, and clones from other tools kept.
- `rollup(folder, statusByPath, config)`: counted and done records, `skip`, the 0→`0`, 99.9→`99` and 100→`✓` cases, and no badge with zero counted records.

## 9. As built (0.3.0, 2026-10-10)

- **Live reload of the bundled theme (the §4 spike).** VS Code reloads a file icon theme whose
  contribution has `"_watch": true`, which is what Material Icon Theme declares for its own
  rewritten manifest. Record Status declares it too. Not yet seen in a running window.
- **Badge mode uses a separate `glyph` field.** A look's `badge` is always shown, as in 0.2;
  `glyph` is shown only in badge mode. The built-in looks set glyphs.
- **Profiles inherit.** A profile named like a built-in one (`task`, `decision`, `spec`,
  `reference`) takes the built-in `include` and `statuses` it doesn't set, so a project only
  writes its globs.
- **Roll-up folders default to automatic:** the folder above each record's folder
  (`SavesV2/tasks/X.md` rolls up into `SavesV2`). `rollup.folders` globs replace that. `rollup`
  also has `enabled`.
- **`bundled` while another theme is active** falls back to badges, and the first-run prompt offers
  the switch. Once per user (global state).
- **Icon files are looked up through the manifest.** Material keeps derived icons as
  `<name>.clone.svg` (e.g. `instructions`), so `icons/<name>.svg` is not always the file.
- **Outside material mode**, the extension removes its own `record-*` clones from the workspace
  settings once, then stops writing there.
- **`**/` in globs matches zero folders too**, so `**/tasks/*.md` matches `tasks/a.md`. In 0.2 it
  also matched `subtasks/a.md`.
- The 0.2 extension in `install.py` copied files; 0.3's builds a `.vsix` (§6).
