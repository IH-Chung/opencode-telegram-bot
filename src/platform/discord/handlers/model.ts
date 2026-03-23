/**
 * Discord model selection handler - renders model selection as Discord select menu
 */
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getModelSelectionLists, selectModel, getStoredModel } from "../../../model/manager.js";
import { logger } from "../../../utils/logger.js";
import type { DiscordAdapter } from "../adapter.js";
import type { ModelInfo } from "../../../model/types.js";

// Max options in a Discord select menu
const MAX_SELECT_OPTIONS = 25;

/**
 * Build Discord select menu with available models
 */
function buildModelSelectMenu(
  models: ModelInfo[],
  currentModel: ModelInfo | undefined,
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  if (models.length === 0) {
    return [];
  }

  const options: StringSelectMenuOptionBuilder[] = models
    .slice(0, MAX_SELECT_OPTIONS)
    .map((model) => {
      const label = model.modelID.substring(0, 80);
      const value = `${model.providerID}:${model.modelID}`;
      const isDefault =
        currentModel !== undefined &&
        currentModel.modelID === model.modelID &&
        currentModel.providerID === model.providerID;

      return new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(value)
        .setDefault(isDefault);
    });

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("model:select")
      .setPlaceholder("Select a model")
      .addOptions(options),
  );

  return [row];
}

/**
 * Show model selection menu
 */
export async function showDiscordModelSelection(
  adapter: DiscordAdapter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction?: any,
): Promise<void> {
  try {
    const lists = await getModelSelectionLists();
    const allModels = [...lists.favorites, ...lists.recent];
    const current = getStoredModel();

    // Mark current model in the list
    const modelsWithCurrent: ModelInfo[] = allModels.map((m) => ({
      providerID: m.providerID,
      modelID: m.modelID,
      variant: current.variant || "default",
    }));

    const rows = buildModelSelectMenu(modelsWithCurrent, current);

    if (rows.length === 0) {
      const message = "No models available. Add favorites in OpenCode TUI (Ctrl+F on a model).";
      if (interaction && typeof interaction.reply === "function") {
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        await adapter.sendMessage(message);
      }
      return;
    }

    const text = "Select a model:";

    if (interaction && typeof interaction.reply === "function") {
      // Use interaction reply for ephemeral response
      await interaction.reply({
        content: text,
        components: rows,
        ephemeral: true,
      });
    } else {
      await adapter.sendMessage(text, { replyMarkup: rows });
    }
  } catch (err) {
    logger.error("[DiscordModelHandler] Failed to load models:", err);
    const errorMessage = "Failed to load models list.";
    if (interaction && typeof interaction.reply === "function") {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    } else {
      await adapter.sendMessage(errorMessage);
    }
  }
}

/**
 * Handle model selection from select menu
 */
export async function handleModelSelectInteraction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: any,
  adapter: DiscordAdapter,
): Promise<void> {
  const customId = interaction?.customId;
  if (!customId || !customId.startsWith("model:")) {
    return;
  }

  const selectedValue = interaction?.values?.[0];
  if (!selectedValue) {
    return;
  }

  // Acknowledge immediately
  if (typeof interaction.deferUpdate === "function") {
    await interaction.deferUpdate();
  }

  // Parse providerID:modelID
  const colonIndex = selectedValue.indexOf(":");
  if (colonIndex === -1) {
    logger.warn(`[DiscordModelHandler] Invalid model value: ${selectedValue}`);
    return;
  }

  const providerID = selectedValue.substring(0, colonIndex);
  const modelID = selectedValue.substring(colonIndex + 1);

  logger.info(`[DiscordModelHandler] Selected model: ${providerID}/${modelID}`);

  const currentModel = getStoredModel();
  selectModel({
    providerID,
    modelID,
    variant: currentModel?.variant || "default",
  });

  // Acknowledge selection
  if (typeof interaction.editReply === "function") {
    await interaction.editReply({
      content: `Model selected: ${modelID}`,
      components: [], // Remove the select menu
    });
  }

  // Delete the original message if not ephemeral
  const messageId = interaction?.message?.id;
  if (messageId && typeof adapter.deleteMessage === "function") {
    // Don't delete ephemeral messages
  }
}
