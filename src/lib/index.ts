/**
 * cursor-history Library API
 *
 * IMPORTANT: This is a library interface for direct import and use in TypeScript/JavaScript
 * projects, NOT a network/REST API. Functions are imported directly:
 * `import { listSessions, getSession, searchSessions } from 'cursor-history'`
 */

// Export all public types
export type {
  Session,
  Message,
  ToolCall,
  SearchResult,
  LibraryConfig,
  PaginatedResult,
} from './types.js';

// Export error classes (will be created in Phase 2)
export {
  DatabaseLockedError,
  DatabaseNotFoundError,
  InvalidConfigError,
  isDatabaseLockedError,
  isDatabaseNotFoundError,
  isInvalidConfigError,
} from './errors.js';

// Export utility functions
export { getDefaultDataPath } from './utils.js';

// API Functions (to be implemented in Phase 3+)
import type { LibraryConfig, PaginatedResult, Session, SearchResult } from './types.js';
import { mergeWithDefaults } from './config.js';
import { DatabaseLockedError, DatabaseNotFoundError } from './errors.js';
import * as storage from '../core/storage.js';
import type { ChatSession as CoreSession } from '../core/types.js';

/**
 * Convert core ChatSession to library Session
 */
function convertToLibrarySession(coreSession: CoreSession): Session {
  return {
    id: coreSession.id,
    workspace: coreSession.workspacePath ?? 'unknown',
    timestamp: coreSession.createdAt.toISOString(),
    messages: coreSession.messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      // Note: Tool calls, thinking, and metadata are not currently captured
      // in the core storage layer. These fields will be added in future enhancements.
    })),
    messageCount: coreSession.messageCount,
    metadata: {
      lastModified: coreSession.lastUpdatedAt.toISOString(),
    },
  };
}

/**
 * List all chat sessions, optionally filtered and paginated.
 *
 * @param config - Optional configuration (dataPath, workspace filter, pagination)
 * @returns Paginated result with sessions and metadata
 * @throws {DatabaseLockedError} If database is locked by Cursor
 * @throws {DatabaseNotFoundError} If database path does not exist
 * @throws {InvalidConfigError} If config parameters are invalid
 *
 * @example
 * // List all sessions
 * const result = listSessions();
 * console.log(result.data); // Session[]
 *
 * @example
 * // List sessions with pagination
 * const page1 = listSessions({ limit: 10, offset: 0 });
 * const page2 = listSessions({ limit: 10, offset: 10 });
 *
 * @example
 * // List sessions for specific workspace
 * const result = listSessions({ workspace: '/path/to/project' });
 */
