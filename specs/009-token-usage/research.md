# Token Usage in Cursor Local Storage — Research

## Overview

This document captures findings from exploring Cursor's local SQLite databases (`state.vscdb`) to determine what token usage data is stored locally and in what formats.

**Date:** 2026-02-01
**Database location:** `~/Library/Application Support/Cursor/User/`
**Database examined:** `globalStorage/state.vscdb` (6,927 entries in `cursorDiskKV`, 4,592 bubble entries)

## Summary

Cursor stores token usage data locally but **only basic input/output counts** — not the extended breakdown available from LLM APIs (cached tokens, reasoning tokens). The data is stored in **multiple locations** with **inconsistent naming conventions** (camelCase vs snake_case) and is **mostly unpopulated** (4,587 out of 4,592 bubbles have zero token counts).

## Token Fields Found

### 1. Per-Message: `tokenCount` (in bubble data)

**Location:** `cursorDiskKV` table, keys matching `bubbleId:<composerId>:<bubbleId>`

```json
{
  "tokenCount": {
    "inputTokens": 131373,
    "outputTokens": 6493
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `tokenCount.inputTokens` | number (camelCase) | Total input tokens for the request |
| `tokenCount.outputTokens` | number (camelCase) | Total output tokens for the response |

**Population rate:** Only 5 out of 4,592 bubbles have non-zero values. The rest are `{"inputTokens": 0, "outputTokens": 0}`.

**Non-zero examples found:**

| inputTokens | outputTokens |
|-------------|-------------|
| 131,373 | 6,493 |
| 23,022 | 2,801 |
| 19,097 | 4,827 |
| 17,945 | 1,079 |

### 2. Per-Message: `contextWindowStatusAtCreation` (in bubble data)

**Location:** Same bubble entries, present on user messages (type 1).

```json
{
  "contextWindowStatusAtCreation": {
    "percentageRemaining": 80,
    "percentageRemainingFloat": 80.67867279052734,
    "tokensUsed": 52554,
    "tokenLimit": 272000
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `contextWindowStatusAtCreation.tokensUsed` | number | Context window tokens consumed at message creation |
| `contextWindowStatusAtCreation.tokenLimit` | number | Context window limit (values seen: 176,000 / 200,000 / 272,000) |
| `contextWindowStatusAtCreation.percentageRemaining` | integer | Rounded percentage |
| `contextWindowStatusAtCreation.percentageRemainingFloat` | float | Precise percentage |

**Population rate:** Present on ~60 user-type bubbles. More consistently populated than `tokenCount`.

### 3. Per-Message: `promptDryRunInfo` (in bubble data)

**Location:** Same bubble entries, stored as a **stringified JSON** inside the bubble JSON. Present on user messages.

```json
{
  "promptDryRunInfo": "{\"userMessageTokenLimit\":89760,\"userMessageTokenCount\":{\"numTokens\":488},\"fullConversationTokenCount\":{\"numTokens\":17862},\"barFraction\":0.005,\"codeChunksV2\":[...]}"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `userMessageTokenCount.numTokens` | number | Pre-send estimate of user message tokens |
| `userMessageTokenLimit` | number | Maximum allowed user message tokens |
| `fullConversationTokenCount.numTokens` | number | Full conversation token count at send time |
| `barFraction` | float | Fraction of context window used |
| `codeChunksV2[].detailText` | string (number) | Per-chunk token count as string |

**Note:** This is a **client-side estimate** computed before sending, not the actual server-reported usage.

### 4. Per-Session: Composer-level fields (in composerData)

**Location:** `cursorDiskKV` table, keys matching `composerData:<composerId>`

```json
{
  "contextTokensUsed": 111068,
  "contextTokenLimit": 272000,
  "contextUsagePercent": 55,
  "usageData": {}
}
```

| Field | Type | Notes |
|-------|------|-------|
| `contextTokensUsed` | number | Running total of context tokens used in session |
| `contextTokenLimit` | number | Context window limit for the session |
| `contextUsagePercent` | number | Both integer and float values observed |
| `usageData` | object | **Always empty `{}`** in all examined data |

**Note:** `contextUsagePercent` has two variants — sometimes an integer (e.g., `55`), sometimes a float (e.g., `57.731998443603516`). Code should handle both.

### 5. Alternative Format: `usage` (in agentKv blobs)

**Location:** `cursorDiskKV` table, keys matching `agentKv:blob:<hash>`

```json
{
  "usage": {
    "input_tokens": 2,
    "output_tokens": 3
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `usage.input_tokens` | number (**snake_case**) | Input tokens |
| `usage.output_tokens` | number (**snake_case**) | Output tokens |

**Population rate:** Only 2 entries found. This appears to be stored by Cursor's agent system with a different naming convention than bubble data.

### 6. Other Token-Related Fields

**In `ItemTable`:**

| Field | Value | Notes |
|-------|-------|-------|
| `tokenUsageThresholdPercentage` | 70 | Likely a settings threshold |
| `fullContextTokenLimit` | 30000 | Possibly a tab/autocomplete context limit |

## Model Information

Each bubble also stores which model was used:

```json
{
  "modelInfo": {
    "modelName": "claude-4.5-opus-high-thinking"
  }
}
```

**Models observed:**

| Model | Count |
|-------|-------|
| `claude-4.5-opus-high-thinking` | 205 |
| `composer-1` | 14 |
| `gpt-5-codex` | 11 |
| `gpt-5.2` | 10 |
| `gpt-5.2-codex-xhigh` | 6 |

## Timing Information

Present on assistant bubbles:

```json
{
  "timingInfo": {
    "clientStartTime": 654927,
    "clientRpcSendTime": 1756201887204,
    "clientSettleTime": 1756201888091,
    "clientEndTime": 1756201888091
  }
}
```

Also for thinking-capable models:

```json
{
  "thinkingDurationMs": 5432
}
```

## Related Fields

Other per-message fields that may be relevant for usage analysis:

| Field | Notes |
|-------|-------|
| `usageUuid` | Links to server-side usage record |
| `requestId` | Server request identifier |
| `serverBubbleId` | Server-side bubble identifier |
| `modelCallId` | Individual model API call identifier |
| `isRefunded` | Boolean, whether the request was refunded |
| `capabilityType` | Number (e.g., 30), unclear mapping |

## Fields That Do NOT Exist

The following fields from standard LLM API responses are **not stored** anywhere in Cursor's local databases:

- `cache_read_input_tokens` / `cacheReadInputTokens`
- `cache_creation_input_tokens` / `cacheCreationInputTokens`
- `output_reasoning_tokens` / `outputReasoningTokens` / `reasoningTokens`
- Any cost/pricing data
- Accumulated usage totals per session

## Naming Convention Inconsistencies

Cursor uses **two naming conventions** for token fields depending on where the data is stored:

| Location | Convention | Example |
|----------|-----------|---------|
| `bubbleId:*` | camelCase | `inputTokens`, `outputTokens` |
| `composerData:*` | camelCase | `contextTokensUsed`, `contextTokenLimit` |
| `agentKv:blob:*` | snake_case | `input_tokens`, `output_tokens` |
| `promptDryRunInfo` (stringified) | camelCase | `numTokens`, `userMessageTokenLimit` |

## Data Quality Issues

1. **Sparse population:** 99.9% of bubbles have zero token counts in `tokenCount`
2. **Inconsistent naming:** camelCase vs snake_case across storage locations
3. **Nested stringified JSON:** `promptDryRunInfo` is a JSON string inside a JSON object
4. **`usageData` always empty:** The field exists but is never populated
5. **`contextUsagePercent` type instability:** Sometimes integer, sometimes float
6. **No guaranteed correlation:** `tokenCount` zeros don't mean no tokens were used — likely means Cursor didn't record server-reported usage

## Recommendations for Implementation

If extracting token usage for `cursor-history`:

1. **Check multiple locations** for token data: `tokenCount`, `contextWindowStatusAtCreation`, `promptDryRunInfo`, and `usage` (snake_case)
2. **Handle both naming conventions**: `inputTokens` (camelCase) and `input_tokens` (snake_case)
3. **Parse `promptDryRunInfo`** as double-encoded JSON (string within JSON)
4. **Don't rely on `tokenCount`** being populated — fall back to `contextWindowStatusAtCreation.tokensUsed` or `promptDryRunInfo.fullConversationTokenCount` as approximations
5. **Store `modelInfo.modelName`** alongside token data for meaningful usage analysis
6. **Include `timingInfo`** for latency analysis
7. **Watch for future Cursor versions** potentially adding extended usage fields (`usageData` is already present but empty — may be populated in future versions)

## Database Schema Reference

Both `globalStorage/state.vscdb` and `workspaceStorage/*/state.vscdb` share the same schema:

```sql
CREATE TABLE ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB);
CREATE TABLE cursorDiskKV (key TEXT NOT NULL UNIQUE ON CONFLICT REPLACE, value BLOB);
```

**Key patterns in `cursorDiskKV`:**

| Pattern | Content | Count |
|---------|---------|-------|
| `bubbleId:<composerId>:<bubbleId>` | Individual messages with token data | 4,592 |
| `composerData:<composerId>` | Session metadata with context usage | ~57 |
| `messageRequestContext:<composerId>:<bubbleId>` | Request context (no token data) | ~4,000 |
| `agentKv:blob:<hash>` | Agent data, sometimes with `usage` field | ~1,000 |
