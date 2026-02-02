/**
 * Token Usage Extraction Contract
 * Feature: 009-token-usage
 *
 * Function signatures for extracting token usage from raw bubble/composer data.
 * To be implemented in src/core/storage.ts.
 */

import type {
  TokenUsage,
  ContextWindowStatus,
  ModelInfo,
  TimingInfo,
  SessionUsage,
} from './types';

// ============================================================================
// Raw Data Interfaces (internal, not exported from library)
// ============================================================================

/**
 * Raw bubble data structure with token-related fields.
 * Matches Cursor's database format.
 */
interface RawBubbleData {
  tokenCount?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  modelInfo?: {
    modelName?: string;
  };
  timingInfo?: {
    clientStartTime?: number;
    clientEndTime?: number;
  };
  contextWindowStatusAtCreation?: {
    tokensUsed?: number;
    tokenLimit?: number;
    percentageRemaining?: number;
    percentageRemainingFloat?: number;
  };
}

/**
 * Raw composer data structure with session-level token fields.
 */
interface RawComposerData {
  contextTokensUsed?: number;
  contextTokenLimit?: number;
  contextUsagePercent?: number;
}

// ============================================================================
// Extraction Functions (to implement in src/core/storage.ts)
// ============================================================================

/**
 * Extract token usage from a raw bubble.
 * Handles both camelCase (tokenCount) and snake_case (usage) formats.
 *
 * @param data - Raw bubble data object
 * @returns TokenUsage if valid non-zero data exists, undefined otherwise
 */
export function extractTokenUsage(data: RawBubbleData): TokenUsage | undefined {
  // Implementation:
  // 1. Check tokenCount.inputTokens/outputTokens (camelCase primary)
  // 2. Fallback to usage.input_tokens/output_tokens (snake_case)
  // 3. Return undefined if both are zero or missing
  throw new Error('Not implemented');
}

/**
 * Extract model info from a raw bubble.
 *
 * @param data - Raw bubble data object
 * @returns Model name string if present, undefined otherwise
 */
export function extractModelInfo(data: RawBubbleData): string | undefined {
  // Implementation:
  // 1. Check modelInfo.modelName
  // 2. Return undefined if missing or empty string
  throw new Error('Not implemented');
}

/**
 * Extract timing info and calculate duration from a raw bubble.
 *
 * @param data - Raw bubble data object
 * @returns Duration in milliseconds if both start/end times exist, undefined otherwise
 */
export function extractTimingInfo(data: RawBubbleData): number | undefined {
  // Implementation:
  // 1. Check timingInfo.clientStartTime and clientEndTime exist
  // 2. Calculate: endTime - startTime
  // 3. Return undefined if result <= 0 or data missing
  throw new Error('Not implemented');
}

/**
 * Extract context window status from a raw bubble.
 * Only applicable to user messages (type 1).
 *
 * @param data - Raw bubble data object
 * @returns ContextWindowStatus if data exists, undefined otherwise
 */
export function extractContextWindowStatus(
  data: RawBubbleData
): ContextWindowStatus | undefined {
  // Implementation:
  // 1. Check contextWindowStatusAtCreation exists
  // 2. Extract tokensUsed, tokenLimit, percentageRemaining
  // 3. Prefer percentageRemainingFloat if available, else use percentageRemaining
  // 4. Return undefined if any required field is missing
  throw new Error('Not implemented');
}

/**
 * Extract session-level usage summary from composer data.
 *
 * @param composerData - Raw composer data object
 * @param messages - Array of messages with token usage (for aggregation)
 * @returns SessionUsage with available fields populated
 */
export function extractSessionUsage(
  composerData: RawComposerData | undefined,
  messages: Array<{ tokenUsage?: TokenUsage }>
): SessionUsage | undefined {
  // Implementation:
  // 1. Extract contextTokensUsed, contextTokenLimit, contextUsagePercent from composerData
  // 2. Sum totalInputTokens from all messages with tokenUsage
  // 3. Sum totalOutputTokens from all messages with tokenUsage
  // 4. Return undefined if no data available at all
  // 5. Return partial SessionUsage if some fields available
  throw new Error('Not implemented');
}

// ============================================================================
// Formatting Functions (to implement in src/cli/formatters/table.ts)
// ============================================================================

/**
 * Format token count for display (e.g., 131373 -> "131k").
 *
 * @param tokens - Raw token count
 * @returns Formatted string
 */
export function formatTokenCount(tokens: number): string {
  // Implementation:
  // - < 1000: show as-is (e.g., "500")
  // - >= 1000: show with k suffix (e.g., "131k", "1.5k")
  // - >= 1000000: show with M suffix (e.g., "1.2M")
  throw new Error('Not implemented');
}

/**
 * Format duration in milliseconds for display.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2.3s", "150ms")
 */
export function formatDuration(ms: number): string {
  // Implementation:
  // - < 1000: show as ms (e.g., "150ms")
  // - >= 1000: show as seconds with 1 decimal (e.g., "2.3s")
  // - >= 60000: show as minutes (e.g., "1.5m")
  throw new Error('Not implemented');
}

/**
 * Format usage badge for CLI output.
 * Format: [model input→output duration]
 *
 * @param model - Model name (optional)
 * @param tokenUsage - Token usage data (optional)
 * @param durationMs - Duration in ms (optional)
 * @returns Formatted badge string, or empty string if no data
 */
export function formatUsageBadge(
  model?: string,
  tokenUsage?: TokenUsage,
  durationMs?: number
): string {
  // Implementation:
  // 1. Collect non-empty parts: model, "input→output", duration
  // 2. Join with space
  // 3. Wrap in brackets: [parts]
  // 4. Return empty string if no parts
  // 5. Apply dim color styling (picocolors)
  throw new Error('Not implemented');
}

/**
 * Format session usage summary for CLI output.
 *
 * @param usage - Session usage data
 * @returns Formatted multi-line summary string, or empty string if no data
 */
export function formatSessionSummary(usage: SessionUsage): string {
  // Implementation:
  // Example output:
  // ┌─ Session Usage ─────────────────────┐
  // │ Context: 111k / 272k (41%)          │
  // │ Total tokens: 150k in / 25k out     │
  // └─────────────────────────────────────┘
  throw new Error('Not implemented');
}
