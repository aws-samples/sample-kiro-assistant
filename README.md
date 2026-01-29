# Kiro Cowork (Based on Agent Cowork)

Kiro Cowork is our customized build of the open-source Agent Cowork desktop application. It also takes advantage of Kiro-CLI features like SubAgent, MCPs, Skills etc.


We improve the UX and capabilities (500 plus MCP tools & vast array of skills). It can make audio, professional quality video, presentations, excel models, ppts
and many more things. It can help you with emails, social media, cancelling unwanted subscriptions, filing expenses etc.

It keeps the familiar Electron + React UX while swapping the runtime for **Kiro CLI**, so you can use every model Kiro supports.

The original Agent Cowork build on top of Claude Code SDK and launches it with Claude Agents SDK. We do not have a Kiro SDK yet.
So we develop a custom interface to the Kiro CLI through SQLLiteDatabase where Kiro-CLI stores convesation information.

To summarize:
- 🚀 **Native Electron desktop app** with hot-reloadable React/Tailwind renderer
- 🧠 **Powered entirely by `kiro-cli`** (no Claude CLI required) with Kiro look and feel
- 🧩 **500 MCPs through Composion. Additional MCPs for Excel, Pencil Desktop etc** surfaced inside Settings
- 📂 **Auto-provisioned workspaces** per session under `~/Documents/workspace-kiro-cowork/<task-id>`
- 💾 **SQLite-backed history** so conversations stream in real time and persist across launches

---

## Model & Provider Compatibility

If a model works in `kiro-cli`, it works in Kiro Cowork: Claude (Anthropic API or Bedrock), Kimi K2, MiniMax M2, DeepSeek, GLM, etc. Configure providers once inside Kiro CLI and the desktop app automatically uses those settings.

---

## Architecture Overview

![Kiro Cowork Architecture](images/architecture.png)
![Agent Cowork vs Kiro Cowork](images/AgentCoworkvsKiroCoworker.png)
![SQLite Polling Flow](images/SQLLite.png)

| Layer | Responsibilities | Key Files |
| ----- | ---------------- | --------- |
| **Electron Main** | Boots the BrowserWindow, exposes IPC APIs (`read-file`, `run-kiro-command`, MCP helpers), spawns `kiro-cli chat`, and copies uploads into per-session workspaces. | `src/electron/main.ts`, `src/electron/libs/runner.ts`, `src/electron/libs/mcp-config.ts`, `src/electron/libs/workspace.ts` |
| **React Renderer** | Zustand store + UI components (sessions, prompt bar, MCP settings, file sidebar, file upload, slash commands). | `src/ui/*` |
| **Kiro CLI runtime** | Talks to Anthropic-compatible APIs, executes tools, runs MCP servers, and writes conversation history to its SQLite store. | `/Applications/Kiro CLI.app` or `kiro-cli` on PATH |
| **Claude Agent SDK (helper)** | Only used for `generateSessionTitle()` to keep the automatic title suggestion feature. | `src/electron/libs/util.ts` |
| **Persistence** | Cowork metadata/history via `sessions.db`; conversation bodies live in Kiro’s own `~/Library/Application Support/kiro-cli/data.sqlite3`. | `src/electron/libs/session-store.ts` |

More details (mermaid diagrams, SQLite polling strategy, security notes) live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/INTEGRATION.md`](docs/INTEGRATION.md).

---

## Installing & Running

### Prerequisites

1. **Kiro CLI** installed and authenticated for your provider (Anthropic, Bedrock, Kimi, etc.).
2. **Claude CLI (optional)** only if you want the legacy helpers (e.g., `/skills`) inside Settings.
3. **Bun (preferred) or Node.js 18+** for building.
4. **macOS 13+** (the current build targets macOS; Windows/Linux scripts are stubbed but untested).

> Each new session auto-creates a workspace under `~/Documents/workspace-kiro-cowork/<task-id>`. Use the Upload button to place files into that sandbox; the UI no longer asks you to pick folders manually.

### Steps

```bash
# Clone from AWS GitLab
git clone https://gitlab.aws.dev/wwps-asean-sa-genai/Kiro-Cowork.git
cd Kiro-Cowork

# Install dependencies
bun install

# Development mode (Vite + Electron with hot reload)
bun run dev

