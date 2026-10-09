# Record Status: design showcase

Every case the extension draws in the Explorer, generated from the extension's own data
(`core.js` built-in profiles, the bundled icon theme, `package.json` colours) by
`npm run showcase`. Regenerate it after changing a look, then review the diff.

Each picture is a mock-up of the Explorer at VS Code's sizes (22 px rows, 16 px icons), dark
and light. Icons are Material Icon Theme 5.39's, recoloured the way the bundled theme
recolours them. Text uses the system UI font, so it can differ slightly from VS Code's.

**Interactive version:** [`showcase.html`](showcase.html) (open it in a browser; switch theme and icon
mode, click files to change their status).

**Contents:** [1. Status words](#1-status-words) · [2. Icon modes](#2-icon-modes) ·
[3. Folder roll-up](#3-folder-roll-up) · [4. Shared file names](#4-shared-file-names) ·
[5. Tooltip](#5-tooltip) · [6. Questions to approve](#6-questions-to-approve)

## 1. Status words

The four built-in kinds. Shape = kind, colour = state. Icon mode `bundled` (the same pictures
as `material`).

### Task — `**/tasks/*.md`

| Dark | Light |
|---|---|
| <img src="showcase/status-task-dark.svg" alt="task statuses in the Explorer, dark theme" width="340"> | <img src="showcase/status-task-light.svg" alt="task statuses in the Explorer, light theme" width="340"> |

| Icon | Word | Meaning | Icon (Material name, colour) | Name colour dark / light | Glyph (badge mode) | Roll-up |
|---|---|---|---|---|---|---|
| <img src="showcase/icon-task-planned.svg" width="20"> | `planned` | Not started. | `todo`, `gray-500` | <img src="showcase/swatch-8a8f98.svg" width="12" height="12"> `#8a8f98` / <img src="showcase/swatch-6b7280.svg" width="12" height="12"> `#6b7280` | `·` | counted |
| <img src="showcase/icon-task-active.svg" width="20"> | `active` | Being worked on. | `settings`, `amber-500` | <img src="showcase/swatch-e0a800.svg" width="12" height="12"> `#e0a800` / <img src="showcase/swatch-b45309.svg" width="12" height="12"> `#b45309` | `●` | counted |
| <img src="showcase/icon-task-check.svg" width="20"> | `check` | Built; waiting for a person's look. Never blocks. | `search`, `cyan-500` | <img src="showcase/swatch-22b8cf.svg" width="12" height="12"> `#22b8cf` / <img src="showcase/swatch-0e7490.svg" width="12" height="12"> `#0e7490` | `◐` | counted |
| <img src="showcase/icon-task-done.svg" width="20"> | `done` | Finished; counts as done in the roll-up. | `verified`, `green-500` | <img src="showcase/swatch-3cb371.svg" width="12" height="12"> `#3cb371` / <img src="showcase/swatch-15803d.svg" width="12" height="12"> `#15803d` | `✓` | done |
| <img src="showcase/icon-task-blocked.svg" width="20"> | `blocked` | Can't start or continue; **Open:** says why. | `lock`, `red-500` | <img src="showcase/swatch-f0605d.svg" width="12" height="12"> `#f0605d` / <img src="showcase/swatch-b91c1c.svg" width="12" height="12"> `#b91c1c` | `✗` | counted |
| <img src="showcase/icon-task-dropped.svg" width="20"> | `dropped` | Won't be done; not counted in the roll-up. | `todo`, `gray-700` | <img src="showcase/swatch-5a5f66.svg" width="12" height="12"> `#5a5f66` / <img src="showcase/swatch-9ca3af.svg" width="12" height="12"> `#9ca3af` | `–` | not counted |
| <img src="showcase/icon-task-split.svg" width="20"> | `split` | Points to other tasks; not counted. | `diff`, `gray-700` | <img src="showcase/swatch-5a5f66.svg" width="12" height="12"> `#5a5f66` / <img src="showcase/swatch-9ca3af.svg" width="12" height="12"> `#9ca3af` | `→` | not counted |

### Decision — `**/decisions/*.md`

| Dark | Light |
|---|---|
| <img src="showcase/status-decision-dark.svg" alt="decision statuses in the Explorer, dark theme" width="340"> | <img src="showcase/status-decision-light.svg" alt="decision statuses in the Explorer, light theme" width="340"> |

| Icon | Word | Meaning | Icon (Material name, colour) | Name colour dark / light | Glyph (badge mode) | Roll-up |
|---|---|---|---|---|---|---|
| <img src="showcase/icon-decision-open.svg" width="20"> | `open` | Asked or to be asked. | `key`, `amber-500` | <img src="showcase/swatch-5aa0ff.svg" width="12" height="12"> `#5aa0ff` / <img src="showcase/swatch-1d4ed8.svg" width="12" height="12"> `#1d4ed8` | `?` | — |
| <img src="showcase/icon-decision-decided.svg" width="20"> | `decided` | Answered; the spec is updated. | `key`, `green-500` | <img src="showcase/swatch-3cb371.svg" width="12" height="12"> `#3cb371` / <img src="showcase/swatch-15803d.svg" width="12" height="12"> `#15803d` | `✓` | — |
| <img src="showcase/icon-decision-superseded.svg" width="20"> | `superseded` | Replaced by a later decision. | `key`, `gray-700` | <img src="showcase/swatch-5a5f66.svg" width="12" height="12"> `#5a5f66` / <img src="showcase/swatch-9ca3af.svg" width="12" height="12"> `#9ca3af` | `–` | — |
| <img src="showcase/icon-decision-dropped.svg" width="20"> | `dropped` | No longer relevant. | `key`, `gray-700` | <img src="showcase/swatch-5a5f66.svg" width="12" height="12"> `#5a5f66` / <img src="showcase/swatch-9ca3af.svg" width="12" height="12"> `#9ca3af` | `–` | — |

### Spec — `**/spec/*.md`

| Dark | Light |
|---|---|
| <img src="showcase/status-spec-dark.svg" alt="spec statuses in the Explorer, dark theme" width="340"> | <img src="showcase/status-spec-light.svg" alt="spec statuses in the Explorer, light theme" width="340"> |

| Icon | Word | Meaning | Icon (Material name, colour) | Name colour dark / light | Glyph (badge mode) | Roll-up |
|---|---|---|---|---|---|---|
| <img src="showcase/icon-spec-draft.svg" width="20"> | `draft` | Being written. | `document`, `gray-500` | <img src="showcase/swatch-8a8f98.svg" width="12" height="12"> `#8a8f98` / <img src="showcase/swatch-6b7280.svg" width="12" height="12"> `#6b7280` | `·` | — |
| <img src="showcase/icon-spec-review.svg" width="20"> | `review` | Ready for the developer to read. | `document`, `amber-500` | <img src="showcase/swatch-5aa0ff.svg" width="12" height="12"> `#5aa0ff` / <img src="showcase/swatch-1d4ed8.svg" width="12" height="12"> `#1d4ed8` | `?` | — |
| <img src="showcase/icon-spec-accepted.svg" width="20"> | `accepted` | Signed off, not built yet. | `document`, `green-500` | <img src="showcase/swatch-3cb371.svg" width="12" height="12"> `#3cb371` / <img src="showcase/swatch-15803d.svg" width="12" height="12"> `#15803d` | `✓` | — |
| <img src="showcase/icon-spec-living.svg" width="20"> | `living` | Being built; kept current. | `document`, `blue-500` | <img src="showcase/swatch-6cb6ff.svg" width="12" height="12"> `#6cb6ff` / <img src="showcase/swatch-1d4ed8.svg" width="12" height="12"> `#1d4ed8` | `●` | — |
| <img src="showcase/icon-spec-superseded.svg" width="20"> | `superseded` | Replaced. | `document`, `gray-700` | <img src="showcase/swatch-5a5f66.svg" width="12" height="12"> `#5a5f66` / <img src="showcase/swatch-9ca3af.svg" width="12" height="12"> `#9ca3af` | `–` | — |
| <img src="showcase/icon-spec-explainer.svg" width="20"> | `explainer` | Explains part of another spec. | `instructions`, `blue-gray-500` | — | — | — |

### Reference — `**/assessments/*.md`

| Dark | Light |
|---|---|
| <img src="showcase/status-reference-dark.svg" alt="reference statuses in the Explorer, dark theme" width="340"> | <img src="showcase/status-reference-light.svg" alt="reference statuses in the Explorer, light theme" width="340"> |

| Icon | Word | Meaning | Icon (Material name, colour) | Name colour dark / light | Glyph (badge mode) | Roll-up |
|---|---|---|---|---|---|---|
| <img src="showcase/icon-reference-research.svg" width="20"> | `research` | v1 research, read-only. | `bibliography`, `green-500` | — | — | — |
| <img src="showcase/icon-reference-assessment.svg" width="20"> | `assessment` | A dated assessment. | `lighthouse`, `green-500` | — | — | — |
| <img src="showcase/icon-reference-explainer.svg" width="20"> | `explainer` | An explainer. | `instructions`, `blue-gray-500` | — | — | — |

## 2. Icon modes

One folder in each `recordStatus.iconMode`. Roll-up and name colours are the same in every mode.

### `bundled` — Record Status Icons is the file icon theme

Status icons, name colours. Writes nothing into the workspace.

| Dark | Light |
|---|---|
| <img src="showcase/mode-bundled-dark.svg" alt="bundled mode, dark theme" width="340"> | <img src="showcase/mode-bundled-light.svg" alt="bundled mode, light theme" width="340"> |

### `material` — Material Icon Theme is the file icon theme

Looks the same as `bundled`, but the icons come from `record-*` clones written into the
workspace's `.vscode/settings.json` on every status change.

### `badge` — any icon theme

Files keep their theme icon (here Material's Markdown icon); a glyph after the name carries
the status, in the name colour.

| Dark | Light |
|---|---|
| <img src="showcase/mode-badge-dark.svg" alt="badge mode, dark theme" width="340"> | <img src="showcase/mode-badge-light.svg" alt="badge mode, light theme" width="340"> |

### `off`

Name colour only.

| Dark | Light |
|---|---|
| <img src="showcase/mode-off-dark.svg" alt="off mode, dark theme" width="340"> | <img src="showcase/mode-off-light.svg" alt="off mode, light theme" width="340"> |

### Name colours: `recordStatus.colorPreset`

The same folder with each preset. `default` is Record Status's own colours. `theme` and
`git` borrow colours from the active colour theme, so they change with it (shown here as
VS Code's Dark and Light Modern draw them). `recordStatus.colors` overrides single slots, and
`workbench.colorCustomizations` sets exact hex values for the `recordStatus.*` ids.

#### `default`

| Dark | Light |
|---|---|
| <img src="showcase/preset-default-dark.svg" alt="default colour preset, dark theme" width="340"> | <img src="showcase/preset-default-light.svg" alt="default colour preset, light theme" width="340"> |

#### `theme`

| Dark | Light |
|---|---|
| <img src="showcase/preset-theme-dark.svg" alt="theme colour preset, dark theme" width="340"> | <img src="showcase/preset-theme-light.svg" alt="theme colour preset, light theme" width="340"> |

#### `git`

| Dark | Light |
|---|---|
| <img src="showcase/preset-git-dark.svg" alt="git colour preset, dark theme" width="340"> | <img src="showcase/preset-git-light.svg" alt="git colour preset, light theme" width="340"> |

#### `quiet`

| Dark | Light |
|---|---|
| <img src="showcase/preset-quiet-dark.svg" alt="quiet colour preset, dark theme" width="340"> | <img src="showcase/preset-quiet-light.svg" alt="quiet colour preset, light theme" width="340"> |

#### `none`

| Dark | Light |
|---|---|
| <img src="showcase/preset-none-dark.svg" alt="none colour preset, dark theme" width="340"> | <img src="showcase/preset-none-light.svg" alt="none colour preset, light theme" width="340"> |


## 3. Folder roll-up

The folder above a `tasks/` folder shows the share of its tasks that are done: `0`…`99`,
then `✓` with a green name at 100%. `dropped` and `split` tasks are not counted.

| Dark | Light |
|---|---|
| <img src="showcase/rollup-dark.svg" alt="folder roll-up badges, dark theme" width="340"> | <img src="showcase/rollup-light.svg" alt="folder roll-up badges, light theme" width="340"> |

`UIV2` has no `tasks/` folder yet, so no badge. The grey note is not drawn by VS Code; it is the tooltip text.

## 4. Shared file names

Icon themes match by file name, not path. When files with the same name are in different
states, the name gets no status icon and keeps the theme's own; its name colour still shows the
status. Below: the two `README.md` files are `review` and `living` specs, so both keep the
README icon. The two `02_Build_Order.md` are both `living`, so they keep the status icon.

| Dark | Light |
|---|---|
| <img src="showcase/shared-dark.svg" alt="shared file names, dark theme" width="340"> | <img src="showcase/shared-light.svg" alt="shared file names, light theme" width="340"> |

## 5. Tooltip

Hovering a record names its kind and status; hovering a roll-up folder gives the count.

| Dark | Light |
|---|---|
| <img src="showcase/tooltip-dark.svg" alt="tooltip on a task, dark theme" width="340"> | <img src="showcase/tooltip-light.svg" alt="tooltip on a task, light theme" width="340"> |

## 6. Questions to approve

1. **Decision icon:** a key now. Alternatives on the [interactive page](showcase.html)
   (Decision icon picker): `routing` (a signpost: "which way?"), `git` (a fork),
   `chess`, `tune`, `label`, `certificate`, `pipeline`.
2. **Spec icon:** now `document` (a page with lines of text). Alternatives on the page:
   `log`, `contributing`, `toc`, `architecture` (the old one).
3. **Default colour preset:** `default`, or one of `theme`, `git`, `quiet`, `none`?
4. **Shapes per kind:** tasks use a different shape per state (todo, gear, magnifier, verified,
   lock); decisions and specs keep one shape. Keep, or give tasks one shape too?
5. **`check` in cyan with a magnifier:** distinct enough from `active` (amber gear)?
6. **`dropped` reuses the grey todo icon** and `split` the diff icon, both dark grey. Fine,
   or should `dropped` get its own shape?
7. **Name colours:** open decisions and specs in review are *blue* names with *amber* icons.
   Make the name amber too, or keep blue for "waiting on someone"?
8. **Glyphs in badge mode:** `·` for planned and draft is very small. Use `○` instead?
9. **Roll-up at 100%:** `✓` and a green folder name. Keep the green name?
