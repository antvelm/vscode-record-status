# Changelog

## Unreleased

- Name-colour presets (`recordStatus.colorPreset`: `default`, `theme`, `git`, `quiet`, `none`)
  and per-slot overrides (`recordStatus.colors`).
- Specs use Material's `document` icon (a page with lines of text) instead of `architecture`.
- The showcase page has pickers for the colour preset, the spec icon and the decision icon.

## 0.3.0

- **Profiles** (`recordStatus.profiles`): kinds of record, each with its own globs, status pattern
  and status words. Built-in `task`, `decision`, `spec` and `reference` profiles cover `tasks/`,
  `decisions/`, `spec/` and `assessments/` folders, so a project with that layout needs no
  settings. A profile named like a built-in one inherits what it doesn't set.
- **Folder roll-up**: the folder above a `tasks/` folder shows the percentage of tasks done (`✓`
  at 100%).
- **Icon modes** (`recordStatus.iconMode`): `bundled` adds the file icon theme *Record Status
  Icons* (Material Icon Theme 5.39's icons plus status icons) and writes nothing into the
  workspace; `badge` shows a coloured glyph instead of an icon; `material` is the 0.2 behaviour;
  `auto` picks one from the active icon theme.
- A file name shared by records in different states (several `README.md`) no longer gets a random
  icon: it gets none, and **Record Status: Show Log** names it.
- First-run prompt to switch to Record Status Icons or badges, and **Record Status: Configure…** to
  add folders to a profile.
- Tooltips name the kind and the status ("Task: Check"). New colours `recordStatus.check`,
  `.blocked` and `.living`.
- `install.py` builds a `.vsix` and installs it with `code --install-extension`, instead of copying
  files into `~/.vscode/extensions`; `--package` only builds it.
- `recordStatus.include`, `.statuses` and `.icons` are deprecated but still read.

## 0.2.0

- Folders, the status pattern and the look of each status are settings.
- No badge by default; the icon and the name colour carry the status.
- Material Icon Theme is optional: without it, only the name colour is shown.

## 0.1.0

- First version, hard-coded to `doc/tasks` and `doc/decisions` with a `**Status:**` line.
