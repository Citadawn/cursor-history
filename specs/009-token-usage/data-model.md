# Data Model: Token Usage Extraction

**Feature**: 009-token-usage
**Date**: 2026-02-01

## Entities

### TokenUsage (per-message)

Represents token consumption for a single message/bubble.

| Attribute | Type | Source Fields | Notes |
|-----------|------|---------------|-------|
| inputTokens | number \| undefined | `tokenCount.inputTokens`, `usage.input_tokens` | camelCase preferred, snake_case fallback |
| outputTokens | number \| undefined | `tokenCount.outputTokens`, `usage.output_tokens` | camelCase preferred, snake_case fallback |

**Extraction priority:**
1. `tokenCount.inputTokens` / `tokenCount.outputTokens` (primary, camelCase)
2. `usage.input_tokens` / `usage.output_tokens` (fallback, snake_case)
3. Omit if all sources are zero or missing

### ContextWindowStatus (per-message, user messages only)

Represents context window state when a message was created.

| Attribute | Type | Source Field | Notes |
|-----------|------|--------------|-------|
| tokensUsed | number | `contextWindowStatusAtCreation.tokensUsed` | |
| tokenLimit | number | `contextWindowStatusAtCreation.tokenLimit` | 176k, 200k, or 272k typically |
| percentageRemaining | number | `contextWindowStatusAtCreation.percentageRemaining` | Integer or float |

**Extraction rule:** Only present on user messages (bubble type 1). Omit entirely if `contextWindowStatusAtCreation` is missing.

### ModelInfo (per-message, assistant messages only)

Represents which AI model generated a response.

| Attribute | Type | Source Field | Notes |
|-----------|------|--------------|-------|
| name | string | `modelInfo.modelName` | e.g., "claude-4.5-opus-high-thinking" |

**Extraction rule:** Only present on assistant messages (bubble type 2). Omit if `modelInfo` is missing or empty.

### TimingInfo (per-message, assistant messages only)

Represents response latency.

| Attribute | Type | Source Field | Notes |
|-----------|------|--------------|-------|
| durationMs | number | Calculated: `clientEndTime - clientStartTime` | From `timingInfo` object |

**Extraction rule:** Only calculate if both `timingInfo.clientStartTime` and `timingInfo.clientEndTime` are present and valid. Omit otherwise.

### SessionUsage (per-session)

Aggregated token and context usage for an entire session.

| Attribute | Type | Source | Notes |
|-----------|------|--------|-------|
| contextTokensUsed | number \| undefined | `composerData.contextTokensUsed` | Running total |
| contextTokenLimit | number \| undefined | `composerData.contextTokenLimit` | Session context limit |
| contextUsagePercent | number \| undefined | `composerData.contextUsagePercent` | May be int or float |
| totalInputTokens | number \| undefined | Sum of all message `inputTokens` | Calculated |
| totalOutputTokens | number \| undefined | Sum of all message `outputTokens` | Calculated |

**Extraction rule:** Aggregate from composer data and message-level token counts. Omit individual fields if source data is missing.

## Database Field Mapping

### Source: bubbleId entries (`cursorDiskKV`)

```typescript
// Raw bubble structure (simplified relevant fields)
interface RawBubble {
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
  };
  promptDryRunInfo?: string; // Stringified JSON (ignored for now, client-side estimates)
}
```

### Source: composerData entries (`cursorDiskKV`)

```typescript
interface RawComposerData {
  contextTokensUsed?: number;
  contextTokenLimit?: number;
  contextUsagePercent?: number; // int or float
  usageData?: object; // Always empty {}, reserved for future
}
```

## Validation Rules

1. **Token counts must be non-negative:** If `inputTokens < 0` or `outputTokens < 0`, treat as missing.
2. **Zero means missing:** If `tokenCount.inputTokens === 0 && tokenCount.outputTokens === 0`, check fallback sources before omitting.
3. **Duration must be positive:** If `clientEndTime <= clientStartTime`, omit timing info.
4. **Percentage in valid range:** If `contextUsagePercent < 0 || contextUsagePercent > 100`, omit.

## State Transitions

N/A — This is read-only data extraction. No state changes.

## Data Volume Assumptions

Based on research:
- ~4,500 bubbles in a typical global storage database
- Only ~0.1% of bubbles have non-zero `tokenCount` (sparse population)
- `contextWindowStatusAtCreation` more reliably populated (~1-2% of bubbles)
- Session aggregates (`composerData`) available for most active sessions
