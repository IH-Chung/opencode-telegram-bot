import { describe, expect, it } from "vitest";
import {
  DISCORD_FORMAT_CONFIG,
  DISCORD_MESSAGE_LIMIT,
  createStatusEmbed,
  formatMarkdownForDiscord,
  splitMessageForDiscord,
} from "../../../src/platform/discord/formatter.js";

describe("platform/discord/formatter", () => {
  describe("DISCORD_MESSAGE_LIMIT", () => {
    it("exports the correct Discord message limit of 2000", () => {
      expect(DISCORD_MESSAGE_LIMIT).toBe(2000);
    });
  });

  describe("formatMarkdownForDiscord", () => {
    it("returns text unchanged when no MarkdownV2 escapes present", () => {
      const input = "Hello **world** and _italic_ text";
      const result = formatMarkdownForDiscord(input);
      expect(result).toBe(input);
    });

    it("strips MarkdownV2 escape backslashes from special characters", () => {
      const input = "Here is some \\*escaped\\* text with \\[brackets\\]";
      const result = formatMarkdownForDiscord(input);
      expect(result).toBe("Here is some *escaped* text with [brackets]");
    });

    it("preserves code blocks (backticks are not escaped)", () => {
      const input = "Here is `inline code` and ```code block```";
      const result = formatMarkdownForDiscord(input);
      expect(result).toBe(input);
    });

    it("handles multiple escaped characters in sequence", () => {
      const input = "\\*\\-\\+\\[\\]\\(\\)";
      const result = formatMarkdownForDiscord(input);
      expect(result).toBe("*-+[]()");
    });

    it("handles consecutive escape sequences", () => {
      const input = "\\*\\*bold\\*\\*";
      const result = formatMarkdownForDiscord(input);
      expect(result).toBe("**bold**");
    });

    it("returns empty string for empty input", () => {
      const result = formatMarkdownForDiscord("");
      expect(result).toBe("");
    });

    it("handles unescaped special markdown characters", () => {
      const input = "**bold** _italic_ ~~strike~~";
      const result = formatMarkdownForDiscord(input);
      expect(result).toBe(input);
    });

    it("handles mixed escaped and unescaped content", () => {
      const input = "Normal text \\*escaped asterisk\\* and **bold**";
      const result = formatMarkdownForDiscord(input);
      expect(result).toBe("Normal text *escaped asterisk* and **bold**");
    });
  });

  describe("splitMessageForDiscord", () => {
    it("returns single-element array for short messages under limit", () => {
      const shortMessage = "Hello, this is a short message.";
      const result = splitMessageForDiscord(shortMessage);
      expect(result).toEqual([shortMessage]);
    });

    it("returns single-element array for exactly 2000 characters", () => {
      const exactMessage = "x".repeat(2000);
      const result = splitMessageForDiscord(exactMessage);
      expect(result).toEqual([exactMessage]);
    });

    it("splits message longer than 2000 characters into multiple chunks", () => {
      const longMessage = "line\n".repeat(500); // Each line is 5 chars, 500 lines = 2500 chars
      const result = splitMessageForDiscord(longMessage);
      expect(result.length).toBeGreaterThan(1);
      // All chunks except potentially the last should be under the limit
      for (const chunk of result.slice(0, -1)) {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
      }
    });

    it("prefers splitting at newline boundaries", () => {
      // Create a message with many short lines
      const lines: string[] = [];
      for (let i = 0; i < 600; i++) {
        lines.push(`Line ${i}`);
      }
      const message = lines.join("\n");
      const result = splitMessageForDiscord(message);

      // Each line is short (under 10 chars), so we should have many chunks
      // Verify no chunk exceeds the limit
      for (const chunk of result) {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
      }
    });

    it("does not split inside code fences", () => {
      // Create a message with a code block that would exceed the limit if split improperly
      const codeBlockContent = "// This is code\n".repeat(500); // Each line ~17 chars, 500 lines = ~8500 chars
      const message = "```\n" + codeBlockContent + "```";
      const result = splitMessageForDiscord(message);

      // The code block should be preserved with ``` delimiters
      const hasOpeningFence = result.some((chunk) => chunk.includes("```"));
      expect(hasOpeningFence).toBe(true);
    });

    it("reopens code fences after split", () => {
      // Create a code block that must be split
      const codeLine = "const x = 1; // comment\n"; // ~26 chars
      const numLines = Math.ceil((DISCORD_MESSAGE_LIMIT + 1000) / codeLine.length);
      const codeBlockContent = codeLine.repeat(numLines);
      const message = "```\n" + codeBlockContent + "```";
      const result = splitMessageForDiscord(message);

      // First chunk should end with ```
      expect(result[0]).toMatch(/```\s*$/);
      // Subsequent chunks (except last) should start with ``` and end with ```
      for (let i = 1; i < result.length - 1; i++) {
        expect(result[i]).toMatch(/^```\n/);
        expect(result[i]).toMatch(/```\s*$/);
      }
      // Last chunk should start with ``` but not end with it (unless original had it)
      expect(result[result.length - 1]).toMatch(/^```\n/);
    });

    it("handles message with no newlines", () => {
      const noNewlines = "word ".repeat(500); // A long string without newlines
      const result = splitMessageForDiscord(noNewlines);

      // Since there's no newline to split at, it should just truncate at limit
      expect(result.length).toBeGreaterThan(1);
      for (const chunk of result) {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
      }
    });

    it("handles single long line with newlines at boundaries", () => {
      // A line longer than 2000 chars followed by another line
      const longLine = "x".repeat(2500);
      const message = longLine + "\nSecond line";
      const result = splitMessageForDiscord(message);

      // First chunk should be exactly 2000 chars (the limit)
      expect(result[0].length).toBe(2000);
      // Remaining should contain rest of long line plus newline
      const remaining = result.slice(1).join("");
      expect(remaining.includes("Second line")).toBe(true);
    });
  });

  describe("DISCORD_FORMAT_CONFIG", () => {
    it("exports correct message max length", () => {
      expect(DISCORD_FORMAT_CONFIG.messageMaxLength).toBe(2000);
    });

    it("exports formatMarkdown function", () => {
      expect(typeof DISCORD_FORMAT_CONFIG.formatMarkdown).toBe("function");
    });

    it("formatMarkdown function is formatMarkdownForDiscord", () => {
      const input = "Test \\*escaped\\*";
      const result = DISCORD_FORMAT_CONFIG.formatMarkdown(input);
      expect(result).toBe("Test *escaped*");
    });
  });

  describe("createStatusEmbed", () => {
    it("creates embed with default values when no data provided", () => {
      const embed = createStatusEmbed({});
      expect(embed.data.title).toBe("No active session");
      expect(embed.data.color).toBe(0x00c851); // Green for idle
    });

    it("uses sessionTitle as embed title", () => {
      const embed = createStatusEmbed({ sessionTitle: "My Session" });
      expect(embed.data.title).toBe("My Session");
    });

    it("sets green color for idle status", () => {
      const embed = createStatusEmbed({ status: "idle" });
      expect(embed.data.color).toBe(0x00c851);
    });

    it("sets orange color for busy status", () => {
      const embed = createStatusEmbed({ status: "busy" });
      expect(embed.data.color).toBe(0xff8800);
    });

    it("sets red color for error status", () => {
      const embed = createStatusEmbed({ status: "error" });
      expect(embed.data.color).toBe(0xff4444);
    });

    it("adds Project field when provided", () => {
      const embed = createStatusEmbed({ projectName: "my-project" });
      const fields = embed.data.fields;
      expect(fields).toBeDefined();
      const projectField = fields?.find((f) => f.name === "Project");
      expect(projectField?.value).toBe("my-project");
      expect(projectField?.inline).toBe(true);
    });

    it("adds Model field when provided", () => {
      const embed = createStatusEmbed({ modelName: "claude-3.5-sonnet" });
      const fields = embed.data.fields;
      const modelField = fields?.find((f) => f.name === "Model");
      expect(modelField?.value).toBe("claude-3.5-sonnet");
    });

    it("adds Agent field when provided", () => {
      const embed = createStatusEmbed({ agentName: "build" });
      const fields = embed.data.fields;
      const agentField = fields?.find((f) => f.name === "Agent");
      expect(agentField?.value).toBe("build");
    });

    it("shows tokens with limit when both provided", () => {
      const embed = createStatusEmbed({ tokensUsed: 50000, tokensLimit: 200000 });
      const fields = embed.data.fields;
      const tokenField = fields?.find((f) => f.name === "Context Tokens");
      expect(tokenField?.value).toBe("50000 / 200000");
    });

    it("shows tokens without limit when only used provided", () => {
      const embed = createStatusEmbed({ tokensUsed: 50000 });
      const fields = embed.data.fields;
      const tokenField = fields?.find((f) => f.name === "Context Tokens");
      expect(tokenField?.value).toBe("50000");
    });

    it("shows changed files count with file list when provided", () => {
      const files = ["file1.ts", "file2.ts", "file3.ts"];
      const embed = createStatusEmbed({ changedFilesCount: 3, changedFiles: files });
      const fields = embed.data.fields;
      const filesField = fields?.find((f) => f.name === "Changed Files");
      expect(filesField?.value).toContain("3 files");
      expect(filesField?.value).toContain("file1.ts, file2.ts, file3.ts");
      expect(filesField?.inline).toBe(false);
    });

    it("shows only count when changedFiles is empty array", () => {
      const embed = createStatusEmbed({ changedFilesCount: 5, changedFiles: [] });
      const fields = embed.data.fields;
      const filesField = fields?.find((f) => f.name === "Changed Files");
      expect(filesField?.value).toBe("5 files");
    });

    it("includes timestamp", () => {
      const embed = createStatusEmbed({});
      expect(embed.data.timestamp).toBeDefined();
    });

    it("does not add undefined fields", () => {
      const embed = createStatusEmbed({ sessionTitle: "Test" });
      const fields = embed.data.fields;
      // Only title should be set, no other fields - fields is undefined when empty
      expect(fields).toBeUndefined();
    });
  });
});
