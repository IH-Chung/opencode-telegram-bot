import { readFile } from "node:fs/promises";

import { createPlatformBot } from "../platform/index.js";
import { config } from "../config.js";
import { loadSettings } from "../settings/manager.js";
import { processManager } from "../process/manager.js";
import { warmupSessionDirectoryCache } from "../session/cache-manager.js";
import { reconcileStoredModelSelection } from "../model/manager.js";
import { getRuntimeMode } from "../runtime/mode.js";
import { getRuntimePaths } from "../runtime/paths.js";
import { logger } from "../utils/logger.js";

async function getBotVersion(): Promise<string> {
  try {
    const packageJsonPath = new URL("../../package.json", import.meta.url);
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent) as { version?: string };

    return packageJson.version ?? "unknown";
  } catch (error) {
    logger.warn("[App] Failed to read bot version", error);
    return "unknown";
  }
}

export async function startBotApp(): Promise<void> {
  const mode = getRuntimeMode();
  const runtimePaths = getRuntimePaths();
  const version = await getBotVersion();

  logger.info(`Starting OpenCode Telegram Bot v${version}...`);
  logger.info(`Config loaded from ${runtimePaths.configFilePath}`);
  logger.debug(`[Runtime] Application start mode: ${mode}`);

  if (config.platform === "telegram") {
    logger.info(`Allowed User ID: ${config.telegram.allowedUserId}`);
  }

  await loadSettings();
  await processManager.initialize();
  await reconcileStoredModelSelection();
  await warmupSessionDirectoryCache();

  const platformBot = createPlatformBot(config.platform);
  await platformBot.start();
}
