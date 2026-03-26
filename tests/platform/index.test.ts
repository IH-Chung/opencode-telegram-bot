import { describe, expect, it, vi, beforeEach } from "vitest";
import { createPlatformBot, type PlatformBot } from "../../src/platform/index.js";

// Mock discord.js Client for type compatibility
vi.mock("discord.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    login: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    DirectMessages: 4,
    MessageContent: 8,
  },
  Partials: {
    Channel: 1,
  },
  Events: {
    ClientReady: "ready",
    InteractionCreate: "interactionCreate",
    MessageCreate: "messageCreate",
  },
  ChannelType: {
    DM: 1,
    GuildText: 0,
  },
}));

// Mock discord bot module
vi.mock("../../src/platform/discord/bot.js", () => ({
  createDiscordBot: vi.fn(),
  autoSubscribeDiscordEvents: vi.fn().mockResolvedValue(undefined),
}));

describe("platform/index", () => {
  describe("createPlatformBot", () => {
    it("returns a PlatformBot with start() method", async () => {
      const platformBot = createPlatformBot();
      expect(typeof platformBot.start).toBe("function");
    });

    it("calls createDiscordBot and autoSubscribeDiscordEvents", async () => {
      const mockClient = {
        login: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        once: vi.fn(),
      };

      const { createDiscordBot, autoSubscribeDiscordEvents } =
        await import("../../src/platform/discord/bot.js");
      vi.mocked(createDiscordBot).mockReturnValue(mockClient as never);

      const platformBot = createPlatformBot();
      await platformBot.start();

      expect(createDiscordBot).toHaveBeenCalledTimes(1);
      expect(autoSubscribeDiscordEvents).toHaveBeenCalledTimes(1);
      expect(autoSubscribeDiscordEvents).toHaveBeenCalledWith(mockClient);
      expect(mockClient.login).toHaveBeenCalledTimes(1);
    });
  });

  describe("PlatformBot interface", () => {
    it("start() returns Promise<void>", async () => {
      const mockClient = {
        login: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        once: vi.fn(),
      };

      const { createDiscordBot, autoSubscribeDiscordEvents } =
        await import("../../src/platform/discord/bot.js");
      vi.mocked(createDiscordBot).mockReturnValue(mockClient as never);

      const platformBot: PlatformBot = createPlatformBot();
      const result = platformBot.start();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });
});
