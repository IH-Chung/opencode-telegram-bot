import type { ChatInputCommandInteraction } from "discord.js";
import { getStoredAgent } from "../../../agent/manager.js";
import { getAgentDisplayName } from "../../../agent/types.js";

export async function handleAgentCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const currentAgent = getStoredAgent();
  const agentDisplay = getAgentDisplayName(currentAgent);

  await interaction.editReply({
    content: `⚡ **Agent Mode Selection**\n\nCurrent: ${agentDisplay}\n\nUse the Telegram bot for full agent selection (build/plan modes).`,
  });
}
