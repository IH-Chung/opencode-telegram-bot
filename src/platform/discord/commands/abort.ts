import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { stopEventListening } from "../../../opencode/events.js";
import { getCurrentSession } from "../../../session/manager.js";
import { clearAllInteractionState } from "../../../interaction/cleanup.js";
import { summaryAggregator } from "../../../summary/aggregator.js";
import { logger } from "../../../utils/logger.js";
import { t } from "../../../i18n/index.js";

type SessionState = "idle" | "busy" | "not-found";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function abortLocalStreaming(): void {
  stopEventListening();
  summaryAggregator.clear();
  clearAllInteractionState("abort_command");
}

async function pollSessionStatus(
  sessionId: string,
  directory: string,
  maxWaitMs: number = 5000,
): Promise<SessionState> {
  const startedAt = Date.now();
  const pollIntervalMs = 500;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const { data, error } = await opencodeClient.session.status({ directory });

      if (error || !data) {
        break;
      }

      const sessionStatus = (data as Record<string, { type?: string }>)[sessionId];
      if (!sessionStatus) {
        return "not-found";
      }

      if (sessionStatus.type === "idle" || sessionStatus.type === "error") {
        return "idle";
      }

      if (sessionStatus.type !== "busy") {
        return "not-found";
      }

      await sleep(pollIntervalMs);
    } catch (err) {
      logger.warn("[Discord] Failed to poll session status:", err);
      break;
    }
  }

  return "busy";
}

export async function handleAbortCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    abortLocalStreaming();

    const currentSession = getCurrentSession();

    if (!currentSession) {
      await interaction.editReply({ content: t("stop.no_active_session") });
      return;
    }

    await interaction.editReply({
      content: t("stop.in_progress"),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const { data: abortResult, error: abortError } = await opencodeClient.session.abort(
        {
          sessionID: currentSession.id,
          directory: currentSession.directory,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      if (abortError) {
        logger.warn("[Discord] Abort request failed:", abortError);
        await interaction.editReply({ content: t("stop.warn_unconfirmed") });
        return;
      }

      if (abortResult !== true) {
        await interaction.editReply({ content: t("stop.warn_maybe_finished") });
        return;
      }

      const finalStatus = await pollSessionStatus(
        currentSession.id,
        currentSession.directory,
        5000,
      );

      if (finalStatus === "idle" || finalStatus === "not-found") {
        await interaction.editReply({ content: t("stop.success") });
      } else {
        await interaction.editReply({ content: t("stop.warn_still_busy") });
      }
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        await interaction.editReply({ content: t("stop.warn_timeout") });
      } else {
        logger.error("[Discord] Error while aborting session:", err);
        await interaction.editReply({ content: t("stop.warn_local_only") });
      }
    }
  } catch (err) {
    logger.error("[Discord] Abort command error:", err);
    await interaction.editReply({ content: t("stop.error") });
  }
}
