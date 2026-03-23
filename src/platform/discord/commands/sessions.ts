import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { getCurrentProject } from "../../../settings/manager.js";
import { t } from "../../../i18n/index.js";
import { logger } from "../../../utils/logger.js";

export async function handleSessionsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const currentProject = getCurrentProject();

    if (!currentProject) {
      await interaction.editReply({ content: t("sessions.project_not_selected") });
      return;
    }

    const { data: sessions, error } = await opencodeClient.session.list({
      directory: currentProject.worktree,
      limit: 20,
    });

    if (error || !sessions) {
      throw error || new Error("No data received from server");
    }

    if (sessions.length === 0) {
      await interaction.editReply({ content: t("sessions.empty") });
      return;
    }

    const lines = sessions
      .slice(0, 10)
      .map((session: { id: string; title: string; time?: { created?: number } }, index: number) => {
        const date = new Date(session.time?.created ?? Date.now()).toLocaleDateString();
        return `${index + 1}. **${session.title}** (${date})`;
      });

    const message = `📋 ${t("sessions.select")}\n\n${lines.join("\n")}\n\nUse /sessions in the Telegram bot for full session management.`;

    await interaction.editReply({ content: message });
  } catch (err) {
    logger.error("[Discord] Sessions command error", err);
    await interaction.editReply({ content: t("sessions.fetch_error") });
  }
}
