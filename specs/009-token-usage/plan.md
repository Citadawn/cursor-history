# Implementation Plan: Token Usage Extraction

**Branch**: `009-token-usage` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-token-usage/spec.md`

## Summary

Extract and display token usage data (input/output tokens, context window stats, model info, timing) from Cursor's local SQLite database. Add per-message badges and session-level summaries to the CLI `show` command, expose structured data through the library API, and include in JSON output. Must handle two naming conventions (camelCase and snake_case) across Cursor versions.

## Technical Context

**Language/Version**: TypeScript 5.0+ (strict mode enabled)
**Primary Dependencies**: better-sqlite3 or node:sqlite (existing), picocolors (existing CLI formatting)
**Storage**: SQLite (read-only access to existing `state.vscdb` files)
**Testing**: Vitest (existing test framework)
**Target Platform**: Node.js 20 LTS, cross-platform (macOS, Windows, Linux)
**Project Type**: Single project (CLI + library)
**Performance Goals**: No degradation to current `show` command speed
**Constraints**: Read-only database access; no new external dependencies
**Scale/Scope**: Handles sessions with thousands of messages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ Pass | Extends existing extraction logic; no new abstractions needed |
| II. CLI-Native Design | ✅ Pass | Badge format follows existing output patterns; `--json` support maintained |
| III. Documentation-Driven | ✅ Pass | Research already complete; types will be self-documenting |
| IV. Incremental Delivery | ✅ Pass | User stories prioritized; P1 can be delivered independently |
| V. Defensive Parsing | ✅ Pass | Handles missing/zero data gracefully; dual naming convention support |

**All gates pass. No violations to justify.**

## Project Structure

### Documentation (this feature)

```text
specs/009-token-usage/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Database field analysis (complete)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── types.ts          # Add TokenUsage, SessionUsage interfaces
│   └── storage.ts        # Add extractTokenUsage(), extractSessionUsage()
├── cli/
│   └── formatters/
│       └── table.ts      # Add formatUsageBadge(), formatSessionSummary()
└── lib/
    ├── types.ts          # Add TokenUsage, SessionUsage to public types
    └── index.ts          # Expose token data in getSession() return

tests/
├── unit/
│   └── token-usage.test.ts  # New: extraction logic tests
└── fixtures/
    └── token-usage/         # New: test bubble data with various formats
```

**Structure Decision**: Single project pattern. Token extraction logic lives in `src/core/storage.ts` alongside existing bubble extraction. Display formatting in `src/cli/formatters/table.ts`. Library types extend existing interfaces.