# Production build (macOS arm64)
bun run dist:mac
```

The macOS bundle is emitted to `dist/mac-arm64/Kiro Coworker.app`. Copy it into `/Applications` (back up any previous version first).

> We spawn `kiro-cli chat --no-interactive --trust-all-tools --wrap never --model claude-opus-4.5 --agent kiro-coworker`. Override defaults with `KIRO_DEFAULT_MODEL` / `KIRO_AGENT` before launching the app.

---

## Custom Agent Configuration & MCPs

Kiro Cowork instantiates a custom agent named `kiro-coworker`. Its configuration lives in `~/.kiro/agents/agent_config.json`:

```json
{
  "name": "kiro-coworker",
  "description": "A custom agent for my workflow",
  "mcpServers": {
    "pencil": {
      "command": "/Applications/Pencil.app/Contents/Resources/app.asar.unpacked/out/mcp-server-darwin-arm64",
      "args": ["--ws-port", "53881"],
      "env": {},
      "type": "stdio",
      "disabled": false
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {},
      "disabled": false
    },
    "composio": {
      "type": "http",
      "url": "https://backend.composio.dev/tool_router/trs_8YCbLt0jkO8_/mcp",
      "headers": {
        "x-api-key": "ak_Ra86dArRGY_2yiYPsia7"
      },
      "disabled": false
    },
    "zai-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@z_ai/mcp-server"],
      "env": {
        "Z_AI_API_KEY": "686a80f3d1e34141b9d1f6239b0b137e.iYhXKIWFWPXwjcpd",
        "Z_AI_MODE": "ZAI"
      },
      "disabled": false
    },
    "excel": {
      "command": "npx",
      "args": ["--yes", "@negokaz/excel-mcp-server"],
      "env": {
        "EXCEL_MCP_PAGING_CELLS_LIMIT": "4000"
      },
      "disabled": false
    }
  },
  "tools": [
    "@pencil","@composio","@playwright","@zai-mcp-server","@excel",
    "read","glob","grep","write","shell","aws","web_search","web_fetch",
    "introspect","report","knowledge","thinking","todo","use_subagent"
  ],
  "allowedTools": [
    "@pencil","@composio","@playwright","@zai-mcp-server","@excel",
    "read","glob","grep","write","shell","aws","web_search","web_fetch",
    "introspect","report","knowledge","thinking","todo","use_subagent"
  ],
  "resources": ["skill:///Users/you/.kiro/skills/**/SKILL.md"],
  "prompt": "You are a general purpose agent...",
  "model": "claude-opus-4.5"
}
```

- Edit this file to add/remove MCPs. The Settings dialog simply toggles the `disabled` flag and shows summaries.
- Skills are directories under `~/.kiro/skills`. Each folder is a skill and appears in the UI:

![Settings showing MCPs and Skills](images/settings.png)

---

## Working With Files

- **Uploads:** The paperclip copies files into the current workspace (with collision-safe renaming).
- **FileBar:** Separates created vs accessed files; clicking opens them inline (text/images/PDF/Excel) or via the OS.
- **Slash commands:** `/context`, `/compact`, `/mcp`, etc., run inside the same CLI process.

---

## Security & Permissions

- Tool calls appear as cards so you can approve/deny sensitive actions.
- Workspaces sandbox Kiro to per-task directories.
- External links open via the OS (`shell.openExternal`), keeping the renderer sandboxed.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for additional considerations (no kernel sandbox, relies on Kiro’s permissions, etc.).

---

## Troubleshooting Tips

- **Kiro CLI missing:** Ensure `kiro-cli` is installed or set `KIRO_CLI_PATH`.
- **MCP server not showing:** Edit `~/.kiro/agents/agent_config.json` and refresh Settings.
- **Slash commands do nothing:** Start a session first; slash commands require an active workspace.
- **Long-running `execute_bash`:** Some commands (e.g., interactive `npx`) block until they finish. Add non-interactive flags or run manually if needed.

---

## Sample Applications

1. Audio creation
2. Video creation
3. Excel modelling
4. Helping cancel unwanted subscriptions
5. Social media management
6. Daily tasks (emails, scheduling)

### Video Creation Example

<video width="640" controls src="images/video.mp4"></video>

### Excel Modelling Example

![Excel Modelling Step 1](images/excel1.png)
![Excel Modelling Step 2](images/excel2.png)

---

## Contributing

1. Fork or clone `https://gitlab.aws.dev/wwps-asean-sa-genai/Kiro-Cowork`.
2. Run `bun run dev` for iterative changes.
3. Update docs (`docs/ARCHITECTURE.md`, `docs/INTEGRATION.md`, this `README.md`) when touching architecture or UX.
4. Open a merge request with a clear summary and testing notes.

