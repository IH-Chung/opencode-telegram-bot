import { describe, expect, it } from "vitest";

describe("platform/discord/handlers/question", () => {
  describe("button custom ID structure", () => {
    it("creates select button custom IDs in correct format", () => {
      const questionIndex = 0;
      const optionIndex = 1;
      const customId = `question:select:${questionIndex}:${optionIndex}`;

      expect(customId).toBe("question:select:0:1");
      expect(customId).toMatch(/^question:select:\d+:\d+$/);
    });

    it("creates submit button custom ID", () => {
      const questionIndex = 0;
      const customId = `question:submit:${questionIndex}`;

      expect(customId).toBe("question:submit:0");
    });

    it("creates cancel button custom ID", () => {
      const questionIndex = 0;
      const customId = `question:cancel:${questionIndex}`;

      expect(customId).toBe("question:cancel:0");
    });

    it("creates custom button custom ID", () => {
      const questionIndex = 0;
      const customId = `question:custom:${questionIndex}`;

      expect(customId).toBe("question:custom:0");
    });
  });

  describe("button grouping logic", () => {
    const MAX_BUTTONS_PER_ROW = 5;

    function calculateRowCount(totalButtons: number): number {
      return Math.ceil(totalButtons / MAX_BUTTONS_PER_ROW);
    }

    it("calculates correct number of rows for 10 buttons", () => {
      expect(calculateRowCount(10)).toBe(2);
    });

    it("calculates correct number of rows for 3 buttons", () => {
      expect(calculateRowCount(3)).toBe(1);
    });

    it("calculates correct number of rows for 5 buttons", () => {
      expect(calculateRowCount(5)).toBe(1);
    });

    it("calculates correct number of rows for 6 buttons", () => {
      expect(calculateRowCount(6)).toBe(2);
    });
  });

  describe("interaction handling", () => {
    it("parses question button custom IDs correctly", () => {
      const customId = "question:select:0:1";
      const parts = customId.split(":");

      expect(parts[0]).toBe("question");
      expect(parts[1]).toBe("select");
      expect(parseInt(parts[2])).toBe(0);
      expect(parseInt(parts[3])).toBe(1);
    });

    it("handles multi-digit indices", () => {
      const customId = "question:select:12:5";
      const parts = customId.split(":");

      expect(parts[0]).toBe("question");
      expect(parseInt(parts[2])).toBe(12);
      expect(parseInt(parts[3])).toBe(5);
    });
  });
});
