import { permissionManager } from "../permission/manager.js";
import { questionManager } from "../question/manager.js";
import { renameManager } from "../rename/manager.js";
import { interactionManager } from "./manager.js";
import { logger } from "../utils/logger.js";

/**
 * Clear all interaction-related state.
 * If sessionId is provided, clears only that session's question state.
 * If sessionId is undefined, clears all interaction state (existing behavior).
 *
 * Note: renameManager and permissionManager are not per-session in this implementation.
 * They are cleared as a whole regardless of sessionId.
 */
export function clearAllInteractionState(reason: string, sessionId?: string): void {
  const questionActive = sessionId
    ? questionManager.isActive(sessionId)
    : questionManager.isActive();
  const permissionActive = permissionManager.isActive();
  const renameActive = renameManager.isWaitingForName();
  const interactionSnapshot = interactionManager.getSnapshot();

  questionManager.clear(sessionId);
  permissionManager.clear();
  renameManager.clear();
  interactionManager.clear(reason);

  const hasAnyActiveState =
    questionActive || permissionActive || renameActive || interactionSnapshot !== null;

  const sessionPart = sessionId ? `, session=${sessionId}` : "";
  const message =
    `[InteractionCleanup] Cleared state: reason=${reason}${sessionPart}, ` +
    `questionActive=${questionActive}, permissionActive=${permissionActive}, ` +
    `renameActive=${renameActive}, interactionKind=${interactionSnapshot?.kind || "none"}`;

  if (hasAnyActiveState) {
    logger.info(message);
    return;
  }

  logger.debug(message);
}
