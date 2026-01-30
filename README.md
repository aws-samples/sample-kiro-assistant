# Kiro Cowork - an infinitely resourceful agent to help with your daily life

kiro Cowork is a general purpose agent with capabilities similar to that of Manus AI and Anthropic Cowork.The idea behind Kiro Cowork is that it will help every member 
of the society and not just software developers. 

Kiro Cowork is our customized build of the open-source Agent Cowork desktop application. We replace Claude Code CLI with our own Kiro-CLI. 
It also takes advantage of Kiro-CLI features like SubAgent, MCPs, Skills etc.

We improve the UX and capabilities (**500 plus MCP tools & vast array of skills**). It can make audio, professional quality video, presentations, excel models, ppts
and many more things. It can help you with emails, social media, cancelling unwanted subscriptions, filing expenses etc.

As mentioned, the original Agent Cowork build on top of Claude Code SDK and launches it with Claude Agents SDK. We do not have a Kiro SDK yet.
So we develop a custom interface to the Kiro CLI through SQLLiteDatabase where Kiro-CLI stores convesation information.

To summarize:
- 🚀 **Native Electron desktop app** Can help with tasks that you didn't know Kiro could help you with: make Audio, Video, Presentations, help you file expenses, cancel subscriptions and so on.
- 🧠 **Powered entirely by `kiro-cli`** (no Claude CLI required) with Kiro look and feel
- 🧩 **500 MCPs through Composio. Additional MCPs for Excel, Pencil Desktop etc** surfaced inside Settings
- 📂 **Auto-provisioned workspaces** per session under `~/Documents/workspace-kiro-cowork/<task-id>`
- 💾 **SQLite-backed history** so conversations stream in real time and persist across launches

---

# Kiro Cowork is for everyone in the family

We show that Kiro is not only for software developers, but every member of the society, for every member in your family (accessabilty features coming soon..)

![Kiro Cowork Concept](images/KiroCoworkConcept.png)

---

# Kiro Cowork is highly versatile

Kiro Cowork has 500+ tools through Composio (ElevanLab for audio, HeyGen for video, Gmail, X tools etc.). 

It can also use local MCPs for Excel and other development environments like Blender, Pencil Desktop etc. As long as you haev an MCP, it will figure out how to use it opportunistically.
We have added **playwright** MCP to allow it ability to handle browsers.
We have added **ZAI MCPs** to give it ability to deal with PDFs, Images etc. when the model being used is not multimodal.

It also has a skill repository, e.g. to make 3D animation with threejs and professional video with Remotion. You can add more skills. Skills are loaded dynamically.
That is how skills work.

Even we don't know what it is fully capable of. Please give it a shot!

![Kiro Cowork Versatility](images/KiroApplications.png)

---

## Deceptively simple interface

Task: Make me an audio podcast of 3 minutes on moltbot controvery. I want to upload it to youtube, so create a display image and combine it with mp3 to give me an MP4.

![Kiro Cowork UX](images/KiroCowork.png)

---

## Model & Provider Compatibility

If a model works in `kiro-cli`, it works in Kiro Cowork. So for example, MiniMax M2 can be selected in Kiro CLI, so it will work with Kiro Cowork.
You set default model in ~/.kiro/settings/cli.json

---

## Promoting builder culture

Launch of Claude Cowrker closely followed by OpenClaw (earlier called Clawdbot, later named to Moltbot) has worken up the popular culture to the power of general purpose agents.
We want Amazonians and Amazon customers to equally be able to build general purpose agents following their approches but secure and scalable AWS stack.

Hence, we document this project extensively in the /docs folder: 
[ARCHITECTURE.md](/docs/ARCHITECTURE.md),
[INTEGRATION.md](/docs/INTEGRATION.md),
[GITLAB.md](/docs/GITLAB.md),
[WORKING_DIRECTORY](/docs/WORKING_DIRECTORY.md).



We highly encourage you to start contributing to the project. Kiro-CLI is awesome. Let us show its power to the society.

---

## Architecture Overview

The architecture is simple. It trusts models to be resourceful and figure out a way. We use powerful models and give them necessary tools. In a way it is inspired
by the "bitter lesson".

![Kiro Cowork Principle](images/KiroCoworkPrinciple.png)

Agent Cowork uses Cloud Code CLI which has a nice SDK called Claude Agents SDK. We don't have it with Kiro CLI. But we figured out a way by using SQLLiteDB maintained by Kiro CLI cleverly as shown in the diagram.

![Agent Cowork vs Kiro Cowork](images/AgentCoworkvsKiroCoworker.png)

This is a technical diagram of various components involved.

![Kiro Cowork Architecture](images/architecture.png)

