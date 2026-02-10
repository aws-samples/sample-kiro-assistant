import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentPermissionResult } from "../shared/agent-schema.js";
import { useIPC } from "./hooks/useIPC";
import { useAppStore } from "./store/useAppStore";
import type { ServerEvent, CreatedFile } from "./types";
import { Sidebar } from "./components/Sidebar";
import { StartSessionModal } from "./components/StartSessionModal";
import { PromptInput, usePromptActions } from "./components/PromptInput";
import { MessageCard } from "./components/EventCard";
import { FileBar } from "./components/FileBar";
import { FileSidebar } from "./components/FileSidebar";
import MDContent from "./render/markdown";
import { SettingsModal } from "./components/SettingsModal";

function App() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const partialMessageRef = useRef("");
  const [partialMessage, setPartialMessage] = useState("");
  const [showPartialMessage, setShowPartialMessage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fileBarCollapsed, setFileBarCollapsed] = useState(false);

  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const showStartModal = useAppStore((s) => s.showStartModal);
  const setShowStartModal = useAppStore((s) => s.setShowStartModal);
  const globalError = useAppStore((s) => s.globalError);
  const setGlobalError = useAppStore((s) => s.setGlobalError);
  const historyRequested = useAppStore((s) => s.historyRequested);
  const commandResult = useAppStore((s) => s.commandResult);
  const setCommandResult = useAppStore((s) => s.setCommandResult);
  const markHistoryRequested = useAppStore((s) => s.markHistoryRequested);
  const resolvePermissionRequest = useAppStore((s) => s.resolvePermissionRequest);
  const handleServerEvent = useAppStore((s) => s.handleServerEvent);
  const prompt = useAppStore((s) => s.prompt);
  const setPrompt = useAppStore((s) => s.setPrompt);
  const pendingStart = useAppStore((s) => s.pendingStart);

  // File sidebar state
  const fileSidebarOpen = useAppStore((s) => s.fileSidebarOpen);
  const setFileSidebarOpen = useAppStore((s) => s.setFileSidebarOpen);
  const fileSidebarWidth = useAppStore((s) => s.fileSidebarWidth);
  const setFileSidebarWidth = useAppStore((s) => s.setFileSidebarWidth);
  const openedFile = useAppStore((s) => s.openedFile);
  const setOpenedFile = useAppStore((s) => s.setOpenedFile);
  const fileContent = useAppStore((s) => s.fileContent);
  const setFileContent = useAppStore((s) => s.setFileContent);
  const fileType = useAppStore((s) => s.fileType);
  const setFileType = useAppStore((s) => s.setFileType);
  const fileSheetNames = useAppStore((s) => s.fileSheetNames);
  const setFileSheetNames = useAppStore((s) => s.setFileSheetNames);
  const fileLoading = useAppStore((s) => s.fileLoading);
  const setFileLoading = useAppStore((s) => s.setFileLoading);

  // Helper function to extract partial message content
  const getPartialMessageContent = (eventMessage: any) => {
    try {
      const realType = eventMessage.delta.type.split("_")[0];
      return eventMessage.delta[realType];
    } catch (error) {
      console.error(error);
      return "";
    }
  };

  // Handle partial messages from stream events
  const handlePartialMessages = useCallback((partialEvent: ServerEvent) => {
    if (partialEvent.type !== "stream.message" || partialEvent.payload.message.type !== "stream_event") return;

    const message = partialEvent.payload.message as any;
    if (message.event.type === "content_block_start") {
      partialMessageRef.current = "";
      setPartialMessage(partialMessageRef.current);
      setShowPartialMessage(true);
    }

    if (message.event.type === "content_block_delta") {
      partialMessageRef.current += getPartialMessageContent(message.event) || "";
      setPartialMessage(partialMessageRef.current);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    if (message.event.type === "content_block_stop") {
      setShowPartialMessage(false);
      setTimeout(() => {
        partialMessageRef.current = "";
        setPartialMessage(partialMessageRef.current);
      }, 500);
    }
  }, []);

  // Combined event handler
  const onEvent = useCallback((event: ServerEvent) => {
    handleServerEvent(event);
    handlePartialMessages(event);
  }, [handleServerEvent, handlePartialMessages]);

  const { connected, sendEvent } = useIPC(onEvent);
  const promptActions = usePromptActions(sendEvent);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const messages = activeSession?.messages ?? [];
  const permissionRequests = activeSession?.permissionRequests ?? [];
  const isRunning = activeSession?.status === "running";
  const sessionFiles = activeSession?.createdFiles ?? [];
  const createdFiles = sessionFiles.filter((file) => file.kind === "created");
  const accessedFiles = sessionFiles.filter((file) => file.kind === "accessed");

  // Handle file click - open in sidebar
  const handleFileClick = useCallback(async (file: CreatedFile) => {
    setOpenedFile(file);
    setFileSidebarOpen(true);
    setFileLoading(true);
    setFileContent(null);
    setFileType(null);
    setFileSheetNames(undefined);

    try {
      const result = await window.electron.readFile(file.path);
      if (result.success) {
        setFileContent(result.content || null);
        setFileType(result.fileType || null);
        setFileSheetNames(result.sheetNames);
      } else {
        console.error("Failed to read file:", result.error);
        setFileType('unknown');
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setFileType('unknown');
    } finally {
      setFileLoading(false);
    }
  }, [setOpenedFile, setFileSidebarOpen, setFileLoading, setFileContent, setFileType, setFileSheetNames]);

  // Handle opening file externally
  const handleOpenExternal = useCallback(async (file: CreatedFile) => {
    try {
      await window.electron.openFileExternal(file.path);
    } catch (error) {
      console.error("Error opening file externally:", error);
    }
  }, []);

  // Handle closing file sidebar
  const handleCloseSidebar = useCallback(() => {
    setFileSidebarOpen(false);
    setOpenedFile(null);
    setFileContent(null);
    setFileType(null);
    setFileSheetNames(undefined);
  }, [setFileSidebarOpen, setOpenedFile, setFileContent, setFileType, setFileSheetNames]);

  useEffect(() => {
    if (connected) sendEvent({ type: "session.list" });
  }, [connected, sendEvent]);

  useEffect(() => {
    if (!activeSessionId || !connected) return;
    const session = sessions[activeSessionId];
    if (session && !session.hydrated && !historyRequested.has(activeSessionId)) {
      markHistoryRequested(activeSessionId);
      sendEvent({ type: "session.history", payload: { sessionId: activeSessionId } });
    }
  }, [activeSessionId, connected, sessions, historyRequested, markHistoryRequested, sendEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partialMessage]);

  const handleNewSession = useCallback(() => {
    useAppStore.getState().setActiveSessionId(null);
    setShowStartModal(true);
  }, [setShowStartModal]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    sendEvent({ type: "session.delete", payload: { sessionId } });
  }, [sendEvent]);

  const handlePermissionResult = useCallback((toolUseId: string, result: AgentPermissionResult) => {
    if (!activeSessionId) return;
    sendEvent({ type: "permission.response", payload: { sessionId: activeSessionId, toolUseId, result } });
    resolvePermissionRequest(activeSessionId, toolUseId);
  }, [activeSessionId, sendEvent, resolvePermissionRequest]);

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar
        connected={connected}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main
        className="flex flex-1 flex-col ml-[280px] bg-surface-cream transition-all duration-200"
        style={{ marginRight: fileSidebarOpen ? `${fileSidebarWidth}px` : 0 }}
      >
        <div 
          className="flex items-center justify-center h-12 border-b border-ink-900/10 bg-surface-cream select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-sm font-medium text-ink-700">{activeSession?.title || "Kiro Assistant"}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-40 pt-6">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-lg font-medium text-ink-700">No messages yet</div>
                <p className="mt-2 text-sm text-muted">Start a conversation with Kiro Assistant</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageCard
                  key={idx}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  isRunning={isRunning}
                  permissionRequest={permissionRequests[0]}
                  onPermissionResult={handlePermissionResult}
                />
              ))
            )}

            {/* Partial message display with skeleton loading */}
            <div className="partial-message">
              <MDContent text={partialMessage} />
              {showPartialMessage && (
                <div className="mt-3 flex flex-col gap-2 px-1">
                  <div className="relative h-3 w-2/12 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-4/12 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>
        </div>

        <FileBar
          createdFiles={createdFiles}
          accessedFiles={accessedFiles}
          collapsed={fileBarCollapsed}
          onToggleCollapse={() => setFileBarCollapsed((prev) => !prev)}
          onFileClick={handleFileClick}
          onOpenExternal={handleOpenExternal}
        />

        <PromptInput actions={promptActions} />
      </main>

      {fileSidebarOpen && (
        <FileSidebar
          file={openedFile}
          content={fileContent}
          fileType={fileType}
          sheetNames={fileSheetNames}
          loading={fileLoading}
          width={fileSidebarWidth}
          onWidthChange={setFileSidebarWidth}
          onClose={handleCloseSidebar}
          onOpenExternal={handleOpenExternal}
        />
      )}

      {showStartModal && (
        <StartSessionModal
          prompt={prompt}
          pendingStart={pendingStart}
          onPromptChange={setPrompt}
          onStart={promptActions.handleStartFromModal}
          onClose={() => setShowStartModal(false)}
        />
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {globalError && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-error/20 bg-error-light px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-error">{globalError}</span>
            <button className="text-error hover:text-error/80" onClick={() => setGlobalError(null)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
      {commandResult && (
        <div className="fixed bottom-40 left-1/2 z-50 w-[90%] max-w-3xl -translate-x-1/2 rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase text-muted tracking-wide">Claude command</div>
              <div className="font-mono text-sm text-ink-900">{commandResult.command}</div>
            </div>
            <button className="text-ink-400 hover:text-ink-700" onClick={() => setCommandResult(null)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {commandResult.stdout && (
              <div>
                <div className="text-xs font-semibold text-ink-600">stdout</div>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-surface p-2 text-xs text-ink-800 whitespace-pre-wrap break-words">
                  {commandResult.stdout}
                </pre>
              </div>
            )}
            {commandResult.stderr && (
              <div>
                <div className="text-xs font-semibold text-error">stderr</div>
                <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-error/10 p-2 text-xs text-error whitespace-pre-wrap break-words">
                  {commandResult.stderr}
                </pre>
              </div>
            )}
            {commandResult.error && (
              <div className="text-sm text-error font-medium">{commandResult.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
