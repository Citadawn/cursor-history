# Feature Specification: Token Usage Extraction

**Feature Branch**: `009-token-usage`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "Add token usage extraction (input/output tokens, context window stats, model info, timing) to the CLI show command and library API, handling all known field name variations across Cursor versions."

## Clarifications

### Session 2026-02-01

- Q: Token display format in CLI output? → A: Compact badge style after content (e.g., `[claude-4.5-opus 131k→6k 2.3s]` appended after message)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Token Usage Per Message in CLI (Priority: P1)

As a Cursor user, I want to see how many input and output tokens each message consumed when viewing a session with `cursor-history show`, so I can understand my AI usage at a glance.

**Why this priority**: Token counts per message are the core value proposition. Without this, the feature has no reason to exist. Users want to know how much each interaction costs them.

**Independent Test**: Can be fully tested by running `show <index>` on a session with token data and verifying that token counts appear alongside messages. Delivers immediate visibility into per-message usage.

**Acceptance Scenarios**:

1. **Given** a session with messages that have non-zero `tokenCount` data, **When** the user runs `show <index>`, **Then** each message displays a compact badge appended after the message content with format `[model input→output duration]`.
2. **Given** a session where all messages have zero or missing token counts, **When** the user runs `show <index>`, **Then** token information is omitted (not shown as "0 / 0") to avoid clutter.
3. **Given** a session with a mix of populated and empty token data, **When** the user runs `show <index>`, **Then** only messages with actual token data display token counts.
4. **Given** a session with token data stored in snake_case format (`input_tokens`), **When** the user runs `show <index>`, **Then** token counts are displayed correctly regardless of naming convention.

---

### User Story 2 - View Model and Timing Info in CLI (Priority: P2)

As a Cursor user, I want to see which AI model was used for each response and how long it took, so I can correlate model choice with response quality and latency.

**Why this priority**: Model info and timing add context to token data. Knowing "Claude Opus used 131k input tokens in 3.2s" is far more useful than just "131k input tokens." However, this is secondary to the core token counts.

**Independent Test**: Can be fully tested by running `show <index>` on a session with model and timing data and verifying the model name and duration appear on assistant messages.

**Acceptance Scenarios**:

1. **Given** an assistant message with `modelInfo.modelName` populated, **When** the user runs `show <index>`, **Then** the model name is displayed on that message.
2. **Given** an assistant message with `timingInfo` populated, **When** the user runs `show <index>`, **Then** the response duration is calculated and displayed (e.g., "2.3s").
3. **Given** an assistant message with no model or timing info, **When** the user runs `show <index>`, **Then** those fields are simply omitted.

---

### User Story 3 - Session-Level Usage Summary in CLI (Priority: P2)

As a Cursor user, I want to see a summary of total token usage and context window consumption for an entire session, so I can quickly assess how "expensive" a conversation was.

**Why this priority**: A session-level summary provides the "big picture" without scrolling through individual messages. Combined with per-message data (P1), this gives complete visibility.

**Independent Test**: Can be fully tested by running `show <index>` on a session with context usage data and verifying a summary block appears at the bottom of the output (after all messages).

**Acceptance Scenarios**:

1. **Given** a session with `contextTokensUsed` and `contextTokenLimit` in composer data, **When** the user runs `show <index>`, **Then** a session summary shows total context tokens used, context limit, and usage percentage.
2. **Given** a session with individual message token counts, **When** the user runs `show <index>`, **Then** the summary includes the sum of all input tokens and output tokens across messages.
3. **Given** a session with no token or context data at all, **When** the user runs `show <index>`, **Then** no summary section is shown.

---

### User Story 4 - Access Token Usage via Library API (Priority: P3)

As a developer using the `cursor-history` library, I want to access token usage data programmatically when retrieving sessions, so I can build dashboards, reports, or cost analysis tools.

**Why this priority**: The library API serves developers who integrate cursor-history into other tools. It should expose the same data the CLI shows, but in structured form. This builds on the core extraction logic from P1/P2.

**Independent Test**: Can be fully tested by calling `getSession()` and verifying the returned `Message` objects include token usage fields. Delivers programmatic access to all token data.

**Acceptance Scenarios**:

1. **Given** a session retrieved via `getSession(index)`, **When** messages have token data, **Then** each `Message` object includes a `tokenUsage` field with `inputTokens` and `outputTokens`.
2. **Given** a session retrieved via `getSession(index)`, **When** messages have model info, **Then** each `Message` object includes a `model` field with the model name.
3. **Given** a session retrieved via `getSession(index)`, **When** messages have timing info, **Then** each `Message` object includes a `durationMs` field.
4. **Given** a session retrieved via `getSession(index)`, **When** the session has context usage data, **Then** the `Session` object includes `contextTokensUsed`, `contextTokenLimit`, and `contextUsagePercent`.

---

### User Story 5 - Token Usage in JSON Output (Priority: P3)

As a user or developer, I want token usage data included in JSON output (both CLI `--json` and library `exportToJson`), so I can pipe it into other tools or store it for analysis.

