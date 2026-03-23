/**
 * Discord agent selection handler - renders agent modes as Discord buttons
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getAvailableAgents, selectAgent, getStoredAgent } from "../../../agent/manager.js";
import { logger } from "../../../utils/logger.js";
import { getAgentDisplayName } from "../../../agent/types.js";
import type { DiscordAdapter } from "../adapter.js";

// Max buttons per ActionRow
const MAX_BUTTONS_PER_ROW = 5;

/**
 * Build Discord buttons for agent selection
 */
function buildAgentButtons(currentAgent: string): ActionRowBuilder<ButtonBuilder>[] {
  const agentNames = ["build", "plan"]; // Primary agents to show

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const buttons: ButtonBuilder[] = agentNames.map((agentName) => {
    const isSelected = currentAgent === agentName;
    const label = getAgentDisplayName(agentName).substring(0, 80);
    const customId = `agent:${agentName}`;

    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Primary);
  });

  // Group into rows
  for (let i = 0; i < buttons.length; i += MAX_BUTTONS_PER_ROW) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      buttons.slice(i, i + MAX_BUTTONS_PER_ROW),
    );
    rows.push(row);
  }

  return rows;
}

/**
 * Show agent selection menu
 */
export async function showDiscordAgentSelection(
  adapter: DiscordAdapter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction?: any,
): Promise<void> {
  try {
    const agents = await getAvailableAgents();
    const currentAgent = getStoredAgent();

    // Filter to primary agents
    const primaryAgents = agents.filter((a) => a.mode === "primary" || a.mode === "all");

    if (primaryAgents.length === 0) {
      const message = "No agents available.";
      if (interaction && typeof interaction.reply === "function") {
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        await adapter.sendMessage(message);
      }
      return;
    }

    const rows = buildAgentButtons(currentAgent);
    const text = "Select agent mode:";

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

  // Acknowledge selection
  if (typeof interaction.editReply === "function") {
    await interaction.editReply({
      content: `Agent mode: ${getAgentDisplayName(agentName)}`,
      components: [], // Remove buttons
    });
  }
}
