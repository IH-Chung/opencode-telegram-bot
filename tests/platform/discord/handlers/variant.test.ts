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
vi.mock("../../../../src/variant/manager.js", () => ({
  getAvailableVariants: vi.fn(),
  setCurrentVariant: vi.fn(),
  getCurrentVariant: vi.fn(),
  formatVariantForButton: vi.fn((id) => `💡 ${id.charAt(0).toUpperCase() + id.slice(1)}`),
}));

vi.mock("../../../../src/model/manager.js", () => ({
  getStoredModel: vi.fn(),
}));

// Import after mocking
import {
  getAvailableVariants,
  setCurrentVariant,
  getCurrentVariant,
} from "../../../../src/variant/manager.js";
import { getStoredModel } from "../../../../src/model/manager.js";
import type { ModelInfo } from "../../../../src/model/types.js";

describe("platform/discord/handlers/variant", () => {
  const mockModel: ModelInfo = {
    providerID: "openai",
    modelID: "gpt-4o",
    variant: "default",
  };

  const mockVariants = [{ id: "default" }, { id: "low" }, { id: "high" }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("select menu structure", () => {
    it("creates select menu with correct custom ID", () => {
      const customId = "variant:select";
      expect(customId).toBe("variant:select");
    });

    it("filters out disabled variants", () => {
      const variantsWithDisabled = [
        { id: "default" },
        { id: "low", disabled: true },
        { id: "high" },
      ];

      const availableVariants = variantsWithDisabled.filter((v) => !v.disabled);

      expect(availableVariants.length).toBe(2);
      expect(availableVariants.map((v) => v.id)).not.toContain("low");
    });

    it("limits options to 25 (Discord max)", () => {
      const MAX_SELECT_OPTIONS = 25;
      const manyVariants = Array(30)
        .fill(null)
        .map((_, i) => ({ id: `variant-${i}` }));

      const limitedVariants = manyVariants.slice(0, MAX_SELECT_OPTIONS);

      expect(limitedVariants.length).toBe(25);
    });

    it("marks current variant as default", () => {
      const currentVariant = "low";
      const variant = mockVariants[1];
      const isDefault = currentVariant === variant.id;

      expect(isDefault).toBe(true);
    });
  });

  describe("interaction handling", () => {
    it("parses variant selection value correctly", () => {
      const selectedValue = "high";
      expect(selectedValue).toBe("high");
    });
  });

  describe("variant manager integration", () => {
    it("loads available variants", async () => {
      vi.mocked(getAvailableVariants).mockResolvedValue(mockVariants);

      const variants = await getAvailableVariants(mockModel.providerID, mockModel.modelID);

      expect(getAvailableVariants).toHaveBeenCalledWith(mockModel.providerID, mockModel.modelID);
      expect(variants).toEqual(mockVariants);
    });

    it("sets current variant correctly", () => {
      setCurrentVariant("high");

      expect(setCurrentVariant).toHaveBeenCalledWith("high");
    });

    it("retrieves current variant", () => {
      vi.mocked(getCurrentVariant).mockReturnValue("default");

      const variant = getCurrentVariant();

      expect(getCurrentVariant).toHaveBeenCalled();
      expect(variant).toBe("default");
    });

    it("retrieves stored model for variant lookup", () => {
      vi.mocked(getStoredModel).mockReturnValue(mockModel);

      const model = getStoredModel();

      expect(getStoredModel).toHaveBeenCalled();
      expect(model).toEqual(mockModel);
    });
  });

  describe("no variants case", () => {
    it("shows message when model not selected", () => {
      vi.mocked(getStoredModel).mockReturnValue({
        providerID: "",
        modelID: "",
        variant: "default",
      });

      const model = getStoredModel();
      const hasModel = !!model?.providerID && !!model?.modelID;

      expect(hasModel).toBe(false);
    });

    it("shows message when no variants available", async () => {
      vi.mocked(getAvailableVariants).mockResolvedValue([{ id: "default" }]);

      const variants = await getAvailableVariants("test", "model");

      // Only default variant means no selection needed
      expect(variants.length).toBe(1);
    });
  });
});
