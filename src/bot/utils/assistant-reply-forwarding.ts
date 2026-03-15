export interface AssistantReplyForwardingParams {
  sessionId: string;
  currentSessionId?: string;
  currentProjectDirectory?: string;
  sessionExistsInProject: (sessionId: string, directory: string) => Promise<boolean>;
}

export async function shouldForwardAssistantReply(
  params: AssistantReplyForwardingParams,
): Promise<boolean> {
  if (params.currentSessionId === params.sessionId) {
    return true;
  }

  if (!params.currentProjectDirectory) {
    return false;
  }

  return params.sessionExistsInProject(params.sessionId, params.currentProjectDirectory);
}
