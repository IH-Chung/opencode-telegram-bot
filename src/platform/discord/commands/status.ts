import type { ChatInputCommandInteraction } from "discord.js";
import { opencodeClient } from "../../../opencode/client.js";
import { getCurrentSession } from "../../../session/manager.js";
import { getCurrentProject } from "../../../settings/manager.js";
import { fetchCurrentAgent } from "../../../agent/manager.js";
import { getAgentDisplayName } from "../../../agent/types.js";
import { fetchCurrentModel } from "../../../model/manager.js";
import { processManager } from "../../../process/manager.js";
import { logger } from "../../../utils/logger.js";
import { t } from "../../../i18n/index.js";
import { createStatusEmbed } from "../formatter.js";

export async function handleStatusCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const { data, error } = await opencodeClient.global.health();

    if (error || !data) {
      throw error || new Error("No data received from server");
    }

    const healthLabel = data.healthy ? t("status.health.healthy") : t("status.health.unhealthy");
    const statusType = data.healthy ? "idle" : "error";

    let description = `${t("status.line.health", { health: healthLabel })}\n`;
    if (data.version) {
      description += `${t("status.line.version", { version: data.version })}\n`;
    }

    if (processManager.isRunning()) {
      const uptime = processManager.getUptime();
      const uptimeStr = uptime ? Math.floor(uptime / 1000) : 0;
      description += `${t("status.line.managed_yes")}\n`;
      description += `${t("status.line.pid", { pid: processManager.getPID() ?? "-" })}\n`;
      description += `${t("status.line.uptime_sec", { seconds: uptimeStr })}\n`;
    } else {
      description += `${t("status.line.managed_no")}\n`;
    }

    const currentAgent = await fetchCurrentAgent();
    const agentDisplay = currentAgent
      ? getAgentDisplayName(currentAgent)
      : t("status.agent_not_set");
    description += `${t("status.line.mode", { mode: agentDisplay })}\n`;

    const currentModel = fetchCurrentModel();
    const modelDisplay = `${currentModel.providerID}/${currentModel.modelID}`;
    description += `${t("status.line.model", { model: `🤖 ${modelDisplay}` })}\n`;

    const currentProject = getCurrentProject();
    if (currentProject) {
      const projectName = currentProject.name || currentProject.worktree;
      description += `\n${t("status.project_selected", { project: projectName })}\n`;
    } else {
      description += `\n${t("status.project_not_selected")}\n`;
      description += t("status.project_hint") + "\n";
    }

    const currentSession = getCurrentSession();
    if (currentSession) {
      description += `\n${t("status.session_selected", { title: currentSession.title })}\n`;
    } else {
      description += `\n${t("status.session_not_selected")}\n`;
      description += t("status.session_hint");
    }

    const embed = createStatusEmbed({
      sessionTitle: currentSession?.title,
      projectName: currentProject ? currentProject.name || currentProject.worktree : undefined,
      modelName: modelDisplay,
      agentName: agentDisplay,
      status: statusType,
    });

    embed.setDescription(description);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error("[Discord] Status command error", err);
    await interaction.editReply({ content: t("status.server_unavailable") });
  }
}
