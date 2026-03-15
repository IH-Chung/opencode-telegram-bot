import { describe, expect, it } from "vitest";
import {
  parseModelPageCallback,
  buildCombinedModelList,
  calculateModelsPaginationRange,
} from "../../../src/bot/handlers/model.js";

describe("bot/handlers/model", () => {
  describe("parseModelPageCallback", () => {
    it("parses valid page callbacks", () => {
      expect(parseModelPageCallback("model:page:0")).toBe(0);
      expect(parseModelPageCallback("model:page:5")).toBe(5);
      expect(parseModelPageCallback("model:page:12")).toBe(12);
    });

    it("returns null for model selection callbacks", () => {
      expect(parseModelPageCallback("model:anthropic:claude-3-5-sonnet")).toBeNull();
      expect(parseModelPageCallback("model:openai:gpt-4o")).toBeNull();
    });

    it("returns null for negative pages", () => {
      expect(parseModelPageCallback("model:page:-1")).toBeNull();
    });

    it("returns null for non-numeric pages", () => {
      expect(parseModelPageCallback("model:page:abc")).toBeNull();
    });

    it("returns null for unrelated callbacks", () => {
      expect(parseModelPageCallback("session:page:0")).toBeNull();
      expect(parseModelPageCallback("project:0")).toBeNull();
    });
  });

  describe("buildCombinedModelList", () => {
    it("puts favorites before recent", () => {
      const fav = [{ providerID: "a", modelID: "fav" }];
      const rec = [{ providerID: "b", modelID: "rec" }];
      const result = buildCombinedModelList(fav, rec);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ model: fav[0], isFavorite: true });
      expect(result[1]).toEqual({ model: rec[0], isFavorite: false });
    });

    it("handles empty favorites", () => {
      const rec = [{ providerID: "a", modelID: "m" }];
      const result = buildCombinedModelList([], rec);
      expect(result).toHaveLength(1);
      expect(result[0].isFavorite).toBe(false);
    });

    it("handles empty recent", () => {
      const fav = [{ providerID: "a", modelID: "m" }];
      const result = buildCombinedModelList(fav, []);
      expect(result).toHaveLength(1);
      expect(result[0].isFavorite).toBe(true);
    });

    it("handles both empty", () => {
      expect(buildCombinedModelList([], [])).toEqual([]);
    });
  });

  describe("calculateModelsPaginationRange", () => {
    it("returns first page bounds for 15 items at pageSize 10", () => {
      expect(calculateModelsPaginationRange(15, 0, 10)).toEqual({
        page: 0, totalPages: 2, startIndex: 0, endIndex: 10,
      });
    });

    it("returns second page bounds", () => {
      expect(calculateModelsPaginationRange(15, 1, 10)).toEqual({
        page: 1, totalPages: 2, startIndex: 10, endIndex: 15,
      });
    });

    it("clamps page to last page", () => {
      expect(calculateModelsPaginationRange(15, 99, 10)).toEqual({
        page: 1, totalPages: 2, startIndex: 10, endIndex: 15,
      });
    });

    it("handles empty list safely", () => {
      expect(calculateModelsPaginationRange(0, 0, 10)).toEqual({
        page: 0, totalPages: 1, startIndex: 0, endIndex: 0,
      });
    });

    it("single page when total <= pageSize", () => {
      expect(calculateModelsPaginationRange(5, 0, 10)).toEqual({
        page: 0, totalPages: 1, startIndex: 0, endIndex: 5,
      });
    });

    it("exactly pageSize items fits in one page", () => {
      expect(calculateModelsPaginationRange(10, 0, 10)).toEqual({
        page: 0, totalPages: 1, startIndex: 0, endIndex: 10,
      });
    });

    it("applies pageSize 7 boundary correctly", () => {
      expect(calculateModelsPaginationRange(8, 0, 7)).toEqual({
        page: 0, totalPages: 2, startIndex: 0, endIndex: 7,
      });
      expect(calculateModelsPaginationRange(8, 1, 7)).toEqual({
        page: 1, totalPages: 2, startIndex: 7, endIndex: 8,
      });
    });
  });
});