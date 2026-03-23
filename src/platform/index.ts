import type { Platform } from "../config.js";
import { logger } from "../utils/logger.js";

/**
 * Platform-agnostic bot lifecycle interface.
 */
export interface PlatformBot {
  start(): Promise<void>;
}

/**
 * Factory function that creates the appropriate platform bot.
 *
 * @param platform - The platform to initialize ("telegram" | "discord")
 * @returns A PlatformBot instance with a start() method
 */
export function createPlatformBot(platform: Platform): PlatformBot {
  if (platform === "telegram") {
    return createTelegramBot();
  }
  throw new Error("Discord platform not yet implemented — see Task 13");
}

/**
 * Creates a Telegram bot lifecycle wrapper.
 * Preserves the exact startup sequence from start-bot-app.ts.
 */
function createTelegramBot(): PlatformBot {
  return {
    start: async () => {
      const { createBot, autoSubscribeEvents } = await import("./telegram/bot.js");
      const bot = createBot();

      // Check and remove webhook to ensure long polling mode
      const webhookInfo = await bot.api.getWebhookInfo();
      if (webhookInfo.url) {
        logger.info(`[Platform] Webhook detected: ${webhookInfo.url}, removing...`);
        await bot.api.deleteWebhook();
        logger.info("[Platform] Webhook removed, switching to long polling");
      }

      // Auto-subscribe to SSE events for saved project (enables GUI→Telegram sync at startup)
      await autoSubscribeEvents(bot);

      await bot.start({
        onStart: (botInfo) => {
          logger.info(`Bot @${botInfo.username} started!`);
        },
      });
    },
  };
}
