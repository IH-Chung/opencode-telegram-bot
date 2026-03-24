/**
 * Discord agent selection handler - renders agent modes as Discord buttons
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import {
  getAvailableAgents,
  selectAgent,
  getStoredAgent,
  getAgentDefaultModel,
} from "../../../agent/manager.js";
import { selectModel, getStoredModel } from "../../../model/manager.js";
import { logger } from "../../../utils/logger.js";
import { getAgentEmoji } from "../../../agent/types.js";
import type { AgentInfo } from "../../../agent/types.js";
import type { DiscordAdapter } from "../adapter.js";

// Max buttons per ActionRow
const MAX_BUTTONS_PER_ROW = 5;

/**
 * Build Discord buttons for agent selection from real agent list
 */
function buildAgentButtons(
  agents: AgentInfo[],
  currentAgent: string,
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const buttons: ButtonBuilder[] = agents.map((agent) => {
    const isSelected = currentAgent === agent.name;
    const emoji = getAgentEmoji(agent.name);
    const capitalizedName = agent.name.charAt(0).toUpperCase() + agent.name.slice(1);
    const label = isSelected ? `✅ ${emoji} ${capitalizedName}` : `${emoji} ${capitalizedName}`;

    return new ButtonBuilder()
      .setCustomId(`agent:${agent.name}`)
      .setLabel(label.substring(0, 80))
      .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Primary);
  });

  // Group into rows of 5 (Discord limit)
  for (let i = 0; i < buttons.length; i += MAX_BUTTONS_PER_ROW) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      buttons.slice(i, i + MAX_BUTTONS_PER_ROW),
    );
    rows.push(row);
  }

  return rows;
}

/**
 * Show agent selection menu with all available agents from the API
 */
export async function showDiscordAgentSelection(
  adapter: DiscordAdapter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction?: any,
): Promise<void> {
  try {
    const agents = await getAvailableAgents();
    const currentAgent = getStoredAgent();

    if (agents.length === 0) {
      const message = "No agents available.";
      if (interaction && typeof interaction.reply === "function") {
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        await adapter.sendMessage(message);
      }
      return;
    }

    const rows = buildAgentButtons(agents, currentAgent);
    const currentEmoji = getAgentEmoji(currentAgent);
    const currentName = currentAgent.charAt(0).toUpperCase() + currentAgent.slice(1);
    const text = `⚡ **Agent Selection**\nCurrent: ${currentEmoji} ${currentName}`;

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
    logger.error("[DiscordAgentHandler] Failed to load agents:", err);
    const errorMessage = "Failed to load agents list.";
    if (interaction && typeof interaction.reply === "function") {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    } else {
      await adapter.sendMessage(errorMessage);
    }
  }
}

/**
 * Handle agent button interaction
 */
export async function handleAgentButtonInteraction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: any,
  _adapter: DiscordAdapter,
): Promise<void> {
  const customId = interaction?.customId;
  if (!customId || !customId.startsWith("agent:")) {
    return;
  }

  // Acknowledge immediately
  if (typeof interaction.deferUpdate === "function") {
    await interaction.deferUpdate();
  }

  const agentName = customId.substring(6); // Remove "agent:" prefix

  logger.info(`[DiscordAgentHandler] Selected agent: ${agentName}`);

  selectAgent(agentName);

  // Switch to agent's default model if one is configured
  const defaultModel = await getAgentDefaultModel(agentName);
  if (defaultModel) {
    selectModel({
      providerID: defaultModel.providerID,
      modelID: defaultModel.modelID,
      variant: "default",
    });
    logger.info(
      `[DiscordAgentHandler] Switched to agent default model: ${defaultModel.providerID}/${defaultModel.modelID}`,
    );
  }

  const emoji = getAgentEmoji(agentName);
  const capitalizedName = agentName.charAt(0).toUpperCase() + agentName.slice(1);
  const currentModel = getStoredModel();
  const modelLabel =
    currentModel.providerID && currentModel.modelID
      ? `\`${currentModel.modelID}\``
      : "Agent default";
  const modelSource = defaultModel ? " *(agent default)*" : "";

  // Acknowledge selection with agent + model info
  if (typeof interaction.editReply === "function") {
    await interaction.editReply({
      content: `✅ **Agent:** ${emoji} ${capitalizedName}\n🤖 **Model:** ${modelLabel}${modelSource}`,
      components: [], // Remove buttons
    });
  }
}
