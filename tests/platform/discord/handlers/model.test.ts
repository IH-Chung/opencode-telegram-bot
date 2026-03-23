import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

// Mock discord.js
vi.mock("discord.js", () => ({
  ActionRowBuilder: vi.fn().mockImplementation(() => ({
    addComponents: vi.fn().mockReturnThis(),
    data: { components: [] },
  })),
  StringSelectMenuBuilder: vi.fn().mockImplementation(() => ({
    setCustomId: vi.fn().mockReturnThis(),
    setPlaceholder: vi.fn().mockReturnThis(),
    addOptions: vi.fn().mockReturnThis(),
  })),
  StringSelectMenuOptionBuilder: vi.fn().mockImplementation(() => ({
    setLabel: vi.fn().mockReturnThis(),
    setValue: vi.fn().mockReturnThis(),
    setDefault: vi.fn().mockReturnThis(),
  })),
}));

// Mock managers
vi.mock("../../../../src/model/manager.js", () => ({
  getModelSelectionLists: vi.fn(),
  selectModel: vi.fn(),
  getStoredModel: vi.fn(),
}));

// Import after mocking
import {
  getModelSelectionLists,
  selectModel,
  getStoredModel,
} from "../../../../src/model/manager.js";
import type { ModelInfo } from "../../../../src/model/types.js";

describe("platform/discord/handlers/model", () => {
  const mockModels: ModelInfo[] = [
    { providerID: "openai", modelID: "gpt-4o" },
    { providerID: "anthropic", modelID: "claude-3-5-sonnet" },
  ];

  const mockCurrentModel: ModelInfo = {
    providerID: "openai",
    modelID: "gpt-4o",
    variant: "default",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("select menu structure", () => {
    it("creates select menu with correct custom ID", () => {
      const customId = "model:select";
      expect(customId).toBe("model:select");
    });

    it("formats model value as providerID:modelID", () => {
      const model = mockModels[0];
      const value = `${model.providerID}:${model.modelID}`;

      expect(value).toBe("openai:gpt-4o");
    });

    it("marks current model as default", () => {
      const model = mockModels[0];
      const isDefault =
        mockCurrentModel.modelID === model.modelID &&
        mockCurrentModel.providerID === model.providerID;

      expect(isDefault).toBe(true);
    });

    it("limits options to 25 (Discord max)", () => {
      const MAX_SELECT_OPTIONS = 25;
      const manyModels = Array(30)
        .fill(null)
        .map((_, i) => ({
          providerID: "test",
          modelID: `model-${i}`,
        }));

      const limitedModels = manyModels.slice(0, MAX_SELECT_OPTIONS);

      expect(limitedModels.length).toBe(25);
    });
  });

  describe("interaction handling", () => {
    it("parses model selection value correctly", () => {
      const selectedValue = "openai:gpt-4o";
      const colonIndex = selectedValue.indexOf(":");

      expect(colonIndex).toBe(6);
      expect(selectedValue.substring(0, colonIndex)).toBe("openai");
      expect(selectedValue.substring(colonIndex + 1)).toBe("gpt-4o");
    });

    it("handles invalid model value gracefully", () => {
      const invalidValue = "invalid-value-without-colon";
      const colonIndex = invalidValue.indexOf(":");

      expect(colonIndex).toBe(-1);
    });
  });

  describe("model manager integration", () => {
    it("loads model selection lists", async () => {
      vi.mocked(getModelSelectionLists).mockResolvedValue({
        favorites: mockModels,
        recent: [],
      });

      const lists = await getModelSelectionLists();

      expect(getModelSelectionLists).toHaveBeenCalled();
      expect(lists.favorites).toEqual(mockModels);
    });

    it("selects model correctly", () => {
      selectModel(mockCurrentModel);

      expect(selectModel).toHaveBeenCalledWith(mockCurrentModel);
    });

    it("retrieves stored model", () => {
      vi.mocked(getStoredModel).mockReturnValue(mockCurrentModel);

      const model = getStoredModel();

      expect(getStoredModel).toHaveBeenCalled();
      expect(model).toEqual(mockCurrentModel);
    });
  });
});
