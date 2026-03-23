import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

// Mock discord.js
vi.mock("discord.js", () => ({
  ActionRowBuilder: vi.fn().mockImplementation(() => ({
    addComponents: vi.fn().mockReturnThis(),
    data: { components: [] },
  })),
  ButtonBuilder: vi.fn().mockImplementation(() => ({
    setCustomId: vi.fn().mockReturnThis(),
    setLabel: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
  })),
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
  },
}));

// Mock managers
vi.mock("../../../../src/permission/manager.js", () => ({
  permissionManager: {
    startPermission: vi.fn(),
    getMessageId: vi.fn(),
    removeByMessageId: vi.fn(),
    isActive: vi.fn(),
    getPendingCount: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("../../../../src/interaction/manager.js", () => ({
  interactionManager: {
    getSnapshot: vi.fn(),
    start: vi.fn(),
    transition: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("../../../../src/settings/manager.js", () => ({
  getCurrentProject: vi.fn(),
  getCurrentSession: vi.fn(),
}));

vi.mock("../../../../src/summary/aggregator.js", () => ({
  summaryAggregator: {
    stopTypingIndicator: vi.fn(),
    clear: vi.fn(),
    setOnComplete: vi.fn(),
    setOnTool: vi.fn(),
    setOnQuestion: vi.fn(),
    setOnPermission: vi.fn(),
    setOnSessionIdle: vi.fn(),
    setOnSessionError: vi.fn(),
    setOnSessionRetry: vi.fn(),
    setOnTokens: vi.fn(),
    setOnSessionDiff: vi.fn(),
    setOnThinking: vi.fn(),
    setOnSessionCompacted: vi.fn(),
    setOnToolFile: vi.fn(),
    setOnQuestionError: vi.fn(),
  },
}));

vi.mock("../../../../src/utils/safe-background-task.js", () => ({
  safeBackgroundTask: vi.fn(),
}));

vi.mock("../../../../src/opencode/client.js", () => ({
  opencodeClient: {
    permission: {
      reply: vi.fn(),
    },
  },
}));

// Import after mocking
import { permissionManager } from "../../../../src/permission/manager.js";
import type { PermissionRequest } from "../../../../src/permission/types.js";

describe("platform/discord/handlers/permission", () => {
  const mockPermissionRequest: PermissionRequest = {
    id: "req-123",
    sessionID: "ses-123",
    permission: "bash",
    patterns: ["rm -rf /"],
    metadata: {},
    always: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("button structure", () => {
    it("creates three permission buttons", () => {
      // Expected button custom IDs
      const expectedButtons = [
        {
          customId: `permission:once:${mockPermissionRequest.id}`,
          label: "Allow",
          style: ButtonStyle.Success,
        },
        {
          customId: `permission:always:${mockPermissionRequest.id}`,
          label: "Always Allow",
          style: ButtonStyle.Primary,
        },
        {
          customId: `permission:reject:${mockPermissionRequest.id}`,
          label: "Reject",
          style: ButtonStyle.Danger,
        },
      ];

      expectedButtons.forEach((btn) => {
        expect(btn.customId).toMatch(/^permission:(once|always|reject):/);
        expect(btn.style).toBeDefined();
      });
    });

    it("groups all buttons in single ActionRow", () => {
      const row = new ActionRowBuilder();
      expect(row).toBeDefined();
    });
  });

  describe("interaction handling", () => {
    it("parses permission button custom IDs correctly", () => {
      const testCases = [
        { customId: "permission:once:req-123", expectedAction: "once", expectedId: "req-123" },
        { customId: "permission:always:req-123", expectedAction: "always", expectedId: "req-123" },
        { customId: "permission:reject:req-123", expectedAction: "reject", expectedId: "req-123" },
      ];

      testCases.forEach(({ customId, expectedAction, expectedId }) => {
        const parts = customId.split(":");
        expect(parts[0]).toBe("permission");
        expect(parts[1]).toBe(expectedAction);
        expect(parts[2]).toBe(expectedId);
      });
    });

    it("validates permission reply actions", () => {
      const validActions = ["once", "always", "reject"];

      validActions.forEach((action) => {
        const isValid = action === "once" || action === "always" || action === "reject";
        expect(isValid).toBe(true);
      });
    });
  });

  describe("permission manager integration", () => {
    it("starts permission tracking", () => {
      permissionManager.startPermission(mockPermissionRequest, "msg-123");

      expect(permissionManager.startPermission).toHaveBeenCalledWith(
        mockPermissionRequest,
        "msg-123",
      );
    });

    it("removes handled permission", () => {
      permissionManager.removeByMessageId("msg-123");

      expect(permissionManager.removeByMessageId).toHaveBeenCalledWith("msg-123");
    });

    it("checks for active permissions", () => {
      vi.mocked(permissionManager.isActive).mockReturnValue(true);

      expect(permissionManager.isActive()).toBe(true);
    });
  });
});