This is a view of the SQLLite database. Every row represents a session.

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
You may use these configurations as they are, just remember to place your keys for Composio (that provides search over 500 MCP tools) and ZAI MCP in respective
Replace_with_your_key field.

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
        "x-api-key": "Replace_with_your_key"
      },
      "disabled": false
    },
    "zai-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@z_ai/mcp-server"],
      "env": {
        "Z_AI_API_KEY": "Replace_with_your_key",
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
- Adding skills is easy. You can add them by copying folders to the above mentioned parth, or you can add them using npx command and selecting Kiro option. They will show up in Settings dialogue.
**npx skills add remotion-dev/skills`**

![Settings showing MCPs and Skills](images/settings.png)

---

## Working With Files

- **Uploads:** The paperclip copies files into the current workspace (with collision-safe renaming).
- **FileBar:** Separates created vs accessed files; clicking opens them inline (text/images/PDF/Excel) or via the OS.
---

## Troubleshooting Tips

- **Kiro CLI missing:** Ensure `kiro-cli` is installed or set `KIRO_CLI_PATH`.
- **MCP server not showing:** Edit `~/.kiro/agents/agent_config.json` and refresh Settings.
- **Long-running `execute_bash`:** Some commands (e.g., interactive `npx`) block until they finish. You can ask Kiro Cowork to run them without user input.
---

## Sample Applications

1. Audio creation
2. Video creation
3. Excel modelling
4. Helping cancel unwanted subscriptions
5. Social media management
6. Daily tasks (emails, scheduling)

### Product Video Creation Example (click on the image)

It has many skills for PPTs, Excel, Videos etc. Here is a simple promotional video it made using Remotion-Best-Practices skill.

  <a href="https://www.youtube.com/watch?v=s46r3NS1V38">
    <img src="https://img.youtube.com/vi/s46r3NS1V38/0.jpg" alt="Kiro announcement" width="100%">
  </a>


### Converting articles to audio and video podcasts, great for making training videos (click on the image)
You can give it article that you don't have time to read. It can convert them to audio podcasts.

You can even ask it do research for you and make the output into podcasts so you can listen while doing mundane activities.
For example, here it is making a podcast for me on Moltbot controversy. It 1/ did the research, 2/ wrote a script, 3/ produced audio using ElevanLabs (MP3), 
4/ produced a poster, 5/ stitched together the poster and MP3 to produce MP4 using FFMPEG. 

Just listen and remember this is all being orchestrated autonomously by Kiro-CLI. I did not have to do anything.

  <a href="https://www.youtube.com/watch?v=NSRqhYI8oeo">
    <img src="https://img.youtube.com/vi/NSRqhYI8oeo/0.jpg" alt="Video podcast creation" width="100%">
  </a>


If you want to record a training video, you can give it text and it will make a perfectly edited video for you.
  <a href="https://www.youtube.com/watch?v=468Kns96eLA">
    <img src="https://img.youtube.com/vi/468Kns96eLA/0.jpg" alt="Video podcast creation" width="100%">
  </a>


### Excel Modelling Example

Antrhopic announced Claude for Excel. We tried capability of Kiro Cowork to do research and build excel models, it exceeded our expectations.
Below are screenshot of the excel model it built to show impact of AI bool on MAG7 stocks and Saas stocks.

It got this data from reputable sources.

![Excel Modelling Step 1](images/excel1.png)

It didn't just build great tables, it also built great meaningful visualizations.

![Excel Modelling Step 2](images/excel2.png)

---

## Contributing

1. Fork or clone `https://gitlab.aws.dev/wwps-asean-sa-genai/Kiro-Cowork`.
2. Run `bun run dev` for iterative changes.
3. Update docs (`docs/ARCHITECTURE.md`, `docs/INTEGRATION.md`, this `README.md`) when touching architecture or UX.
4. Open a merge request with a clear summary and testing notes.
---

## Roadmap

1. Add voice interface
2. Fix the issue with MCP Servers that need Web Socket connections (e.g. Pencil Desktop MCP). This issue is not there when using Claude Code CLI.
3. Sanbox to working directory and select network addresses (Kiro CLI does not yet support Sandboxing)
4. Integrate Kiro CLI with help of Kiro SDK once it is released, replacing current arrangement of getting Kiro-CLI responses through SQLLite database. It makes the application a bit slow.
However, the worst impact is when the CLI tries to run a command that needs user response when running it with "execute_bash". It just keeps waiting and the UX is not updated, so user doesn't understand what is going on.
---

## Recommednations for the Kiro team (Remove before open sourcing on Github)

1. Allow Kiro-CLI to stream its output as JSON responses as Claude Code CLI does. This makes integration easy, even in absence of an official Kiro SDK.
2. Deliver Kiro SDK no later than Feb 2026. Kiro CLI has potential to be used as general purpose agent, as well as, as a building block for enterprise applications. However, not having an official SDK makes it hard.
3. Enable **token based billing** in Kiro CLI i.e. allow people to use their Bedrock keys so enterprise could use it as a building block for their agentic application.
4. Enable **sandbox** feature in Kiro-CLI ASAP so its access on the local desktop can be limited.
---

## License

The project started with this base https://github.com/DevAgentForge/Claude-Cowork which is under MIT. This project is also released under MIT. Kiro-CLI is an Amazon Web Services product (all right reserved).

---

## Comments on security

It runs on local machine, and accesses files from working directories. It access models on Bedrock through Kiro-CLI. It is no different from using Kiro-CLI. It calls external APIs with users’ own account (OAuth). These are the services that users already trust. There is a proper login flow that helps user log in into services like ElevanLabs, HeyGen, Gmail etc.
Local MCPs like excel, playwright don’t need credentials. We also use ZAI MCPs for dealing with PDFs, Images etc. It gets automatically used if the model being used is not multimodal. User can remove any of the MCPs they don’t prefer.

This project is to be used only with non-sensitive, non official data.  Typical advisory applicable for any GenAI service applies to this one.

**Remember this is not a production ready project for your sensitive data!**

**Remember this is not a reference architecture, but a prototype.**