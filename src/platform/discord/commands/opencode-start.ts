import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { processManager } from "../../../process/manager.js";
import { logger } from "../../../utils/logger.js";
import { t } from "../../../i18n/index.js";

/**
 * Wait for OpenCode server to become ready by polling health endpoint.
 */
async function waitForServerReady(maxWaitMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const { data, error } = await opencodeClient.global.health();

      if (!error && data?.healthy) {
        return true;
      }
    } catch {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return false;
}

export async function handleOpencodeStartCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    // Check if process is already running under our management
    if (processManager.isRunning()) {
      const uptime = processManager.getUptime();
      const uptimeStr = uptime ? Math.floor(uptime / 1000) : 0;

      await interaction.editReply({
        content: t("opencode_start.already_running_managed", {
          pid: processManager.getPID() ?? "-",
          seconds: uptimeStr,
        }),
      });
      return;
    }

    // Check if server is accessible (external process)
    try {
      const { data, error } = await opencodeClient.global.health();

      if (!error && data?.healthy) {
        await interaction.editReply({
          content: t("opencode_start.already_running_external", {
            version: data.version || t("common.unknown"),
          }),
        });
        return;
      }
    } catch {
      // Server not accessible, continue with start
    }

    // Notify user that we're starting the server
    await interaction.editReply({ content: t("opencode_start.starting") });

    // Start the process
    const { success, error: processError } = await processManager.start();

    if (!success) {
      await interaction.editReply({
        content: t("opencode_start.start_error", {
          error: processError || t("common.unknown_error"),
        }),
      });
      return;
    }

    // Wait for server to become ready
    logger.info("[Discord] Waiting for OpenCode server to become ready...");
    const ready = await waitForServerReady(10000);

    if (!ready) {
      await interaction.editReply({
        content: t("opencode_start.started_not_ready", {
          pid: processManager.getPID() ?? "-",
        }),
      });
      return;
    }

    // Get server version and send success message
    const { data: health } = await opencodeClient.global.health();
    await interaction.editReply({
      content: t("opencode_start.success", {
        pid: processManager.getPID() ?? "-",
        version: health?.version || t("common.unknown"),
      }),
    });

    logger.info(`[Discord] OpenCode server started successfully, PID=${processManager.getPID()}`);
  } catch (err) {
    logger.error("[Discord] OpenCode start command error", err);
    await interaction.editReply({ content: t("opencode_start.error") });
  }
}
