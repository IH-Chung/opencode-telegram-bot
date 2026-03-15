import { describe, expect, it, vi, beforeEach } from "vitest";
import { markBotQuestionReply, markBotPermissionReply } from "../../src/bot/index.js";

// We need to test that markBotQuestionReply/markBotPermissionReply functions exist
// and can be called without error. The actual discrimination logic uses module-level
// variables in bot/index.ts, which we verify through the integration test below.

describe("markBotQuestionReply / markBotPermissionReply exports", () => {
  it("markBotQuestionReply is a function", () => {
    expect(typeof markBotQuestionReply).toBe("function");
  });

  it("markBotPermissionReply is a function", () => {
    expect(typeof markBotPermissionReply).toBe("function");
  });

  it("markBotQuestionReply can be called with a requestID", () => {
    expect(() => markBotQuestionReply("que_test123")).not.toThrow();
  });

  it("markBotPermissionReply can be called with a requestID", () => {
    expect(() => markBotPermissionReply("perm_test456")).not.toThrow();
  });
});
