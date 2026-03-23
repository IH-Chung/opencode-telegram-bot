import type { ChatInputCommandInteraction } from "discord.js";
import { getCurrentProject } from "../../../settings/manager.js";
import { getAvailableSkills } from "../../../skill/manager.js";
import { t } from "../../../i18n/index.js";
import { logger } from "../../../utils/logger.js";

export async function handleSkillsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const currentProject = getCurrentProject();

    if (!currentProject) {
      await interaction.editReply({ content: t("skills.no_project") });
      return;
    }

    const skills = await getAvailableSkills(currentProject.worktree);

    if (!skills || skills.length === 0) {
      await interaction.editReply({ content: t("skills.empty") });
      return;
    }

    const lines = skills.map((skill) => {
      const name = `**${skill.name}**`;
      const description = skill.description || "";
      return `${name}\n${description}`;
    });

    const message = `🛠 ${t("skills.title")}\n\n${lines.join("\n\n")}`;

    await interaction.editReply({ content: message });
  } catch (err) {
    logger.error("[Discord] Skills command error", err);
    await interaction.editReply({ content: t("skills.error") });
  }
}
