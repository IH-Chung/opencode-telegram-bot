import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import {
  startQuestionPoller,
  stopQuestionPoller,
  resetQuestionPollerState,
  markQuestionSeen,
} from "../../src/opencode/question-poller.js";

// Mock the opencode client
vi.mock("../../src/opencode/client.js", () => ({
  opencodeClient: {
    question: {
      list: vi.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { opencodeClient } = await import("../../src/opencode/client.js");

function flushImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function mockQuestionListResponse(
  questions: Array<{
    id: string;
    sessionID: string;
    questions: Array<{ id: string; text: string }>;
  }>,
) {
  vi.mocked(opencodeClient.question.list).mockResolvedValueOnce({
    data: questions,
    error: undefined,
    request: new Request("http://test"),
    response: new Response(),
  } as never);
}

describe("question-poller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetQuestionPollerState();
  });

  afterEach(() => {
    stopQuestionPoller();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not call callback on initial snapshot", async () => {
    mockQuestionListResponse([
      {
        id: "q-existing",
        sessionID: "ses-1",
        questions: [{ id: "p1", text: "existing question" }],
      },
    ]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    // Wait for initial snapshot + polling setup
    await vi.advanceTimersByTimeAsync(2100);

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls callback when a new question is discovered", async () => {
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    // Wait for initial snapshot + polling setup
    await vi.advanceTimersByTimeAsync(2100);

    // Next poll: new question appears
    mockQuestionListResponse([
      {
        id: "q-new",
        sessionID: "ses-1",
        questions: [{ id: "p1", text: "What is the issue?" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]).toMatchObject([expect.any(Array), "q-new", "ses-1"]);
  });

  it("skips questions already seen via initial snapshot", async () => {
    // Initial snapshot: has a question
    mockQuestionListResponse([
      {
        id: "q-old",
        sessionID: "ses-1",
        questions: [{ id: "p1", text: "old question" }],
      },
    ]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    // Wait for initial snapshot + polling setup
    await vi.advanceTimersByTimeAsync(2100);

    // Next poll: same old question appears again
    mockQuestionListResponse([
      {
        id: "q-old",
        sessionID: "ses-1",
        questions: [{ id: "p1", text: "old question" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).not.toHaveBeenCalled();
  });

  it("skips questions already seen via markQuestionSeen", async () => {
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    await vi.advanceTimersByTimeAsync(2100);

    // Mark a question as seen manually (simulating SSE handler)
    markQuestionSeen("q-sse-shown");

    // Next poll: the SSE-shown question appears
    mockQuestionListResponse([
      {
        id: "q-sse-shown",
        sessionID: "ses-1",
        questions: [{ id: "p1", text: "shown by SSE" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).not.toHaveBeenCalled();
  });

  it("discovers questions from multiple sessions", async () => {
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    await vi.advanceTimersByTimeAsync(2100);

    // Poll 1: question from session A
    mockQuestionListResponse([
      {
        id: "q-ses-a",
        sessionID: "ses-a",
        questions: [{ id: "p1", text: "Session A question" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]).toMatchObject([expect.any(Array), "q-ses-a", "ses-a"]);

    // Poll 2: question from session B
    mockQuestionListResponse([
      {
        id: "q-ses-b",
        sessionID: "ses-b",
        questions: [{ id: "p2", text: "Session B question" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1]).toMatchObject([expect.any(Array), "q-ses-b", "ses-b"]);
  });

  it("passes correct sessionId for each question to callback", async () => {
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    await vi.advanceTimersByTimeAsync(2100);

    // Poll: question from a specific session
    mockQuestionListResponse([
      {
        id: "q-specific",
        sessionID: "ses-specific-xyz",
        questions: [{ id: "p1", text: "Question for specific session" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).toHaveBeenCalledTimes(1);
    const [, requestID, sessionId] = callback.mock.calls[0];
    expect(requestID).toBe("q-specific");
    expect(sessionId).toBe("ses-specific-xyz");
  });

  it("skips questions with empty questions array", async () => {
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    await vi.advanceTimersByTimeAsync(2100);

    // Poll: question with no actual questions
    mockQuestionListResponse([
      {
        id: "q-empty",
        sessionID: "ses-1",
        questions: [],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).not.toHaveBeenCalled();
  });

  it("stops polling on stopQuestionPoller", async () => {
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    await vi.advanceTimersByTimeAsync(2100);
    expect(callback).not.toHaveBeenCalled();

    stopQuestionPoller();

    // Next poll: should not fire since stopped
    mockQuestionListResponse([
      {
        id: "q-after-stop",
        sessionID: "ses-1",
        questions: [{ id: "p1", text: "Should not appear" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    expect(callback).not.toHaveBeenCalled();
  });

  it("resetQuestionPollerState clears seen set and stops polling", async () => {
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    const callback = vi.fn();
    startQuestionPoller("/test", callback);

    await vi.advanceTimersByTimeAsync(2100);

    // A question appears
    mockQuestionListResponse([
      {
        id: "q-before-reset",
        sessionID: "ses-1",
        questions: [{ id: "p1", text: "Before reset" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);
    expect(callback).toHaveBeenCalledTimes(1);

    // Reset state — clears seen set and stops timer
    resetQuestionPollerState();

    // Restart with a NEW question (q-after-reset)
    // Initial snapshot: empty
    mockQuestionListResponse([]);

    startQuestionPoller("/test", callback);
    await vi.advanceTimersByTimeAsync(2100);

    // Poll fires: q-after-reset appears (was blocked before reset)
    mockQuestionListResponse([
      {
        id: "q-after-reset",
        sessionID: "ses-1",
        questions: [{ id: "p2", text: "After reset" }],
      },
    ]);

    await vi.advanceTimersByTimeAsync(3100);

    // Should fire because reset cleared the seen set
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1]).toMatchObject([expect.any(Array), "q-after-reset", "ses-1"]);
  });
});
