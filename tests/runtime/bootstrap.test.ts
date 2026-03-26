import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import {
  buildConfigYamlContent,
  validateRuntimeConfigValues,
} from "../../src/runtime/bootstrap.js";

describe("runtime/bootstrap", () => {
  it("validates required runtime config values", () => {
    const result = validateRuntimeConfigValues({
      discord: {
        token: "123456:abcdef",
        serverId: "123456789",
      },
    });

    expect(result).toEqual({ isValid: true });
  });

  it("validates with numeric serverId", () => {
    const result = validateRuntimeConfigValues({
      discord: {
        token: "123456:abcdef",
        serverId: 123456789,
      },
    });

    expect(result).toEqual({ isValid: true });
  });

  it("fails validation for missing token", () => {
    const result = validateRuntimeConfigValues({
      discord: {
        serverId: "123456789",
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("discord.token");
  });

  it("fails validation for missing serverId", () => {
    const result = validateRuntimeConfigValues({
      discord: {
        token: "123456:abcdef",
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("discord.serverId");
  });

  it("fails validation for empty token", () => {
    const result = validateRuntimeConfigValues({
      discord: {
        token: "",
        serverId: "123456789",
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("discord.token");
  });

  it("fails validation for invalid api url", () => {
    const result = validateRuntimeConfigValues({
      discord: {
        token: "123456:abcdef",
        serverId: "123456789",
      },
      opencode: {
        apiUrl: "not-a-url",
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("opencode.apiUrl");
  });

  it("builds valid YAML with all wizard values", () => {
    const yaml = buildConfigYamlContent({
      discord: {
        token: "123456:ABCdefGHI",
        serverId: "777888999",
        allowedRoleIds: ["role1", "role2"],
        allowedUserIds: [123456789, 987654321],
      },
      opencode: {
        apiUrl: "http://localhost:9090",
        username: "admin",
        password: "secret",
      },
      bot: {
        locale: "ru",
      },
    });

    const parsed = parseYaml(yaml) as Record<string, unknown>;
    const discord = parsed.discord as Record<string, unknown>;
    const opencode = parsed.opencode as Record<string, unknown>;
    const bot = parsed.bot as Record<string, unknown>;

    expect(discord.token).toBe("123456:ABCdefGHI");
    expect(discord.serverId).toBe("777888999");
    expect(discord.allowedRoleIds).toEqual(["role1", "role2"]);
    expect(discord.allowedUserIds).toEqual([123456789, 987654321]);
    expect(opencode.apiUrl).toBe("http://localhost:9090");
    expect(opencode.username).toBe("admin");
    expect(opencode.password).toBe("secret");
    expect(bot.locale).toBe("ru");
  });

  it("omits default opencode username and default bot locale", () => {
    const yaml = buildConfigYamlContent({
      discord: {
        token: "token:value",
        serverId: "42",
      },
      opencode: {
        username: "opencode",
      },
      bot: {
        locale: "en",
      },
    });

    const parsed = parseYaml(yaml) as Record<string, unknown>;

    expect(parsed.opencode).toBeUndefined();
    expect(parsed.bot).toBeUndefined();
  });

  it("omits empty optional sections", () => {
    const yaml = buildConfigYamlContent({
      discord: {
        token: "token:value",
        serverId: "42",
      },
    });

    const parsed = parseYaml(yaml) as Record<string, unknown>;
    const discord = parsed.discord as Record<string, unknown>;

    expect(discord.token).toBe("token:value");
    expect(discord.serverId).toBe("42");
    expect(parsed.opencode).toBeUndefined();
    expect(parsed.bot).toBeUndefined();
  });

  it("properly quotes tokens with colons in YAML output", () => {
    const yaml = buildConfigYamlContent({
      discord: {
        token: "123456:ABCdef:extra",
        serverId: "999",
      },
    });

    // Re-parse should yield exact same token
    const parsed = parseYaml(yaml) as Record<string, unknown>;
    const discord = parsed.discord as Record<string, unknown>;
    expect(discord.token).toBe("123456:ABCdef:extra");
  });
});
