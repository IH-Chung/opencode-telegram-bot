import type {
  InteractionClearReason,
  InteractionState,
  StartInteractionOptions,
  TransitionInteractionOptions,
} from "./types.js";
import { logger } from "../utils/logger.js";

export const DEFAULT_ALLOWED_INTERACTION_COMMANDS = ["/help", "/status", "/abort"] as const;

function normalizeCommand(command: string): string | null {
  const trimmed = command.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutMention = withSlash.split("@")[0];

  if (withoutMention.length <= 1) {
    return null;
  }

  return withoutMention;
}

function normalizeAllowedCommands(commands?: string[]): string[] {
  if (commands === undefined) {
    return [...DEFAULT_ALLOWED_INTERACTION_COMMANDS];
  }

  const normalized = new Set<string>();

  for (const command of commands) {
    const value = normalizeCommand(command);
    if (value) {
      normalized.add(value);
    }
  }

  return Array.from(normalized);
}

function cloneState(state: InteractionState): InteractionState {
  return {
    ...state,
    allowedCommands: [...state.allowedCommands],
    metadata: { ...state.metadata },
  };
}

class InteractionManager {
  private states: Map<string, InteractionState> = new Map();

  start(options: StartInteractionOptions, sessionId: string = "default"): InteractionState {
    const now = Date.now();
    let expiresAt: number | null = null;

    if (this.states.has(sessionId)) {
      this.clear("state_replaced", sessionId);
    }

    if (typeof options.expiresInMs === "number") {
      expiresAt = now + options.expiresInMs;
    }

    const nextState: InteractionState = {
      kind: options.kind,
      expectedInput: options.expectedInput,
      allowedCommands: normalizeAllowedCommands(options.allowedCommands),
      metadata: options.metadata ? { ...options.metadata } : {},
      createdAt: now,
      expiresAt,
    };

    this.states.set(sessionId, nextState);

    logger.info(
      `[InteractionManager] Started interaction: kind=${nextState.kind}, expectedInput=${nextState.expectedInput}, allowedCommands=${nextState.allowedCommands.join(",") || "none"}, session=${sessionId}`,
    );

    return cloneState(nextState);
  }

  get(sessionId: string = "default"): InteractionState | null {
    const state = this.states.get(sessionId);
    if (!state) {
      return null;
    }
    return cloneState(state);
  }

  getSnapshot(sessionId: string = "default"): InteractionState | null {
    return this.get(sessionId);
  }

  isActive(sessionId: string = "default"): boolean {
    return this.states.has(sessionId);
  }

  isExpired(referenceTimeMs: number = Date.now(), sessionId: string = "default"): boolean {
    const state = this.states.get(sessionId);
    if (!state || state.expiresAt === null) {
      return false;
    }
    return referenceTimeMs >= state.expiresAt;
  }

  transition(
    options: TransitionInteractionOptions,
    sessionId: string = "default",
  ): InteractionState | null {
    const state = this.states.get(sessionId);
    if (!state) {
      return null;
    }

    const now = Date.now();

    const nextState: InteractionState = {
      ...state,
      kind: options.kind ?? state.kind,
      expectedInput: options.expectedInput ?? state.expectedInput,
      allowedCommands:
        options.allowedCommands !== undefined
          ? normalizeAllowedCommands(options.allowedCommands)
          : [...state.allowedCommands],
      metadata: options.metadata ? { ...options.metadata } : { ...state.metadata },
      expiresAt:
        options.expiresInMs === undefined
          ? state.expiresAt
          : options.expiresInMs === null
            ? null
            : now + options.expiresInMs,
    };

    this.states.set(sessionId, nextState);

    logger.debug(
      `[InteractionManager] Transitioned interaction: kind=${nextState.kind}, expectedInput=${nextState.expectedInput}, allowedCommands=${nextState.allowedCommands.join(",") || "none"}, session=${sessionId}`,
    );

    return cloneState(nextState);
  }

  clear(reason: InteractionClearReason = "manual", sessionId?: string): void {
    if (sessionId !== undefined) {
      // Clear only the specified session
      const state = this.states.get(sessionId);
      if (!state) {
        return;
      }
      logger.info(
        `[InteractionManager] Cleared interaction: reason=${reason}, kind=${state.kind}, expectedInput=${state.expectedInput}, session=${sessionId}`,
      );
      this.states.delete(sessionId);
    } else {
      // Clear ALL sessions (used by test reset and global clear)
      if (this.states.size === 0) {
        return;
      }
      logger.info(
        `[InteractionManager] Cleared ALL interactions: reason=${reason}, count=${this.states.size}`,
      );
      this.states.clear();
    }
  }
}

export const interactionManager = new InteractionManager();