**Why this priority**: JSON export enables downstream processing. Since the data is already extracted for the CLI display, including it in JSON output is a natural extension.

**Independent Test**: Can be fully tested by running `show <index> --json` and verifying the JSON output includes token usage, model, and timing fields.

**Acceptance Scenarios**:

1. **Given** a session with token data, **When** the user runs `show <index> --json`, **Then** the JSON output includes `tokenUsage`, `model`, and `durationMs` fields on each message.
2. **Given** a session with context data, **When** the user runs `show <index> --json`, **Then** the JSON output includes session-level `contextTokensUsed`, `contextTokenLimit`, and `contextUsagePercent`.
3. **Given** messages with no token data, **When** JSON is exported, **Then** those fields are absent from the output (not included as null or zero).

---

### Edge Cases

- What happens when a bubble has token data in snake_case format (`input_tokens`) instead of camelCase (`inputTokens`)?
  - System normalizes both formats into the same output fields.
- What happens when `promptDryRunInfo` is a stringified JSON inside the bubble JSON?
  - System parses the double-encoded JSON correctly without errors.
- What happens when `contextUsagePercent` is an integer in some sessions and a float in others?
  - System handles both types and displays consistently (e.g., always rounded to one decimal place).
- What happens when `timingInfo` has partial data (e.g., `clientStartTime` present but `clientEndTime` missing)?
  - Duration is not calculated; timing info is omitted for that message.
- What happens when token data exists in `agentKv:blob:*` but not in `bubbleId:*`?
  - The current scope extracts from bubble and composer data only. Agent blob data is out of scope for this feature (it uses content hashes as keys, not composerId/bubbleId, making correlation unreliable).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract `tokenCount.inputTokens` and `tokenCount.outputTokens` from bubble data (camelCase format).
- **FR-002**: System MUST extract `usage.input_tokens` and `usage.output_tokens` from bubble data (snake_case format) as a fallback when camelCase fields are zero or absent.
- **FR-003**: System MUST extract `modelInfo.modelName` from assistant bubbles.
- **FR-004**: System MUST calculate response duration from `timingInfo.clientStartTime` and `timingInfo.clientEndTime` when both are present.
- **FR-005**: System MUST extract session-level `contextTokensUsed`, `contextTokenLimit`, and `contextUsagePercent` from composer data.
- **FR-006**: System MUST parse `promptDryRunInfo` (double-encoded JSON string) to extract `fullConversationTokenCount.numTokens` and `userMessageTokenCount.numTokens` as supplementary data.
- **FR-007**: System MUST omit token usage display for messages with no token data (zero or absent values) rather than showing zeros.
- **FR-008**: System MUST display token usage as a compact badge appended after message content in CLI `show` output when data is available. Format: `[model-name input→output duration]` (e.g., `[claude-4.5-opus 131k→6k 2.3s]`).
- **FR-009**: System MUST display a session-level usage summary when context data is available.
- **FR-010**: System MUST include token usage, model, timing, and context data in JSON output (`--json` flag and library export).
- **FR-011**: System MUST expose token usage data through the library API on `Message` and `Session` types.
- **FR-012**: System MUST handle both integer and floating-point values for `contextUsagePercent`.

### Key Entities

- **TokenUsage**: Represents per-message token consumption. Attributes: input token count, output token count. May originate from multiple source fields with different naming conventions.
- **ContextWindowStatus**: Represents context window state at message creation. Attributes: tokens used, token limit, percentage remaining.
- **ModelInfo**: Represents which AI model generated a response. Attributes: model name.
- **TimingInfo**: Represents response latency. Attributes: start time, end time, calculated duration.
- **SessionUsageSummary**: Aggregated token and context usage for an entire session. Attributes: total input tokens, total output tokens, context tokens used, context limit, context usage percentage.

## Assumptions

- Token data in `agentKv:blob:*` entries is out of scope because those entries use content hashes as keys (not composerId/bubbleId), making it unreliable to correlate with specific messages.
- The `usageData` field on composer data (currently always empty `{}`) is ignored for now but the system should not break if it becomes populated in future Cursor versions.
- `promptDryRunInfo` token counts are client-side estimates, not server-reported actuals. They are treated as supplementary/fallback data, clearly labeled when displayed.
- Timing calculations use `clientStartTime` and `clientEndTime` from `timingInfo`. These are client-side measurements.
- The feature does not attempt to calculate monetary costs from token counts, as pricing varies by model and plan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see input and output token counts on messages that have this data when viewing any session.
- **SC-002**: Users can see the AI model name on assistant messages that have this data.
- **SC-003**: Users can see response duration on assistant messages that have timing data.
- **SC-004**: Users can see a session-level usage summary (total tokens, context window utilization) when viewing a session with context data.
- **SC-005**: All token data is accessible through the library API with the same completeness as the CLI output.
- **SC-006**: Token extraction correctly handles both camelCase (`inputTokens`) and snake_case (`input_tokens`) field naming conventions without user intervention.
- **SC-007**: JSON output includes all token, model, timing, and context data for downstream processing.
- **SC-008**: No visual clutter — messages without token data display exactly as they did before this feature.
