import type { ChatInputCommandInteraction } from "discord.js";
import { setCurrentProject, getCurrentProject } from "../../../settings/manager.js";
import { getProjects } from "../../../project/manager.js";
import { syncSessionDirectoryCache } from "../../../session/cache-manager.js";
import { clearSession } from "../../../session/manager.js";
import { summaryAggregator } from "../../../summary/aggregator.js";
import { clearAllInteractionState } from "../../../interaction/cleanup.js";
import { logger } from "../../../utils/logger.js";
import { t } from "../../../i18n/index.js";

export async function handleProjectsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    await syncSessionDirectoryCache();
    const projects = await getProjects();

    if (projects.length === 0) {
      await interaction.editReply({ content: t("projects.empty") });
      return;
    }

    const lines = projects.slice(0, 10).map((project, index) => {
      const currentMark = getCurrentProject()?.id === project.id ? " ✅" : "";
      const name = project.name || project.worktree;
      return `${index + 1}. **${name}**${currentMark}`;
    });

    const currentProject = getCurrentProject();
    const header = currentProject
      ? t("projects.select_with_current", {
          project: currentProject.name || currentProject.worktree,
        })
      : t("projects.select");

    const message = `${header}\n\n${lines.join("\n")}\n\nUse /projects in the Telegram bot for full project management.`;

    await interaction.editReply({ content: message });
  } catch (err) {
    logger.error("[Discord] Projects command error", err);
    await interaction.editReply({ content: t("projects.fetch_error") });
  }
}

export async function handleProjectSwitch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const projectId = interaction.options.getString("project");
    if (!projectId) {
      await interaction.editReply({ content: t("projects.fetch_error") });
      return;
    }

    await syncSessionDirectoryCache();
    const projects = await getProjects();
    const selectedProject = projects.find((p) => p.id === projectId);

    if (!selectedProject) {
      await interaction.editReply({ content: t("projects.select_error") });
      return;
    }

    setCurrentProject(selectedProject);
    clearSession();
    summaryAggregator.clear();
    clearAllInteractionState("project_switched");

    const projectName = selectedProject.name || selectedProject.worktree;
    await interaction.editReply({
      content: t("projects.selected", { project: projectName }),
    });
  } catch (err) {
    logger.error("[Discord] Project switch error", err);
    await interaction.editReply({ content: t("projects.select_error") });
  }
}
