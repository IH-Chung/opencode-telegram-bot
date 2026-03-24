import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { setCurrentSession, SessionInfo } from "../../../session/manager.js";
import { ingestSessionInfoForCache } from "../../../session/cache-manager.js";
import { getCurrentProject } from "../../../settings/manager.js";
import { clearAllInteractionState } from "../../../interaction/cleanup.js";
import { summaryAggregator } from "../../../summary/aggregator.js";
import { getStoredAgent, getAgentDefaultModel } from "../../../agent/manager.js";
import { logger } from "../../../utils/logger.js";
import { t } from "../../../i18n/index.js";
import type { DiscordAdapter } from "../adapter.js";

export interface NewCommandDeps {
  ensureEventSubscription: (directory: string) => Promise<void>;
  adapter: DiscordAdapter;
}

export async function handleNewCommand(
  interaction: ChatInputCommandInteraction,
  deps: NewCommandDeps,
): Promise<void> {
  await interaction.deferReply();

  try {
    const currentProject = getCurrentProject();

    if (!currentProject) {
      await interaction.editReply({ content: t("new.project_not_selected") });
      return;
    }

    logger.debug("[Discord] Creating new session for directory:", currentProject.worktree);

    const { data: session, error } = await opencodeClient.session.create({
      directory: currentProject.worktree,
    });

    if (error || !session) {
      throw error || new Error("No data received from server");
    }

    logger.info(
      `[Discord] Created new session via /new command: id=${session.id}, title="${session.title}", project=${currentProject.worktree}`,
    );

    const sessionInfo: SessionInfo = {
      id: session.id,
      title: session.title,
      directory: currentProject.worktree,
    };
    setCurrentSession(sessionInfo);
    summaryAggregator.clear();
    summaryAggregator.setSession(session.id);
    clearAllInteractionState("session_created");
    await ingestSessionInfoForCache(session);

    deps.ensureEventSubscription(currentProject.worktree);

    const currentAgent = getStoredAgent();
    const agentDefaultModel = await getAgentDefaultModel(currentAgent);
    if (agentDefaultModel) {
      const { selectModel } = await import("../../../model/manager.js");
      selectModel({
        providerID: agentDefaultModel.providerID,
        modelID: agentDefaultModel.modelID,
        variant: "default",
      });
    }

    await interaction.editReply({ content: t("new.created", { title: session.title }) });

    // Create a thread from the reply so all conversation stays organized
    await deps.adapter.createThreadFromInteraction(interaction, session.title);
  } catch (err) {
    logger.error("[Discord] New command error", err);
    await interaction.editReply({ content: t("new.create_error") });
  }
}
