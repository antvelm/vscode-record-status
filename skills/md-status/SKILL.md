---
name: md-status
description: Write and update Markdown records — specs, decisions (ADRs) and tasks — in the layout the MD Status VS Code extension reads (spec/, decisions/, tasks/ folders with a **Status:** line). Use when opening a decision, writing a spec, cutting tasks, starting or finishing a task, ticking a checklist, or changing any record's status. A project's own records skill or rules file takes precedence over this one.
---

# Records: specs, decisions and tasks

A **record** is one Markdown file whose status is written inside it. The MD Status extension
shows that status as the file's icon and name colour in VS Code's Explorer, and shows on the folder
above `tasks/` how many tasks are done. It needs no settings when records follow this layout.

Before writing, check the project for its own rules (`AGENTS.md`, `CLAUDE.md`, an `agents/` or
`docs/` folder, an index script). They win over this file. Also check
`.vscode/settings.json` for `mdStatus.profiles`: a project that sets its own folders or status
words uses those, not the defaults below.

## Layout

| Kind | Folder | Holds |
|---|---|---|
| Spec | `spec/` | How a system should work, in enough detail to build and review against |
| Decision | `decisions/` | One choice: what, why, and what it rules out |
| Task | `tasks/` | One unit of work, with a checklist |
| Reference | `assessments/` | Research and assessments; not plans |

The folders can sit anywhere (`docs/decisions/`, `Saves/tasks/`); the folder *name* is what makes a
file a record. Two layouts work with no settings:

- **Flat:** `docs/spec/`, `docs/decisions/`, `docs/tasks/`. The extension shows progress on `docs/`.
- **A folder per feature** (better once there is more than one feature): each feature gets its own
  three folders, and the extension shows each feature's progress on the feature folder.

  ```
  docs/fire-oil/            ← 40   (share of the feature's tasks done)
      spec/fire-oil.md      the feature's spec, named after it; lists its tasks in build order
      decisions/001-….md
      tasks/001-….md
  ```

  Project-wide decisions (process, tooling) go in a top-level `docs/decisions/`. A record belongs to
  the feature it changes most; other features link to it.

## Rules for every record

