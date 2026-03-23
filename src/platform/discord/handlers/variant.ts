/**
 * Discord variant selection handler - renders model variants as Discord select menu
 */
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import {
  getAvailableVariants,
  setCurrentVariant,
  getCurrentVariant,
  formatVariantForButton,
} from "../../../variant/manager.js";
import { getStoredModel } from "../../../model/manager.js";
import { logger } from "../../../utils/logger.js";
import type { DiscordAdapter } from "../adapter.js";

// Max options in Discord select menu
const MAX_SELECT_OPTIONS = 25;

/**
 * Build Discord select menu with available variants
 */
function buildVariantSelectMenu(
  variants: Array<{ id: string; disabled?: boolean }>,
  currentVariant: string,
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const availableVariants = variants.filter((v) => !v.disabled);

  if (availableVariants.length === 0) {
    return [];
  }

  const options: StringSelectMenuOptionBuilder[] = availableVariants
    .slice(0, MAX_SELECT_OPTIONS)
    .map((variant) => {
      const label = formatVariantForButton(variant.id);
      const value = variant.id;
      const isDefault = currentVariant === variant.id;

      return new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(value)
        .setDefault(isDefault);
    });

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("variant:select")
      .setPlaceholder("Select variant")
      .addOptions(options),
  );

  return [row];
}

/**
 * Show variant selection menu
 */
export async function showDiscordVariantSelection(
  adapter: DiscordAdapter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction?: any,
): Promise<void> {
  try {
    const currentModel = getStoredModel();

    if (!currentModel?.providerID || !currentModel?.modelID) {
      const message = "No model selected. Please select a model first.";
      if (interaction && typeof interaction.reply === "function") {
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        await adapter.sendMessage(message);
      }
      return;
    }

    const variants = await getAvailableVariants(currentModel.providerID, currentModel.modelID);
    const currentVariant = getCurrentVariant();

    if (variants.length <= 1) {
      const message = "No variants available for this model.";
      if (interaction && typeof interaction.reply === "function") {
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        await adapter.sendMessage(message);
      }
      return;
    }

    const rows = buildVariantSelectMenu(variants, currentVariant);
    const text = "Select model variant:";

    if (interaction && typeof interaction.reply === "function") {
      await interaction.reply({
        content: text,
        components: rows,
        ephemeral: true,
      });
    } else {
      await adapter.sendMessage(text, { replyMarkup: rows });
    }
  } catch (err) {
    logger.error("[DiscordVariantHandler] Failed to load variants:", err);
    const errorMessage = "Failed to load variants list.";
    if (interaction && typeof interaction.reply === "function") {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    } else {
      await adapter.sendMessage(errorMessage);
    }
  }
}

/**
 * Handle variant selection from select menu
 */
export async function handleVariantSelectInteraction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: any,
  _adapter: DiscordAdapter,
): Promise<void> {
  const customId = interaction?.customId;
  if (!customId || !customId.startsWith("variant:")) {
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

  logger.info(`[DiscordVariantHandler] Selected variant: ${selectedValue}`);

  setCurrentVariant(selectedValue);

  // Acknowledge selection
  if (typeof interaction.editReply === "function") {
    await interaction.editReply({
      content: `Variant selected: ${formatVariantForButton(selectedValue)}`,
      components: [], // Remove select menu
    });
  }
}
