/**
 * Discord model selection handler - renders model selection as Discord select menus.
 * Splits models across multiple select menus if needed (Discord limit: 25 per menu, 5 rows max).
 */
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getModelSelectionLists, selectModel, getStoredModel } from "../../../model/manager.js";
import { logger } from "../../../utils/logger.js";
import type { DiscordAdapter } from "../adapter.js";
import type { ModelInfo } from "../../../model/types.js";
import type { FavoriteModel } from "../../../model/types.js";

// Discord limits
const MAX_SELECT_OPTIONS = 25;
const MAX_ACTION_ROWS = 5;

function dedupeByKey(models: FavoriteModel[]): FavoriteModel[] {
  const seen = new Set<string>();
  return models.filter((m) => {
    const key = `${m.providerID}:${m.modelID}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeModelOption(
  model: FavoriteModel,
  currentModel: ModelInfo | undefined,
  descriptionPrefix?: string,
): StringSelectMenuOptionBuilder {
  const label = model.modelID.substring(0, 100);
  const value = `${model.providerID}:${model.modelID}`;
  const isDefault =
    currentModel !== undefined &&
    currentModel.modelID === model.modelID &&
    currentModel.providerID === model.providerID;

  const option = new StringSelectMenuOptionBuilder()
    .setLabel(label)
    .setValue(value)
    .setDefault(isDefault);

  const desc = descriptionPrefix ? `${descriptionPrefix} · ${model.providerID}` : model.providerID;
  option.setDescription(desc.substring(0, 100));

  return option;
}

/**
 * Build select menu rows for a list of models.
 * Splits into multiple select menus (25 options each) as needed.
 */
function buildModelSelectMenus(
  models: FavoriteModel[],
  currentModel: ModelInfo | undefined,
  menuIdPrefix: string,
  placeholder: string,
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  if (models.length === 0) return [];

  const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
  const chunks: FavoriteModel[][] = [];

  for (let i = 0; i < models.length; i += MAX_SELECT_OPTIONS) {
    chunks.push(models.slice(i, i + MAX_SELECT_OPTIONS));
  }

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const options = chunk.map((m) => makeModelOption(m, currentModel));
    const suffix = chunks.length > 1 ? ` (${idx + 1}/${chunks.length})` : "";

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`model:select:${menuIdPrefix}:${idx}`)
        .setPlaceholder(`${placeholder}${suffix}`)
        .addOptions(options),
    );
    rows.push(row);
  }

  return rows;
}

/**
 * Show model selection menu.
 * Default: favorites + recent (compact, up to 25).
 * showAll=true: favorites section + all catalog models in multiple menus.
 */
export async function showDiscordModelSelection(
  adapter: DiscordAdapter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction?: any,
  showAll = false,
): Promise<void> {
  try {
    const lists = await getModelSelectionLists();
    const current = getStoredModel();

    const allRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    if (showAll) {
      // /model all — show favorites + all catalog in separate menus
      if (lists.favorites.length > 0) {
        const favRows = buildModelSelectMenus(lists.favorites, current, "fav", "⭐ Favorites");
        allRows.push(...favRows);
      }
      if (lists.recent.length > 0) {
        const recentRows = buildModelSelectMenus(lists.recent, current, "all", "All Models");
        allRows.push(...recentRows);
      }
    } else {
      // /model — compact: merge favorites + recent, single menu (up to 25)
      const merged = dedupeByKey([...lists.favorites, ...lists.recent]);
      const capped = merged.slice(0, MAX_SELECT_OPTIONS);
      if (capped.length > 0) {
        const rows = buildModelSelectMenus(capped, current, "compact", "Select a model");
        allRows.push(...rows);
      }
    }

    // Discord max 5 action rows
    const rows = allRows.slice(0, MAX_ACTION_ROWS);

    if (rows.length === 0) {
      const message = "No models available. Add favorites in OpenCode TUI (Ctrl+F on a model).";
      if (interaction && typeof interaction.reply === "function") {
        await interaction.reply({ content: message, ephemeral: true });
      } else {
        await adapter.sendMessage(message);
      }
      return;
    }

    const currentDisplay =
      current.providerID && current.modelID ? `${current.modelID}` : "Auto (agent default)";
    const totalModels = lists.favorites.length + lists.recent.length;
    const modeHint = showAll
      ? `⭐ ${lists.favorites.length} favorites · ${lists.recent.length} catalog`
      : `Use \`/model all\` to see all ${totalModels} models`;
    const text = `🧠 **Model Selection**\nCurrent: ${currentDisplay}\n${modeHint}`;

    if (interaction && typeof interaction.reply === "function") {
      await interaction.reply({
        content: text,
        components: rows,
        ephemeral: true,
      });
    } else {
      await adapter.sendMessage(text, { replyMarkup: rows });
    }
  } catch (err) {
    logger.error("[DiscordModelHandler] Failed to load models:", err);
    const errorMessage = "Failed to load models list.";
    if (interaction && typeof interaction.reply === "function") {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    } else {
      await adapter.sendMessage(errorMessage);
    }
  }
}

/**
 * Handle model selection from select menu
 */
export async function handleModelSelectInteraction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: any,
  _adapter: DiscordAdapter,
): Promise<void> {
  const customId = interaction?.customId;
  if (!customId || !customId.startsWith("model:select")) {
    return;
  }

  const selectedValue = interaction?.values?.[0];
  if (!selectedValue) {
    return;
  }

  // Acknowledge immediately
  if (typeof interaction.deferUpdate === "function") {
    await interaction.deferUpdate();
  }

  // Parse providerID:modelID
  const colonIndex = selectedValue.indexOf(":");
  if (colonIndex === -1) {
    logger.warn(`[DiscordModelHandler] Invalid model value: ${selectedValue}`);
    return;
  }

  const providerID = selectedValue.substring(0, colonIndex);
  const modelID = selectedValue.substring(colonIndex + 1);

  logger.info(`[DiscordModelHandler] Selected model: ${providerID}/${modelID}`);

  const currentModel = getStoredModel();
  selectModel({
    providerID,
    modelID,
    variant: currentModel?.variant || "default",
  });

  // Acknowledge selection
  if (typeof interaction.editReply === "function") {
    await interaction.editReply({
      content: `Model selected: ${modelID}`,
      components: [],
    });
  }
}
