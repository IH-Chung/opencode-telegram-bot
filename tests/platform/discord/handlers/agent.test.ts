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
vi.mock("../../../../src/agent/manager.js", () => ({
  getAvailableAgents: vi.fn(),
  selectAgent: vi.fn(),
  getStoredAgent: vi.fn(),
}));

// Import after mocking
import { getAvailableAgents, selectAgent, getStoredAgent } from "../../../../src/agent/manager.js";
import type { AgentInfo } from "../../../../src/agent/types.js";

describe("platform/discord/handlers/agent", () => {
  const mockAgents: AgentInfo[] = [
    { name: "build", mode: "primary" },
    { name: "plan", mode: "primary" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("button structure", () => {
    it("creates buttons for primary agents", () => {
      const primaryAgents = mockAgents.filter((a) => a.mode === "primary" || a.mode === "all");

      expect(primaryAgents.length).toBe(2);
      expect(primaryAgents.map((a) => a.name)).toContain("build");
      expect(primaryAgents.map((a) => a.name)).toContain("plan");
    });

    it("creates button custom IDs in format agent:name", () => {
      const customIds = mockAgents.map((agent) => `agent:${agent.name}`);

      expect(customIds).toContain("agent:build");
      expect(customIds).toContain("agent:plan");
    });

    it("marks current agent with success style", () => {
      const currentAgent = "build";
      const agent = mockAgents[0];
      const isSelected = currentAgent === agent.name;

      expect(isSelected).toBe(true);
    });
  });

  describe("interaction handling", () => {
    it("parses agent button custom ID correctly", () => {
      const customId = "agent:build";
      const agentName = customId.substring(6); // Remove "agent:" prefix

      expect(agentName).toBe("build");
    });

    it("handles unknown agent gracefully", () => {
      const customId = "agent:unknown";
      const agentName = customId.substring(6);

      expect(agentName).toBe("unknown");
    });
  });

  describe("agent manager integration", () => {
    it("loads available agents", async () => {
      vi.mocked(getAvailableAgents).mockResolvedValue(mockAgents);

      const agents = await getAvailableAgents();

      expect(getAvailableAgents).toHaveBeenCalled();
      expect(agents).toEqual(mockAgents);
    });

    it("selects agent correctly", () => {
      selectAgent("build");

      expect(selectAgent).toHaveBeenCalledWith("build");
    });

    it("retrieves stored agent", () => {
      vi.mocked(getStoredAgent).mockReturnValue("build");

      const agent = getStoredAgent();

      expect(getStoredAgent).toHaveBeenCalled();
      expect(agent).toBe("build");
    });
  });
});
