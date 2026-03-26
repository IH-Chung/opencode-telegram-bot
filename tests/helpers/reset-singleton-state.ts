interface SummaryAggregatorPrivateState {
  onCompleteCallback: null;
  onToolCallback: null;
  onToolFileCallback: null;
  onQuestionCallback: null;
  onQuestionErrorCallback: null;
  onThinkingCallback: null;
  onTokensCallback: null;
  onSessionCompactedCallback: null;
  onSessionErrorCallback: null;
  onPermissionCallback: null;
  onSessionDiffCallback: null;
  onFileChangeCallback: null;
  typingIndicatorCallback: null;
}

interface ProcessManagerPrivateState {
  state: {
    process: null;
    pid: null;
    startTime: null;
    isRunning: boolean;
  };
}

export async function resetSingletonState(): Promise<void> {
  const [
    { questionManager },
    { permissionManager },
    { renameManager },
    { interactionManager },
    { summaryAggregator },
    { processManager },
    { stopEventListening },
    { __resetSessionDirectoryCacheForTests },
    { clearProcessedMessages },
    { stopMessagePolling },
    { activeSessionManager },
  ] = await Promise.all([
    import("../../src/question/manager.js"),
    import("../../src/permission/manager.js"),
    import("../../src/rename/manager.js"),
    import("../../src/interaction/manager.js"),
    import("../../src/summary/aggregator.js"),
    import("../../src/process/manager.js"),
    import("../../src/opencode/events.js"),
    import("../../src/session/cache-manager.js"),
    import("../../src/opencode/processed-messages.js"),
    import("../../src/opencode/message-poller.js"),
    import("../../src/session/active-session-manager.js"),
  ]);

  stopEventListening();
  stopMessagePolling();
  clearProcessedMessages();
  questionManager.clear();
  permissionManager.clear();
  renameManager.clear();
  interactionManager.clear("test_reset");
  summaryAggregator.clear();

  const aggregator = summaryAggregator as unknown as SummaryAggregatorPrivateState;
  aggregator.onCompleteCallback = null;
  aggregator.onToolCallback = null;
  aggregator.onToolFileCallback = null;
  aggregator.onQuestionCallback = null;
  aggregator.onQuestionErrorCallback = null;
  aggregator.onThinkingCallback = null;
  aggregator.onTokensCallback = null;
  aggregator.onSessionCompactedCallback = null;
  aggregator.onSessionErrorCallback = null;
  aggregator.onPermissionCallback = null;
  aggregator.onSessionDiffCallback = null;
  aggregator.onFileChangeCallback = null;
  aggregator.typingIndicatorCallback = null;

  const process = processManager as unknown as ProcessManagerPrivateState;
  process.state = {
    process: null,
    pid: null,
    startTime: null,
    isRunning: false,
  };

  __resetSessionDirectoryCacheForTests();
  activeSessionManager.reset();

  // Reset question poller
  const { resetQuestionPollerState } = await import("../../src/opencode/question-poller.js");
  resetQuestionPollerState();

  // Reset skill cache
  const { clearSkillCache } = await import("../../src/skill/manager.js");
  clearSkillCache();
}
