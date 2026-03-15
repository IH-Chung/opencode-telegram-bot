import { describe, expect, it, beforeEach } from "vitest";
import {
  markMessageProcessed,
  isMessageProcessed,
  clearProcessedMessages,
} from "../../src/opencode/processed-messages.js";

describe("processed-messages", () => {
  beforeEach(() => {
    clearProcessedMessages();
  });

  it("returns false for unknown message IDs", () => {
    expect(isMessageProcessed("msg-unknown")).toBe(false);
  });

  it("returns true after marking a message as processed", () => {
    markMessageProcessed("msg-1");
    expect(isMessageProcessed("msg-1")).toBe(true);
  });

  it("tracks multiple message IDs independently", () => {
    markMessageProcessed("msg-a");
    markMessageProcessed("msg-b");

    expect(isMessageProcessed("msg-a")).toBe(true);
    expect(isMessageProcessed("msg-b")).toBe(true);
    expect(isMessageProcessed("msg-c")).toBe(false);
  });

  it("clearProcessedMessages resets all tracked IDs", () => {
    markMessageProcessed("msg-1");
    markMessageProcessed("msg-2");

    clearProcessedMessages();

    expect(isMessageProcessed("msg-1")).toBe(false);
    expect(isMessageProcessed("msg-2")).toBe(false);
  });

  it("marking the same ID twice is idempotent", () => {
    markMessageProcessed("msg-dup");
    markMessageProcessed("msg-dup");
    expect(isMessageProcessed("msg-dup")).toBe(true);
  });
});
