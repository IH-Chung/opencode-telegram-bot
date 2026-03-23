import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { getCurrentSession, setCurrentSession } from "../../../session/manager.js";
import { discordPinnedMessageManager } from "../pinned-manager.js";
import { logger } from "../../../utils/logger.js";
import { t } from "../../../i18n/index.js";

export async function handleRenameCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const currentSession = getCurrentSession();

    if (!currentSession) {
      await interaction.editReply({ content: t("rename.no_session") });
      return;
    }

    const newName = interaction.options.getString("name", true).trim();

    if (!newName) {
      await interaction.editReply({ content: t("rename.empty_title") });
      return;
    }

    logger.info(`[Discord] Renaming session ${currentSession.id} to: ${newName}`);

    const { data: updatedSession, error } = await opencodeClient.session.update({
      sessionID: currentSession.id,
      directory: currentSession.directory,
      title: newName,
    });

    if (error || !updatedSession) {
      throw error || new Error("Failed to update session");
    }

    setCurrentSession({
      id: currentSession.id,
      title: newName,
      directory: currentSession.directory,
    });

    if (discordPinnedMessageManager.isInitialized()) {
      await discordPinnedMessageManager.onSessionChanged(
        currentSession.id,
        newName,
        currentSession.directory,
      );
    }

    await interaction.editReply({
      content: t("rename.success", { title: newName }),
    });

    logger.info(`[Discord] Session renamed successfully: ${newName}`);
  } catch (err) {
    logger.error("[Discord] Rename command error", err);
    await interaction.editReply({ content: t("rename.error") });
  }
}
