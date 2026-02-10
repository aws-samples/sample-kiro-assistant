import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const WORKSPACE_ROOT = join(homedir(), "Documents", "workspace-kiro-assistant");

const pad = (value: number, length = 2) => value.toString().padStart(length, "0");

const timestampSuffix = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

export function ensureWorkspaceRoot(): string {
  if (!existsSync(WORKSPACE_ROOT)) {
    mkdirSync(WORKSPACE_ROOT, { recursive: true });
  }
  return WORKSPACE_ROOT;
}

export function createWorkspaceDirectory(): string {
  const root = ensureWorkspaceRoot();
  const baseName = `task-${timestampSuffix()}`;
  let candidate = baseName;
  let counter = 1;

  while (existsSync(join(root, candidate))) {
    candidate = `${baseName}-${pad(counter++, 2)}`;
  }

  const fullPath = join(root, candidate);
  mkdirSync(fullPath, { recursive: true });
  return fullPath;
}

export function getWorkspaceRoot(): string {
  return WORKSPACE_ROOT;
}
