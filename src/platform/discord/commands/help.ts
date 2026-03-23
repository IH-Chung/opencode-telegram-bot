import type { ChatInputCommandInteraction } from "discord.js";
import { DISCORD_COMMAND_DEFINITIONS } from "./definitions.js";
import { t } from "../../../i18n/index.js";

export async function handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const lines = DISCORD_COMMAND_DEFINITIONS.map((cmd) => {
    const name = cmd.name;
    const description = cmd.description;
    return `**/${name}** - ${description}`;
  });

  const message = `📖 ${t("cmd.description.help")}\n\n${lines.join("\n")}\n\n${t("help.keyboard_hint")}`;

  await interaction.editReply({ content: message });
}
