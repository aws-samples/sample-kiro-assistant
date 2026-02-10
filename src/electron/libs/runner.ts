import { spawn } from "node:child_process";
import type { ServerEvent, StreamMessage } from "../types.js";
import type { Session } from "./session-store.js";
import { enhancedEnv, normalizeWorkingDirectory } from "./util.js";
import { resolveKiroCliBinary } from "./kiro-cli.js";
import { loadKiroConversation } from "./kiro-conversation.js";
import { convertKiroHistoryEntries } from "./kiro-message-adapter.js";

export type RunnerOptions = {
  prompt: string;
  session: Session;
  resumeSessionId?: string;
  onEvent: (event: ServerEvent) => void;
  onSessionUpdate?: (updates: Partial<Session>) => void;
};

export type RunnerHandle = {
  abort: () => void;
};

const DEFAULT_CWD = process.cwd();

const sendStreamMessage = (
  sessionId: string,
  message: StreamMessage,
  onEvent: RunnerOptions["onEvent"]
) => {
  if (message.type === "user_prompt") {
    onEvent({
      type: "stream.user_prompt",
      payload: { sessionId, prompt: message.prompt }
    });
    return;
  }
  onEvent({
    type: "stream.message",
    payload: { sessionId, message }
  });
};

const emitRunnerError = (message: string, options: RunnerOptions) => {
  options.onEvent({
    type: "runner.error",
    payload: { sessionId: options.session.id, message }
  });
  options.onEvent({
    type: "session.status",
    payload: {
      sessionId: options.session.id,
      status: "error",
      title: options.session.title,
      cwd: options.session.cwd,
      error: message
    }
  });
};

export async function runClaude(options: RunnerOptions): Promise<RunnerHandle> {
  const { prompt, session, resumeSessionId, onEvent, onSessionUpdate } = options;
  const binary = resolveKiroCliBinary();
  if (!binary) {
    emitRunnerError("Could not find the kiro-cli binary on PATH or in /Applications.", options);
    return { abort: () => undefined };
  }

  const normalizedCwd = normalizeWorkingDirectory(session.cwd) ?? DEFAULT_CWD;
  const model = (process.env.KIRO_DEFAULT_MODEL ?? "claude-opus-4.5").trim();
  const agent = (process.env.KIRO_AGENT ?? "kiro-assistant").trim();
  const interactive = session.interactive === true;
  const args = ["chat", "--trust-all-tools", "--wrap", "never"];
  if (!interactive) {
    args.splice(1, 0, "--no-interactive");
  }
  if (model) {
    args.push("--model", model);
  }
  if (agent) {
    args.push("--agent", agent);
  }
  if (resumeSessionId) {
    args.push("--resume");
  }
  if (prompt.trim().length) {
    args.push(prompt);
  }

  const child = spawn(binary, args, {
    cwd: normalizedCwd,
    env: {
      ...enhancedEnv,
      NO_COLOR: "1",
      CLICOLOR: "0",
      KIRO_CLI_DISABLE_PAGER: "1"
    }
  });

  let closed = false;
  let aborted = false;

  child.stdout?.on("data", (data) => {
    const text = data.toString();
    if (text.trim()) {
      console.info("[kiro-cli]", text.trim());
    }
  });
  child.stderr?.on("data", (data) => {
    const text = data.toString();
    if (text.trim()) {
      console.warn("[kiro-cli]", text.trim());
    }
  });

  child.on("error", (error) => {
    if (closed) return;
    closed = true;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    emitRunnerError(error.message || "Failed to launch kiro-cli.", options);
  });

  const syncConversation = (throwOnMissing = true) => {
    const record = loadKiroConversation(normalizedCwd);
    if (!record) {
      if (throwOnMissing) {
        throw new Error("No conversation history was written by kiro-cli.");
      }
      return false;
    }

    const totalEntries = Array.isArray(record.history) ? record.history.length : 0;
    const previousCursor = Math.max(0, session.kiroHistoryCursor ?? 0);
    const cursor = Math.min(previousCursor, totalEntries);
    const newEntries = record.history.slice(cursor);
    const streamMessages = convertKiroHistoryEntries(newEntries, record.conversationId);

    for (const message of streamMessages) {
      sendStreamMessage(session.id, message, onEvent);
    }

    session.kiroConversationId = record.conversationId;
    session.kiroHistoryCursor = totalEntries;

    onSessionUpdate?.({
      kiroConversationId: record.conversationId,
      kiroHistoryCursor: totalEntries
    });
    return streamMessages.length > 0;
  };

  let pollTimer: NodeJS.Timeout | null = setInterval(() => {
    try {
      syncConversation(false);
    } catch (error) {
      console.warn("Failed to sync kiro conversation:", error);
    }
  }, 750);

  child.on("close", (code, signal) => {
    if (closed) return;
    closed = true;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    try {
      syncConversation(true);
      if (!aborted) {
        onEvent({
          type: "session.status",
          payload: {
            sessionId: session.id,
            status: code === 0 ? "completed" : "error",
            title: session.title,
            cwd: session.cwd,
            error: code === 0 ? undefined : `kiro-cli exited with code ${code ?? "unknown"}`.trim()
          }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read kiro-cli conversation log.";
      emitRunnerError(message, options);
    }
  });

  return {
    abort: () => {
      if (closed) return;
      aborted = true;
      child.kill("SIGINT");
    }
  };
}
