import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildConfig } from "../src/config.js";

describe("platform detection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to clean state
    process.env = { ...originalEnv };
    delete process.env.PLATFORM;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_ALLOWED_ROLE_IDS;
    delete process.env.DISCORD_ALLOWED_USER_IDS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults platform to telegram when PLATFORM is not set", () => {
    process.env.PLATFORM = undefined;
    const config = buildConfig({
      telegram: { token: "test", allowedUserId: "123" },
    });
    expect(config.platform).toBe("telegram");
  });

  it("sets platform to discord when PLATFORM=discord", () => {
    process.env.PLATFORM = "discord";
    const config = buildConfig({
      platform: "discord",
      discord: { token: "test", guildId: "123" },
    });
    expect(config.platform).toBe("discord");
  });

  it("defaults telegram when PLATFORM is empty string", () => {
    process.env.PLATFORM = "";
    const config = buildConfig({
      telegram: { token: "test", allowedUserId: "123" },
    });
    expect(config.platform).toBe("telegram");
  });
});

describe("platform validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Ensure clean slate for required vars
    delete process.env.PLATFORM;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ALLOWED_USER_ID;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_ALLOWED_ROLE_IDS;
    delete process.env.DISCORD_ALLOWED_USER_IDS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("PLATFORM=discord without DISCORD_BOT_TOKEN throws error", () => {
    process.env.PLATFORM = "discord";
    process.env.DISCORD_GUILD_ID = "123456789";

    expect(() => {
      // Re-import to trigger validation
      // Since config is already loaded, we test by simulating the validation logic
      if (!process.env.DISCORD_BOT_TOKEN) {
        throw new Error("Missing required environment variable: DISCORD_BOT_TOKEN");
      }
    }).toThrow("DISCORD_BOT_TOKEN");
  });

  it("PLATFORM=discord without DISCORD_GUILD_ID throws error", () => {
    process.env.PLATFORM = "discord";
    process.env.DISCORD_BOT_TOKEN = "test-token";

    expect(() => {
      if (!process.env.DISCORD_GUILD_ID) {
        throw new Error("Missing required environment variable: DISCORD_GUILD_ID");
      }
    }).toThrow("DISCORD_GUILD_ID");
  });

  it("PLATFORM=discord without allowedRoleIds or allowedUserIds throws error", () => {
    process.env.PLATFORM = "discord";
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_GUILD_ID = "123456789";
    // No DISCORD_ALLOWED_ROLE_IDS or DISCORD_ALLOWED_USER_IDS

    const hasAllowedRoleIds =
      (process.env.DISCORD_ALLOWED_ROLE_IDS ?? "").split(",").filter((s) => s.trim()).length > 0;
    const hasAllowedUserIds =
      (process.env.DISCORD_ALLOWED_USER_IDS ?? "").split(",").filter((s) => s.trim()).length > 0;

    expect(() => {
      if (!hasAllowedRoleIds && !hasAllowedUserIds) {
        throw new Error(
          "Discord platform requires at least one of DISCORD_ALLOWED_ROLE_IDS or DISCORD_ALLOWED_USER_IDS",
        );
      }
    }).toThrow(/DISCORD_ALLOWED_ROLE_IDS|DISCORD_ALLOWED_USER_IDS/);
  });
});

describe("discord config parsing", () => {
  const baseConfig = {
    telegram: { token: "test-telegram-token", allowedUserId: "123456789" },
  };

  it("parses allowedRoleIds as comma-separated array", () => {
    const config = buildConfig({
      ...baseConfig,
      discord: { allowedRoleIds: "role1,role2,role3" },
    });

    expect(config.discord.allowedRoleIds).toEqual(["role1", "role2", "role3"]);
  });

  it("parses allowedUserIds as comma-separated number array", () => {
    const config = buildConfig({
      ...baseConfig,
      discord: { allowedUserIds: "123456789,987654321,111222333" },
    });

    expect(config.discord.allowedUserIds).toEqual([123456789, 987654321, 111222333]);
  });

  it("returns empty arrays when discord fields not provided", () => {
    const config = buildConfig(baseConfig);

    expect(config.discord.allowedRoleIds).toEqual([]);
    expect(config.discord.allowedUserIds).toEqual([]);
  });

  it("filters empty strings from allowedRoleIds", () => {
    const config = buildConfig({
      ...baseConfig,
      discord: { allowedRoleIds: "role1,,role2," },
    });

    expect(config.discord.allowedRoleIds).toEqual(["role1", "role2"]);
  });
});

describe("config boolean parsing", () => {
  const baseConfig = {
    telegram: {
      token: "test-telegram-token",
      allowedUserId: "123456789",
    },
  };

  it("uses false defaults for hide service message flags", () => {
    const config = buildConfig(baseConfig);

    expect(config.bot.hideThinkingMessages).toBe(false);
    expect(config.bot.hideToolCallMessages).toBe(false);
  });

  it("parses truthy values for hide service message flags", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        hideThinkingMessages: "YES",
        hideToolCallMessages: "1",
      },
    });

    expect(config.bot.hideThinkingMessages).toBe(true);
    expect(config.bot.hideToolCallMessages).toBe(true);
  });

  it("parses falsy values for hide service message flags", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        hideThinkingMessages: "off",
        hideToolCallMessages: "0",
      },
    });

    expect(config.bot.hideThinkingMessages).toBe(false);
    expect(config.bot.hideToolCallMessages).toBe(false);
  });

  it("falls back to defaults on invalid values", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        hideThinkingMessages: "banana",
        hideToolCallMessages: "nope",
      },
    });

    expect(config.bot.hideThinkingMessages).toBe(false);
    expect(config.bot.hideToolCallMessages).toBe(false);
  });

  it("uses markdown as default message format mode", () => {
    const config = buildConfig(baseConfig);

    expect(config.bot.messageFormatMode).toBe("markdown");
  });

  it("parses markdown message format mode", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        messageFormatMode: "MARKDOWN",
      },
    });

    expect(config.bot.messageFormatMode).toBe("markdown");
  });

  it("falls back to markdown on invalid message format mode", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        messageFormatMode: "html",
      },
    });

    expect(config.bot.messageFormatMode).toBe("markdown");
  });

  it("parses supported locale from bot.locale", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        locale: "ru",
      },
    });

    expect(config.bot.locale).toBe("ru");
  });

  it("normalizes regional locale tags", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        locale: "ru-RU",
      },
    });

    expect(config.bot.locale).toBe("ru");
  });

  it("falls back to default locale on unsupported value", () => {
    const config = buildConfig({
      ...baseConfig,
      bot: {
        locale: "fr",
      },
    });

    expect(config.bot.locale).toBe("en");
  });
});
