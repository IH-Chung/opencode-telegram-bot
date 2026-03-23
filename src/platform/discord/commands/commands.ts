import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { getCurrentProject } from "../../../settings/manager.js";
import { t } from "../../../i18n/index.js";
import { logger } from "../../../utils/logger.js";

export async function handleCommandsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const currentProject = getCurrentProject();

    if (!currentProject) {
      await interaction.editReply({ content: t("bot.project_not_selected") });
      return;
    }

    const { data: commands, error } = await opencodeClient.command.list({
      directory: currentProject.worktree.replace(/\\/g, "/"),
    });

    if (error || !commands) {
      throw error || new Error("No command data received");
    }

    const validCommands = commands
      .filter((cmd) => typeof cmd.name === "string" && cmd.name.trim().length > 0)
      .map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
      }));

    if (validCommands.length === 0) {
      await interaction.editReply({ content: t("commands.empty") });
      return;
    }

    const lines = validCommands.slice(0, 10).map((cmd, index) => {
      const description = cmd.description?.trim() || t("commands.no_description");
      return `${index + 1}. **/${cmd.name}** - ${description}`;
    });

    const message = `⚡ ${t("commands.select")}\n\n${lines.join("\n")}\n\nUse /commands in the Telegram bot for full command management.`;

    await interaction.editReply({ content: message });
  } catch (err) {
    logger.error("[Discord] Commands command error", err);
    await interaction.editReply({ content: t("commands.fetch_error") });
  }
}
