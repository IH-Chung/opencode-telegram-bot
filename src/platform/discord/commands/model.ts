import type { ChatInputCommandInteraction } from "discord.js";
import { getStoredModel } from "../../../model/manager.js";

export async function handleModelCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const currentModel = getStoredModel();
  const modelDisplay =
    currentModel.providerID && currentModel.modelID
      ? `${currentModel.providerID}/${currentModel.modelID}`
      : "Not selected";

  await interaction.editReply({
    content: `🤖 **Model Selection**\n\nCurrent: ${modelDisplay}\n\nUse the Telegram bot for full model selection with favorites and recent history.`,
  });
}
