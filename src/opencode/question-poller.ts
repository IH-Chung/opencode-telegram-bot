/**
 * Polls the `/question` API to discover pending questions that the SSE
 * event stream might have missed. This ensures questions triggered from
 * the GUI are always visible in Telegram, even if the `question.asked`
 * SSE event was lost due to timing or reconnection.
 */

import { opencodeClient } from "./client.js";
import { logger } from "../utils/logger.js";
import type { Question } from "../question/types.js";

const POLL_INTERVAL_MS = 3_000;

type QuestionDiscoveredCallback = (
  questions: Question[],
  requestID: string,
  sessionId: string,
) => void;

interface QuestionPollerState {
  directory: string;
  timer: ReturnType<typeof setInterval> | null;
  /** Question IDs already shown to the user (to avoid duplicates). */
  seenQuestionIds: Set<string>;
  callback: QuestionDiscoveredCallback;
}

let state: QuestionPollerState | null = null;

async function pollQuestions(): Promise<void> {
  if (!state) return;

  try {
    const result = await opencodeClient.question.list({
      directory: state.directory,
    });

    // SDK returns { data, error } or the data directly
    const questions = (result as { data?: unknown }).data ?? result;

    if (!Array.isArray(questions) || questions.length === 0) return;

    for (const q of questions) {
      const qId = q.id as string;
      if (!qId || state.seenQuestionIds.has(qId)) continue;

      // Mark as seen immediately to prevent double-delivery
      state.seenQuestionIds.add(qId);

      const questionList: Question[] = (q.questions as Question[]) || [];
      if (questionList.length === 0) continue;

      logger.info(
        `[QuestionPoller] Discovered pending question: ${qId}, session=${q.sessionID}, questions=${questionList.length}`,
      );

      if (state.callback) {
        state.callback(questionList, qId, q.sessionID as string);
      }
    }
  } catch (err) {
    // Silently ignore polling errors (server might be down)
    logger.debug("[QuestionPoller] Poll error:", err);
  }
}

/**
 * Start polling for pending questions.
 * @param directory - The project directory to poll for.
 * @param callback - Called when a new (unseen) question is discovered.
 */
export function startQuestionPoller(directory: string, callback: QuestionDiscoveredCallback): void {
  stopQuestionPoller();

  state = {
    directory,
    timer: null,
    seenQuestionIds: new Set(),
    callback,
  };

  // Initial poll after a short delay (let SSE establish first)
  setTimeout(() => {
    // Load existing questions as "already seen" to avoid showing old ones
    loadInitialSnapshot().then(() => {
      if (state) {
        state.timer = setInterval(pollQuestions, POLL_INTERVAL_MS);
        logger.info(
          `[QuestionPoller] Started polling every ${POLL_INTERVAL_MS}ms for directory: ${directory}`,
        );
      }
    });
  }, 2_000);
}

/**
 * Load all currently pending questions and mark them as seen,
 * so only NEW questions trigger the callback.
 */
async function loadInitialSnapshot(): Promise<void> {
  if (!state) return;

  try {
    const result = await opencodeClient.question.list({
      directory: state.directory,
    });

    const questions = (result as { data?: unknown }).data ?? result;

    if (Array.isArray(questions)) {
      for (const q of questions) {
        if (q.id) {
          state.seenQuestionIds.add(q.id as string);
        }
      }
      logger.info(
        `[QuestionPoller] Initial snapshot: ${state.seenQuestionIds.size} existing questions marked as seen`,
      );
    }
  } catch (err) {
    logger.debug("[QuestionPoller] Snapshot error:", err);
  }
}

/**
 * Mark a question ID as seen (called when the SSE-based handler
 * already showed this question to prevent duplicate display).
 */
export function markQuestionSeen(questionId: string): void {
  if (state) {
    state.seenQuestionIds.add(questionId);
  }
}

/** Stop polling. */
export function stopQuestionPoller(): void {
  if (state?.timer) {
    clearInterval(state.timer);
  }
  state = null;
}

/** Reset state (for testing). */
export function resetQuestionPollerState(): void {
  stopQuestionPoller();
}
