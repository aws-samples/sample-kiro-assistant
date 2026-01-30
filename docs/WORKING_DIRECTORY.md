# Working Directory Management in Kiro Cowork

Kiro Cowork automatically manages the filesystem workspace for each task so that sessions never collide. This document explains how it works and why the UI no longer asks you to pick a directory.

## Root Workspace

- On startup, the app ensures `~/Documents/workspace-kiro-cowork` exists.
- This root folder is the parent for every session workspace the app creates.

## Per-Session Workspaces

- When you start a new session (task), the Electron main process provisions a unique workspace such as:
  ```
  ~/Documents/workspace-kiro-cowork/task-20260127-153045
  ```
- The naming uses a timestamp plus a numeric suffix to avoid collisions (`task-YYYYMMDD-HHMMSS`, `task-YYYYMMDD-HHMMSS-02`, …).
- The runner passes this path to `kiro-cli chat …` as the `cwd`, so Kiro CLI scopes its history/`--resume` to that folder only.
- Each workspace is stored in `sessions.db` so reopening a session uses the same directory it was created with.

## No Manual Directory Selection

- The “Start Session” modal no longer has a browser/picker for working directories. Users do not point Cowork at arbitrary folders.
- All new sessions run inside auto-generated workspaces; if you have files from another project, upload them via the paperclip button and Cowork copies them into the workspace.
- This design ensures:
  - **Isolation:** No two tasks share a directory, so Kiro CLI never resumes the wrong conversation.
  - **Safety:** The CLI stays within the sandboxed folder unless you explicitly upload/copy files in.

## Legacy Sessions

- Sessions created before this change still display their original `cwd` and continue to run in that directory.
- Only newly created sessions get the auto-managed workspace treatment.

## Tips

- You can inspect the workspace for a session via Finder if you need to look at the files (just note the path shown in the System/Session cards).
- If you want to reuse a workspace for debugging, you can manually copy it elsewhere, but the app itself always provisions a fresh folder for new tasks.