- **One record per file.** Name tasks and decisions `NNN-<slug>.md`: three digits, slug in
  lower-case kebab case. With feature folders, number **across the whole project**, not per folder,
  so "task 7" stays unambiguous and tasks can depend on other features' tasks. A spec is named for
  what it covers (the feature's own spec after the feature) and needs no number.
- **Never rename a record**, not when its title changes and not when it closes. Links must keep
  working. A record is closed by its status, never deleted. If it must move to another folder, use
  the version control's move so history follows, and fix every link to it in the same change.
- **Title line, then the status line:**

  ```markdown
  # 007 — Save files are versioned per container

  **Status:** open · **Date:** 2026-10-10
  ```

  The extension reads the **first word** after `**Status:**`, lower-cased. So the status is one
  word from the kind's list below. Only `superseded` takes trailing text: `**Status:** superseded
  by 012` reads as `superseded`. `in progress` would read as `in`, and an unknown word shows no
  icon.
- Other header fields go on the same line, separated by ` · ` (`**Decision:**`, `**Needs:**`, …).
- **Change a status by editing that one word.** Say why in the body.
- **Link records by relative path** with the number as the text: `[007](../decisions/007-save-versioning.md)`.
- **Give records distinct file names.** Icons match by file *name*, so files named the same (say,
  several `README.md`) in different states get no status icon. Numbered slugs avoid this.
- **Only records in a record folder.** Any other `.md` file in `tasks/` (an index `README.md`, a
  board) counts toward the folder percentage as an unfinished task.

## Status words, and who may set them

Statuses that mean "a person agreed" belong to the project owner. An agent proposes them and
stops; it sets one only when the owner says so.

| Kind | Status | Means | Set by |
|---|---|---|---|
| Task | `planned` | Written, not started | agent |
| | `active` | Being worked on | agent |
| | `check` | Built; waiting for a person to look | agent |
| | `done` | A person looked and agreed | **owner** |
| | `blocked` | Cannot proceed; the body says on what | agent |
| | `dropped` | Will not be done; the body says why | **owner** |
| | `split` | Replaced by smaller tasks; the body links them | agent |
| Decision | `open` | Argued, waiting for the owner | agent |
| | `decided` | Agreed; holds until superseded | **owner** |
| | `superseded` | `superseded by NNN` | **owner** |
| | `dropped` | Not taken, nothing replaces it | **owner** |
| Spec | `draft` | Being written | agent |
| | `review` | Complete, waiting for a read | agent |
| | `accepted` | Agreed; tasks may be cut from it | **owner** |
| | `living` | Being built; kept current | agent |
| | `superseded` | `superseded by NNN` | **owner** |
| | `explainer` | Background, not a plan | agent |
| Reference | `research` · `assessment` · `explainer` | Kind of reference | agent |

`dropped` and `split` tasks do not count toward the folder percentage; `done` counts as done;
everything else counts as not done.

**An agent that finishes a task sets `check`, never `done`,** and adds a dated note: what was
built, what was verified and how, what was not verified, what the person should try.

## Decisions

Write one whenever there were real alternatives and the reason for the pick would not be obvious
from the code. Header: `**Status:** · **Date:**`, plus `**Supersedes:** [NNN](…)` when it replaces
one. The title states the decision ("Saves are versioned per container"), not the question.

Body, in this order, all required:

1. **Context** — the situation as facts; what is wrong or missing today.
2. **Decision** — firm bullet statements, each one checkable against the build.
3. **Consequences** — what gets easier, harder, what changes, what work follows.
4. **Rejected** — every alternative seriously considered, with why it lost. Never empty.

Once `decided`, the *Decision* section is frozen. To change it, write a new decision naming the old
one under **Supersedes**, then set the old one to `superseded by NNN`. One choice per file.

## Specs

Write one when a decision does not say enough to build from: a new system, a file format, a
protocol, anything two tasks must agree on. Header: `**Status:** · **Date:** · **Decisions:**`
(the decisions it rests on). Sections, dropping those that do not apply: **Summary**, **Scope**
(in and explicitly out), **Design**, **Edge cases**, **Tasks** (links, once accepted), **Open
questions**, **As built** (dated notes where the build departed from the text).

A spec does not decide: a choice found while writing it becomes an `open` decision, linked. Cut
tasks from it only once it is `accepted`. While `living`, keep the text and the build in agreement.

**With feature folders, the feature's spec is its board.** A **Tasks** section links every task of
the feature, grouped in playable phases, in build order, with why that order. It does not copy
statuses or box counts: each task's status is on its own file, the extension shows it, and a copy
would go stale. Adding a task is two edits: the task file, and its line in the spec.

## Tasks

A task is playable or checkable on its own and small enough to finish in a few sessions; past about
ten checklist boxes, split it. Header: `**Status:** · **Decision:** [NNN](…) · **Needs:** NNN, NNN`
(tasks that must be `done` first, or `nothing`).

Body, in this order:

1. **Goal** — what someone can do afterwards that they cannot now.
2. **Done when** — observable checks a person can try.
3. **Checklist** — `- [ ]` boxes, one concrete step each, naming real files. Tick as you go.
4. **Notes** — dated bullets, newest last: what was learned, what changed, why blocked or dropped.

A task with unticked boxes is not `check` or `done`: finish the box, or move it to a new task and
say so. Work found along the way that *Done when* does not need becomes a new `planned` task, not
a new box.

## After editing

If the project has an index or check script for its records, run it and fix what it reports. If it
does not, check by hand: every link resolves, every status word is in its kind's list, every
task in `check` or `done` has all boxes ticked, and (with feature folders) the feature's spec links
every task in its `tasks/`.
