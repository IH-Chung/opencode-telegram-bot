import type { PlatformMessageRef, FileChange } from "../types.js";

// Re-export types that moved to platform/types.ts for backward compatibility
export type { FileChange, TokensInfo } from "../types.js";

/**
 * State of the pinned status message
 */
export interface PinnedMessageState {
  messageId: PlatformMessageRef | null;
  chatId: number | null;
  sessionId: string | null;
  sessionTitle: string;
  projectName: string;
  tokensUsed: number;
  tokensLimit: number;
  lastUpdated: number;
  changedFiles: FileChange[];
}
