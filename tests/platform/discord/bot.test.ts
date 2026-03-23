import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client, GatewayIntentBits, Partials } from "discord.js";

// We need to mock discord.js before importing the bot module
vi.mock("discord.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("discord.js")>();
  return {
    ...actual,
    Client: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      login: vi.fn(),
      emit: vi.fn(),
    })),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      DirectMessages: 4,
      MessageContent: 8,
    },
    Partials: {
      Channel: "Channel",
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
  };
});

// Mock other modules
vi.mock("../../../src/platform/discord/adapter.js", () => ({
  DiscordAdapter: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockResolvedValue("msg-123"),
    sendTyping: vi.fn().mockResolvedValue(undefined),
    setChatId: vi.fn(),
    sendDocument: vi.fn().mockResolvedValue("file-123"),
    sendEmbed: vi.fn().mockResolvedValue("embed-123"),
  })),
}));

vi.mock("../../../src/platform/discord/middleware/auth.js", () => ({
  isAuthorizedDiscordUser: vi.fn().mockReturnValue(true),
  setSessionOwner: vi.fn(),
  clearSessionOwner: vi.fn(),
  getSessionOwner: vi.fn().mockReturnValue(null),
}));

vi.mock("../../../src/platform/discord/pinned-manager.js", () => ({
  discordPinnedMessageManager: {
    initialize: vi.fn(),
    onSessionChanged: vi.fn().mockResolvedValue(undefined),
    onSessionIdle: vi.fn().mockResolvedValue(undefined),
    onFilesChanged: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockReturnValue({ messageRef: null }),
  },
}));

vi.mock("../../../src/platform/discord/commands/register.js", () => ({
  registerSlashCommands: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/opencode/events.js", () => ({
  subscribeToEvents: vi.fn().mockResolvedValue(undefined),
  stopEventListening: vi.fn(),
}));

vi.mock("../../../src/opencode/client.js", () => ({
  opencodeClient: {
    session: {
      status: vi.fn().mockResolvedValue({ data: {} }),
      create: vi.fn().mockResolvedValue({
        data: { id: "session-123", title: "Test Session" },
      }),
      prompt: vi.fn().mockResolvedValue({ data: {} }),
    },
  },
}));

vi.mock("../../../src/settings/manager.js", () => ({
  getCurrentProject: vi.fn().mockReturnValue({
    id: "project-123",
    name: "Test Project",
    worktree: "/test/project",
  }),
  getCurrentSession: vi.fn().mockReturnValue({
    id: "session-123",
    title: "Test Session",
    directory: "/test/project",
  }),
}));

vi.mock("../../../src/session/manager.js", () => ({
  setCurrentSession: vi.fn(),
}));

vi.mock("../../../src/session/cache-manager.js", () => ({
  ingestSessionInfoForCache: vi.fn().mockResolvedValue(undefined),
  warmupSessionDirectoryCache: vi.fn().mockResolvedValue(undefined),
  __resetSessionDirectoryCacheForTests: vi.fn(),
}));

vi.mock("../../../src/interaction/cleanup.js", () => ({
  clearAllInteractionState: vi.fn(),
}));

vi.mock("../../../src/agent/manager.js", () => ({
  getStoredAgent: vi.fn().mockReturnValue("build"),
}));

vi.mock("../../../src/model/manager.js", () => ({
  getStoredModel: vi.fn().mockReturnValue({
    providerID: "test-provider",
    modelID: "test-model",
    variant: "default",
  }),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../src/utils/safe-background-task.js", () => ({
  safeBackgroundTask: vi.fn((options) => {
    // Execute task synchronously in tests
    options.task().catch((err: unknown) => options.onError?.(err));
  }),
}));

vi.mock("../../utils/error-format.js", () => ({
  formatErrorDetails: vi.fn().mockReturnValue("mocked error details"),
}));

describe("Discord Bot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup Client mock after clearAllMocks removes implementations
    vi.mocked(Client).mockImplementation(
      () =>
        ({
          on: vi.fn(),
          login: vi.fn().mockResolvedValue(undefined),
          emit: vi.fn(),
        }) as unknown as Client,
    );
  });

  describe("createDiscordBot", () => {
    it("should create a Client with correct intents", async () => {
      const { createDiscordBot } = await import("../../../src/platform/discord/bot.js");
      const client = createDiscordBot();

      expect(Client).toHaveBeenCalledWith(
        expect.objectContaining({
          intents: expect.arrayContaining([
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent,
          ]),
          partials: expect.arrayContaining([Partials.Channel]),
        }),
      );
      expect(client).toBeDefined();
    });

    it("should register event handlers", async () => {
      const { createDiscordBot } = await import("../../../src/platform/discord/bot.js");
      const client = createDiscordBot();

      // Verify Client.on was called for each event type
      expect(client.on).toHaveBeenCalled();
    });
  });

  describe("autoSubscribeDiscordEvents", () => {
    it("should export the function", async () => {
      const { autoSubscribeDiscordEvents } = await import("../../../src/platform/discord/bot.js");
      expect(typeof autoSubscribeDiscordEvents).toBe("function");
    });
  });
});
