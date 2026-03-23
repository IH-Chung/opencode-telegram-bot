import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DiscordPinnedMessageManager } from "../../../src/platform/discord/pinned-manager.js";
import type { FileChange } from "../../../src/platform/types.js";
import * as settingsManager from "../../../src/settings/manager.js";

// Mock settings manager
vi.mock("../../../src/settings/manager.js", () => ({
  getPinnedMessageId: vi.fn().mockReturnValue(undefined),
  setPinnedMessageId: vi.fn(),
  clearPinnedMessageId: vi.fn(),
}));

// Mock the formatter module
vi.mock("../../../src/platform/discord/formatter.js", () => ({
  createStatusEmbed: vi.fn().mockReturnValue({
    setTitle: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setTimestamp: vi.fn().mockReturnThis(),
    addFields: vi.fn().mockReturnThis(),
    data: {},
  }),
}));

// Create mock adapter with all methods as spies
function createMockAdapter() {
  return {
    info: { platform: "discord" as const, messageMaxLength: 2000, documentCaptionMaxLength: 2000 },
    setChatId: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue("msg-123"),
    sendEmbed: vi.fn().mockResolvedValue("msg-embed-456"),
    editMessage: vi.fn().mockResolvedValue(undefined),
    editEmbed: vi.fn().mockResolvedValue(undefined),
    sendDocument: vi.fn().mockResolvedValue("doc-msg-789"),
    sendPhoto: vi.fn().mockResolvedValue("photo-msg-012"),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    pinMessage: vi.fn().mockResolvedValue(undefined),
    unpinAllMessages: vi.fn().mockResolvedValue(undefined),
    answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    sendTyping: vi.fn().mockResolvedValue(undefined),
    setCommands: vi.fn().mockResolvedValue(undefined),
    getFileUrl: vi.fn().mockResolvedValue("http://example.com/file"),
  };
}

describe("platform/discord/pinned-manager", () => {
  let manager: DiscordPinnedMessageManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAdapter: any;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new DiscordPinnedMessageManager();
    mockAdapter = createMockAdapter();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("initialize", () => {
    it("sets up adapter", () => {
      manager.initialize(mockAdapter);
      expect(manager.isInitialized()).toBe(true);
    });

    it("restores pinned message ID from settings", () => {
      vi.mocked(settingsManager.getPinnedMessageId).mockReturnValueOnce("saved-msg-id");

      manager.initialize(mockAdapter);

      expect(manager.getState().messageRef).toBe("saved-msg-id");
    });
  });

  describe("onSessionChanged", () => {
    it("resets tokens and creates new pinned embed", async () => {
      manager.initialize(mockAdapter);

      await manager.onSessionChanged("session-1", "My Session", "my-project");

      expect(mockAdapter.unpinAllMessages).toHaveBeenCalled();
      expect(mockAdapter.sendEmbed).toHaveBeenCalled();
      expect(mockAdapter.pinMessage).toHaveBeenCalled();
      expect(manager.getState().sessionTitle).toBe("My Session");
      expect(manager.getState().projectName).toBe("my-project");
      expect(manager.getState().tokensUsed).toBe(0);
    });

    it("uses default session title when none provided", async () => {
      manager.initialize(mockAdapter);

      await manager.onSessionChanged("session-1", "", "my-project");

      expect(manager.getState().sessionTitle).toBe("No active session");
    });
  });

  describe("onTokensUpdated", () => {
    it("updates state", async () => {
      manager.initialize(mockAdapter);

      await manager.onTokensUpdated(50000, 200000);

      expect(manager.getState().tokensUsed).toBe(50000);
      expect(manager.getState().tokensLimit).toBe(200000);
    });

    it("only updates limit if positive", async () => {
      manager.initialize(mockAdapter);

      await manager.onTokensUpdated(50000, 0);

      expect(manager.getState().tokensUsed).toBe(50000);
      expect(manager.getState().tokensLimit).toBe(0);
    });
  });

  describe("onFilesChanged", () => {
    it("updates changed files state", async () => {
      manager.initialize(mockAdapter);

      const files: FileChange[] = [
        { file: "src/index.ts", additions: 10, deletions: 2 },
        { file: "src/bot.ts", additions: 5, deletions: 1 },
      ];

      await manager.onFilesChanged(files);

      expect(manager.getState().changedFiles).toEqual(files);
    });
  });

  describe("onModelChanged", () => {
    it("updates model name state", async () => {
      manager.initialize(mockAdapter);

      await manager.onModelChanged("claude-3.5-sonnet");

      expect(manager.getState().modelName).toBe("claude-3.5-sonnet");
    });

    it("uses empty string when model is undefined", async () => {
      manager.initialize(mockAdapter);

      await manager.onModelChanged("");

      expect(manager.getState().modelName).toBe("");
    });
  });

  describe("onAgentChanged", () => {
    it("updates agent name state", async () => {
      manager.initialize(mockAdapter);

      await manager.onAgentChanged("build");

      expect(manager.getState().agentName).toBe("build");
    });
  });

  describe("onSessionIdle", () => {
    it("sets status to idle", async () => {
      manager.initialize(mockAdapter);

      await manager.onSessionIdle();

      expect(manager.getState().status).toBe("idle");
    });
  });

  describe("onSessionBusy", () => {
    it("sets status to busy", async () => {
      manager.initialize(mockAdapter);

      await manager.onSessionBusy();

      expect(manager.getState().status).toBe("busy");
    });
  });

  describe("onSessionError", () => {
    it("sets status to error", async () => {
      manager.initialize(mockAdapter);

      await manager.onSessionError();

      expect(manager.getState().status).toBe("error");
    });
  });

  describe("pinned message creation", () => {
    it("creates pinned embed on first call", async () => {
      manager.initialize(mockAdapter);

      await manager.onSessionChanged("session-1", "Test Session", "test-project");

      expect(mockAdapter.sendEmbed).toHaveBeenCalledTimes(1);
      expect(mockAdapter.pinMessage).toHaveBeenCalled();
    });

    it("persists pinned message ID in settings", async () => {
      manager.initialize(mockAdapter);
      await manager.onSessionChanged("session-1", "Test Session", "test-project");

      expect(settingsManager.setPinnedMessageId).toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("resets state and unpins messages", async () => {
      manager.initialize(mockAdapter);
      await manager.onSessionChanged("session-1", "Test Session", "test-project");

      await manager.clear();

      expect(mockAdapter.unpinAllMessages).toHaveBeenCalled();
      expect(manager.getState().messageRef).toBeNull();
      expect(manager.getState().tokensUsed).toBe(0);
      expect(manager.getState().status).toBe("idle");
    });

    it("clears settings when not initialized", () => {
      manager.clear();

      expect(settingsManager.clearPinnedMessageId).toHaveBeenCalled();
    });
  });

  describe("getState", () => {
    it("returns a copy of current state", () => {
      manager.initialize(mockAdapter);

      const state1 = manager.getState();
      const state2 = manager.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe("isInitialized", () => {
    it("returns false before initialization", () => {
      expect(manager.isInitialized()).toBe(false);
    });

    it("returns true after initialization", () => {
      manager.initialize(mockAdapter);
      expect(manager.isInitialized()).toBe(true);
    });
  });
});
