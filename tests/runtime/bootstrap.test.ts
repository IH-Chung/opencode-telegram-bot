import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import {
  buildConfigYamlContent,
  validateRuntimeConfigValues,
} from "../../src/runtime/bootstrap.js";

describe("runtime/bootstrap", () => {
  it("validates required runtime config values", () => {
    const result = validateRuntimeConfigValues({
      telegram: {
        token: "123456:abcdef",
        allowedUserId: 123456789,
      },
    });

    expect(result).toEqual({ isValid: true });
  });

  it("validates with string user id", () => {
    const result = validateRuntimeConfigValues({
      telegram: {
        token: "123456:abcdef",
        allowedUserId: "123456789",
      },
    });

    expect(result).toEqual({ isValid: true });
  });

  it("fails validation for missing token", () => {
    const result = validateRuntimeConfigValues({
      telegram: {
        allowedUserId: 123456789,
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("telegram.token");
  });

  it("fails validation for invalid user id", () => {
    const result = validateRuntimeConfigValues({
      telegram: {
        token: "123456:abcdef",
        allowedUserId: 0,
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("telegram.allowedUserId");
  });

  it("fails validation for string zero user id", () => {
    const result = validateRuntimeConfigValues({
      telegram: {
        token: "123456:abcdef",
        allowedUserId: "0",
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("telegram.allowedUserId");
  });

  it("fails validation for invalid api url", () => {
    const result = validateRuntimeConfigValues({
      telegram: {
        token: "123456:abcdef",
        allowedUserId: 123456789,
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
      telegram: {
        token: "123456:ABCdefGHI",
        allowedUserId: "777",
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
    const telegram = parsed.telegram as Record<string, unknown>;
    const opencode = parsed.opencode as Record<string, unknown>;
    const bot = parsed.bot as Record<string, unknown>;

    expect(telegram.token).toBe("123456:ABCdefGHI");
    expect(telegram.allowedUserId).toBe(777);
    expect(opencode.apiUrl).toBe("http://localhost:9090");
    expect(opencode.username).toBe("admin");
    expect(opencode.password).toBe("secret");
    expect(bot.locale).toBe("ru");
  });

  it("omits default opencode username and default bot locale", () => {
    const yaml = buildConfigYamlContent({
      telegram: {
        token: "token:value",
        allowedUserId: "42",
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
      telegram: {
        token: "token:value",
        allowedUserId: "42",
      },
    });

    const parsed = parseYaml(yaml) as Record<string, unknown>;
    const telegram = parsed.telegram as Record<string, unknown>;

    expect(telegram.token).toBe("token:value");
    expect(telegram.allowedUserId).toBe(42);
    expect(parsed.opencode).toBeUndefined();
    expect(parsed.bot).toBeUndefined();
  });

  it("properly quotes tokens with colons in YAML output", () => {
    const yaml = buildConfigYamlContent({
      telegram: {
        token: "123456:ABCdef:extra",
        allowedUserId: "999",
      },
    });

    // Re-parse should yield exact same token
    const parsed = parseYaml(yaml) as Record<string, unknown>;
    const telegram = parsed.telegram as Record<string, unknown>;
    expect(telegram.token).toBe("123456:ABCdef:extra");
  });
});
