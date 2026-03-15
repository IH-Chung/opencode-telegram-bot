import { opencodeClient } from "../opencode/client.js";
import { getCurrentProject } from "../settings/manager.js";
import { getCurrentSession } from "../session/manager.js";
import { getCurrentAgent, setCurrentAgent } from "../settings/manager.js";
import { logger } from "../utils/logger.js";
import type { AgentDefaultModel, AgentInfo } from "./types.js";

/**
 * Get list of available agents from OpenCode API
 * @returns Array of available agents (filtered by mode and hidden flag)
 */
export async function getAvailableAgents(): Promise<AgentInfo[]> {
  try {
    const project = getCurrentProject();
    const { data: agents, error } = await opencodeClient.app.agents(
      project ? { directory: project.worktree } : undefined,
    );

    if (error) {
      logger.error("[AgentManager] Failed to fetch agents:", error);
      return [];
    }

    if (!agents) {
      return [];
    }

    // Filter out hidden agents and subagents (only show primary and all)
    const filtered = agents.filter(
      (agent) => !agent.hidden && (agent.mode === "primary" || agent.mode === "all"),
    );

    logger.debug(`[AgentManager] Fetched ${filtered.length} available agents`);
    return filtered;
  } catch (err) {
    logger.error("[AgentManager] Error fetching agents:", err);
    return [];
  }
}

/**
 * Get the default model configured for a specific agent from OpenCode API
 * @param agentName Name of the agent
 * @returns Default model for the agent, or null if not configured
 */
export async function getAgentDefaultModel(agentName: string): Promise<AgentDefaultModel | null> {
  try {
    const agents = await getAvailableAgents();
    const agent = agents.find((a) => a.name === agentName);

    if (agent?.model?.providerID && agent?.model?.modelID) {
      logger.debug(
        `[AgentManager] Agent "${agentName}" default model: ${agent.model.providerID}/${agent.model.modelID}`,
      );
      return agent.model;
    }

    logger.debug(`[AgentManager] Agent "${agentName}" has no default model configured`);
    return null;
  } catch (err) {
    logger.error("[AgentManager] Error fetching agent default model:", err);
    return null;
  }
}

const DEFAULT_AGENT = "build";

/**
 * Get current agent from last session message or settings.
 * Falls back to "build" if nothing is stored.
 * @returns Current agent name
 */
export async function fetchCurrentAgent(): Promise<string> {
  const storedAgent = getCurrentAgent();
  const session = getCurrentSession();
  const project = getCurrentProject();

  if (!session || !project) {
    // No active session, return stored agent from settings
    return storedAgent ?? DEFAULT_AGENT;
  }

  try {
    const { data: messages, error } = await opencodeClient.session.messages({
      sessionID: session.id,
      directory: project.worktree,
      limit: 1,
    });

    if (error || !messages || messages.length === 0) {
      logger.debug("[AgentManager] No messages found, using stored agent");
      return storedAgent ?? DEFAULT_AGENT;
    }

    const lastAgent = messages[0].info.agent;
    logger.debug(`[AgentManager] Current agent from session: ${lastAgent}`);

    // If user explicitly selected an agent in bot settings, prefer it.
    // Session messages may contain stale agent until next prompt is sent.
    if (storedAgent && lastAgent !== storedAgent) {
      logger.debug(
        `[AgentManager] Using stored agent "${storedAgent}" instead of session agent "${lastAgent}"`,
      );
      return storedAgent;
    }

    // No stored agent yet: sync from session history
    if (lastAgent && lastAgent !== storedAgent) {
      setCurrentAgent(lastAgent);
    }

    return lastAgent || storedAgent || DEFAULT_AGENT;
  } catch (err) {
    logger.error("[AgentManager] Error fetching current agent:", err);
    return storedAgent ?? DEFAULT_AGENT;
  }
}

/**
 * Select agent and persist to settings
 * @param agentName Name of the agent to select
 */
export function selectAgent(agentName: string): void {
  logger.info(`[AgentManager] Selected agent: ${agentName}`);
  setCurrentAgent(agentName);
}

/**
 * Get stored agent from settings (synchronous)
 * @returns Current agent name or default "build"
 */
export function getStoredAgent(): string {
  return getCurrentAgent() ?? "build";
}

/**
 * Result of restoring agent+model from session history
 */
export interface SessionAgentModelInfo {
  agent: string;
  model: AgentDefaultModel | null;
  variant: string | undefined;
}

/**
 * Fetch agent and model from the last message of a session.
 * Used to restore state when switching sessions.
 * @param sessionID Session to query
 * @param directory Project directory
 * @returns Agent name and model info from last message, or null if unavailable
 */
export async function fetchSessionAgentAndModel(
  sessionID: string,
  directory: string,
): Promise<SessionAgentModelInfo | null> {
  try {
    const { data: messages, error } = await opencodeClient.session.messages({
      sessionID,
      directory,
      limit: 1,
    });

    if (error || !messages || messages.length === 0) {
      logger.debug("[AgentManager] No messages in session, cannot restore agent/model");
      return null;
    }

    const info = messages[0].info;
    const agent = info.agent || DEFAULT_AGENT;

    // Extract model — handle both UserMessage and AssistantMessage shapes
    let model: AgentDefaultModel | null = null;
    let variant: string | undefined;

    if (info.role === "user") {
      const userInfo = info as {
        model?: { providerID: string; modelID: string };
        variant?: string;
      };
      if (userInfo.model?.providerID && userInfo.model?.modelID) {
        model = { providerID: userInfo.model.providerID, modelID: userInfo.model.modelID };
      }
      variant = userInfo.variant;
    } else {
      const assistantInfo = info as { providerID?: string; modelID?: string };
      if (assistantInfo.providerID && assistantInfo.modelID) {
        model = { providerID: assistantInfo.providerID, modelID: assistantInfo.modelID };
      }
    }

    logger.debug(
      `[AgentManager] Session ${sessionID} last message: agent=${agent}, model=${model ? `${model.providerID}/${model.modelID}` : "none"}, variant=${variant || "none"}`,
    );

    return { agent, model, variant };
  } catch (err) {
    logger.error("[AgentManager] Error fetching session agent/model:", err);
    return null;
  }
}
