/**
 * Shared tracker for assistant message IDs already forwarded to chat.
 *
 * Used to coordinate the SSE-based aggregator and the REST-based message
 * poller so that a completed assistant reply is never sent twice.
 */

const processedMessageIds = new Set<string>();

export function markMessageProcessed(messageId: string): void {
  processedMessageIds.add(messageId);
}

export function isMessageProcessed(messageId: string): boolean {
  return processedMessageIds.has(messageId);
}

export function clearProcessedMessages(): void {
  processedMessageIds.clear();
}
