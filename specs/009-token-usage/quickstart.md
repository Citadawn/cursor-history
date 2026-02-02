# Quickstart: Token Usage Extraction

**Feature**: 009-token-usage
**Date**: 2026-02-01

## Overview

This feature adds token usage visibility to the `cursor-history` CLI and library. After implementation, users can see:
- Per-message token counts, model name, and response duration
- Session-level usage summary (context window utilization)
- Structured token data in JSON output and library API

## Usage Examples

### CLI: View session with token usage

```bash
# View session with token badges on messages
cursor-history show 1

# Output includes badges after messages:
# Assistant: 02:48 PM
# Here's the refactored code...
# [claude-4.5-opus 131k→6k 2.3s]
```

### CLI: JSON output with token data

```bash
cursor-history show 1 --json | jq '.messages[0].tokenUsage'
# { "inputTokens": 131373, "outputTokens": 6493 }

cursor-history show 1 --json | jq '.usage'
# { "contextTokensUsed": 111068, "contextTokenLimit": 272000, "contextUsagePercent": 41 }
```

### Library API

```typescript
import { getSession } from 'cursor-history';

const session = await getSession(0);

// Per-message token usage
for (const msg of session.messages) {
  if (msg.tokenUsage) {
    console.log(`${msg.role}: ${msg.tokenUsage.inputTokens} in / ${msg.tokenUsage.outputTokens} out`);
  }
  if (msg.model) {
    console.log(`  Model: ${msg.model}`);
  }
  if (msg.durationMs) {
    console.log(`  Duration: ${msg.durationMs}ms`);
  }
}

// Session-level summary
if (session.usage) {
  console.log(`Context: ${session.usage.contextTokensUsed} / ${session.usage.contextTokenLimit}`);
  console.log(`Total: ${session.usage.totalInputTokens} in / ${session.usage.totalOutputTokens} out`);
}
```

## Implementation Checklist

### Phase 1: Core Types & Extraction

- [ ] Add `TokenUsage`, `SessionUsage` interfaces to `src/core/types.ts`
- [ ] Implement `extractTokenUsage()` in `src/core/storage.ts`
- [ ] Implement `extractModelInfo()` in `src/core/storage.ts`
- [ ] Implement `extractTimingInfo()` in `src/core/storage.ts`
- [ ] Implement `extractSessionUsage()` in `src/core/storage.ts`
- [ ] Add token fields to `Message` interface
- [ ] Add usage field to `ChatSession` interface

### Phase 2: CLI Display

- [ ] Implement `formatTokenCount()` in `src/cli/formatters/table.ts`
- [ ] Implement `formatDuration()` in `src/cli/formatters/table.ts`
- [ ] Implement `formatUsageBadge()` in `src/cli/formatters/table.ts`
- [ ] Implement `formatSessionSummary()` in `src/cli/formatters/table.ts`
- [ ] Update `formatSessionDetail()` to render badges
- [ ] Update `show` command to render session summary

### Phase 3: Library API & JSON

- [ ] Add `TokenUsage`, `SessionUsage` to `src/lib/types.ts`
- [ ] Update `getSession()` return type with usage fields
- [ ] Update JSON output in `show` command
- [ ] Update `exportToJson()` to include usage data

### Phase 4: Testing

- [ ] Create test fixtures with various token data formats
- [ ] Test camelCase extraction (`tokenCount.inputTokens`)
- [ ] Test snake_case fallback (`usage.input_tokens`)
- [ ] Test zero/missing data handling
- [ ] Test badge formatting edge cases
- [ ] Test session summary aggregation

## Key Files

| File | Changes |
|------|---------|
| `src/core/types.ts` | Add `TokenUsage`, `SessionUsage`, extend `Message`, `ChatSession` |
| `src/core/storage.ts` | Add extraction functions, update `getSession()` |
| `src/cli/formatters/table.ts` | Add formatting functions, update display |
| `src/cli/commands/show.ts` | Render session summary |
| `src/lib/types.ts` | Export new types for library consumers |
| `src/lib/index.ts` | Expose usage data in API |
| `tests/unit/token-usage.test.ts` | New test file |

## Research Reference

See [research.md](./research.md) for:
- Complete list of database fields and their locations
- Naming convention variations (camelCase vs snake_case)
- Population rates and data quality notes
- Raw JSON examples from actual Cursor databases
