import type { ChatInputCommandInteraction } from "discord.js";
import { getStoredModel } from "../../../model/manager.js";
import { formatVariantForDisplay } from "../../../variant/manager.js";
import { t } from "../../../i18n/index.js";

export async function handleVariantCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  const currentModel = getStoredModel();

  if (!currentModel.providerID || !currentModel.modelID) {
    await interaction.editReply({
      content: t("variant.select_model_first"),
    });
    return;
  }

  const variantName = formatVariantForDisplay(currentModel.variant || "default");

  await interaction.editReply({
    content: `💭 **Model Variant Selection**\n\nCurrent: ${variantName}\n\nUse the Telegram bot for full variant selection (reasoning modes).`,
  });
}
