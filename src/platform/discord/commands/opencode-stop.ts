import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { processManager } from "../../../process/manager.js";
import { logger } from "../../../utils/logger.js";
import { t } from "../../../i18n/index.js";

export async function handleOpencodeStopCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    // Check if process is running under our management
    if (!processManager.isRunning()) {
      // Check if there's an external server running
      try {
        const { data, error } = await opencodeClient.global.health();

        if (!error && data?.healthy) {
          await interaction.editReply({
            content: t("opencode_stop.external_running"),
          });
          return;
        }
      } catch {
        // Server not accessible
      }

      await interaction.editReply({ content: t("opencode_stop.not_running") });
      return;
    }

    // Notify user that we're stopping the server
    const pid = processManager.getPID();
    await interaction.editReply({ content: t("opencode_stop.stopping", { pid: pid ?? "-" }) });

    // Stop the process
    const { success, error: stopError } = await processManager.stop(5000);

    if (!success) {
      await interaction.editReply({
        content: t("opencode_stop.stop_error", {
          error: stopError || t("common.unknown_error"),
        }),
      });
      return;
    }

    // Success - process has been stopped
    await interaction.editReply({ content: t("opencode_stop.success") });

    logger.info("[Discord] OpenCode server stopped successfully");
  } catch (err) {
    logger.error("[Discord] OpenCode stop command error", err);
    await interaction.editReply({ content: t("opencode_stop.error") });
  }
}
