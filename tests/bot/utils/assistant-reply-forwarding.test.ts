import { describe, expect, it, vi } from "vitest";
import { shouldForwardAssistantReply } from "../../../src/bot/utils/assistant-reply-forwarding.js";

describe("shouldForwardAssistantReply", () => {
  it("forwards when session matches current session", async () => {
    const sessionExistsInProject = vi.fn(async () => false);

    const result = await shouldForwardAssistantReply({
      sessionId: "ses-current",
      currentSessionId: "ses-current",
      currentProjectDirectory: "C:/project",
      sessionExistsInProject,
    });

    expect(result).toBe(true);
    expect(sessionExistsInProject).not.toHaveBeenCalled();
  });

  it("does not forward when no current project directory and session differs", async () => {
    const sessionExistsInProject = vi.fn(async () => true);

    const result = await shouldForwardAssistantReply({
      sessionId: "ses-gui",
      currentSessionId: "ses-telegram",
      currentProjectDirectory: undefined,
      sessionExistsInProject,
    });

    expect(result).toBe(false);
    expect(sessionExistsInProject).not.toHaveBeenCalled();
  });

  it("forwards when session exists in current project", async () => {
    const sessionExistsInProject = vi.fn(async () => true);

    const result = await shouldForwardAssistantReply({
      sessionId: "ses-gui",
      currentSessionId: "ses-telegram",
      currentProjectDirectory: "C:/project",
      sessionExistsInProject,
    });

    expect(result).toBe(true);
    expect(sessionExistsInProject).toHaveBeenCalledWith("ses-gui", "C:/project");
  });
});