export function listSessions(config?: LibraryConfig): PaginatedResult<Session> {
  try {
    const resolved = mergeWithDefaults(config);

    // Get all sessions using core storage layer
    const coreSessions = storage.listSessions(
      {
        limit: -1, // Get all, we'll paginate ourselves
        all: true,
        workspacePath: resolved.workspace,
      },
      resolved.dataPath
    );

    // Total count before pagination
    const total = coreSessions.length;

    // Apply offset and limit
    const start = resolved.offset;
    const end = Math.min(start + resolved.limit, total);
    const paginatedSessions = coreSessions.slice(start, end);

    // Convert to library Session format
    // We need full sessions, not summaries, so we'll fetch each one
    const sessions: Session[] = paginatedSessions.map((summary) => {
      const fullSession = storage.getSession(summary.index, resolved.dataPath);
      if (!fullSession) {
        throw new DatabaseNotFoundError(`Session ${summary.index} not found`);
      }
      return convertToLibrarySession(fullSession);
    });

    return {
      data: sessions,
      pagination: {
        total,
        limit: resolved.limit,
        offset: resolved.offset,
        hasMore: end < total,
      },
    };
  } catch (err) {
    // Check for SQLite BUSY error (database locked)
    if (err instanceof Error && err.message.includes('SQLITE_BUSY')) {
      throw new DatabaseLockedError(config?.dataPath ?? 'default path');
    }
    // Check for file not found errors
    if (err instanceof Error && (err.message.includes('ENOENT') || err.message.includes('no such file'))) {
      throw new DatabaseNotFoundError(config?.dataPath ?? 'default path');
    }
    // Re-throw library errors as-is
    if (err instanceof DatabaseLockedError || err instanceof DatabaseNotFoundError) {
      throw err;
    }
    // Wrap other errors
    throw new Error(`Failed to list sessions: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Get a specific session by index.
 *
 * @param index - Zero-based session index (from listSessions result)
 * @param config - Optional configuration (dataPath)
 * @returns Complete session with all messages
 * @throws {DatabaseLockedError} If database is locked by Cursor
 * @throws {DatabaseNotFoundError} If database path does not exist
 * @throws {InvalidConfigError} If index is out of bounds
 *
 * @example
 * const session = getSession(0);
 * console.log(session.messages); // Message[]
 *
 * @example
 * // Get session from custom data path
 * const session = getSession(5, { dataPath: '/custom/cursor/data' });
 */
export function getSession(index: number, config?: LibraryConfig): Session {
  try {
    const resolved = mergeWithDefaults(config);

    // Core storage uses 1-based indexing, so we add 1
    const coreIndex = index + 1;

    const coreSession = storage.getSession(coreIndex, resolved.dataPath);
    if (!coreSession) {
      throw new DatabaseNotFoundError(`Session at index ${index} not found`);
    }

    return convertToLibrarySession(coreSession);
  } catch (err) {
    // Check for SQLite BUSY error (database locked)
    if (err instanceof Error && err.message.includes('SQLITE_BUSY')) {
      throw new DatabaseLockedError(config?.dataPath ?? 'default path');
    }
    // Check for file not found errors
    if (err instanceof Error && (err.message.includes('ENOENT') || err.message.includes('no such file'))) {
      throw new DatabaseNotFoundError(config?.dataPath ?? 'default path');
    }
    // Re-throw library errors as-is
    if (err instanceof DatabaseLockedError || err instanceof DatabaseNotFoundError) {
      throw err;
    }
    // Wrap other errors
    throw new Error(`Failed to get session: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Search across all sessions for matching content.
 *
 * @param query - Search query string (case-insensitive substring match)
 * @param config - Optional configuration (dataPath, workspace filter, context lines)
 * @returns Array of search results with context
 * @throws {DatabaseLockedError} If database is locked by Cursor
 * @throws {DatabaseNotFoundError} If database path does not exist
 *
 * @example
 * // Basic search
 * const results = searchSessions('authentication');
 *
 * @example
 * // Search with context lines
 * const results = searchSessions('error', { context: 2 });
 * results.forEach(r => {
 *   console.log(r.contextBefore); // 2 lines before match
 *   console.log(r.match);          // matched line
 *   console.log(r.contextAfter);   // 2 lines after match
 * });
 *
 * @example
 * // Search within specific workspace
 * const results = searchSessions('bug', { workspace: '/path/to/project' });
 */
export function searchSessions(_query: string, _config?: LibraryConfig): SearchResult[] {
  // Implementation in Phase 5 (T032)
  throw new Error('Not implemented yet');
}

/**
 * Export a session to JSON format.
 *
 * @param index - Zero-based session index (from listSessions result)
 * @param config - Optional configuration (dataPath)
 * @returns JSON string representation of session
 * @throws {DatabaseLockedError} If database is locked by Cursor
 * @throws {DatabaseNotFoundError} If database path does not exist
 * @throws {InvalidConfigError} If index is out of bounds
 *
 * @example
 * const json = exportSessionToJson(0);
 * fs.writeFileSync('session.json', json);
 */
export function exportSessionToJson(_index: number, _config?: LibraryConfig): string {
  // Implementation in Phase 6 (T040)
  throw new Error('Not implemented yet');
}

/**
 * Export a session to Markdown format.
 *
 * @param index - Zero-based session index (from listSessions result)
 * @param config - Optional configuration (dataPath)
 * @returns Markdown formatted string
 * @throws {DatabaseLockedError} If database is locked by Cursor
 * @throws {DatabaseNotFoundError} If database path does not exist
 * @throws {InvalidConfigError} If index is out of bounds
 *
 * @example
 * const markdown = exportSessionToMarkdown(0);
 * fs.writeFileSync('session.md', markdown);
 */
export function exportSessionToMarkdown(_index: number, _config?: LibraryConfig): string {
  // Implementation in Phase 6 (T041)
  throw new Error('Not implemented yet');
}

/**
 * Export all sessions to JSON format.
 *
 * @param config - Optional configuration (dataPath, workspace filter)
 * @returns JSON string with array of all sessions
 * @throws {DatabaseLockedError} If database is locked by Cursor
 * @throws {DatabaseNotFoundError} If database path does not exist
 *
 * @example
 * const json = exportAllSessionsToJson();
 * fs.writeFileSync('all-sessions.json', json);
 *
 * @example
 * // Export sessions from specific workspace
 * const json = exportAllSessionsToJson({ workspace: '/path/to/project' });
 */
export function exportAllSessionsToJson(_config?: LibraryConfig): string {
  // Implementation in Phase 6 (T042)
  throw new Error('Not implemented yet');
}

/**
 * Export all sessions to Markdown format.
 *
 * @param config - Optional configuration (dataPath, workspace filter)
 * @returns Markdown formatted string with all sessions
 * @throws {DatabaseLockedError} If database is locked by Cursor
 * @throws {DatabaseNotFoundError} If database path does not exist
 *
 * @example
 * const markdown = exportAllSessionsToMarkdown();
 * fs.writeFileSync('all-sessions.md', markdown);
 */
export function exportAllSessionsToMarkdown(_config?: LibraryConfig): string {
  // Implementation in Phase 6 (T043)
  throw new Error('Not implemented yet');
}
