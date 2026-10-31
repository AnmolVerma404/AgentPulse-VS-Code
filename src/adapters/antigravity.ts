import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedEvent, ToolCallPayload } from './types';

export interface AntigravityAdapterOptions {
  brainPath?: string;
  transcriptPath?: string;
  pollIntervalMs?: number;
}

/**
 * Strips XML wrapping tags from raw Antigravity user input records.
 */
export function extractCleanUserRequest(rawContent: string): string {
  if (!rawContent) return '';
  const match = rawContent.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Strip additional metadata tags if present
  return rawContent
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '')
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, '')
    .trim();
}

/**
 * Observes and streams live Google Antigravity session transcripts.
 */
export class AntigravityAdapter {
  private transcriptPath: string | null = null;
  private currentOffset = 0;
  private remainderBuffer = '';
  private isWatching = false;
  private watchTimer: NodeJS.Timeout | null = null;
  private activeSessionId: string = 'unknown';

  constructor(
    private options: AntigravityAdapterOptions = {},
    private onEvent: (event: NormalizedEvent) => void
  ) {
    if (options.transcriptPath) {
      this.transcriptPath = options.transcriptPath;
      this.activeSessionId = path.basename(path.dirname(path.dirname(this.transcriptPath)));
    }
  }

  /**
   * Resolves the default Antigravity brain directory on Windows/macOS/Linux.
   */
  public static getDefaultBrainPath(): string {
    return path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
  }

  /**
   * Finds the most recently modified conversation transcript by checking the actual
   * transcript.jsonl mtimeMs (avoiding Windows directory mtime caching issues).
   */
  public findLatestTranscript(brainPath: string): string | null {
    if (!fs.existsSync(brainPath)) {
      return null;
    }

    try {
      const entries = fs.readdirSync(brainPath, { withFileTypes: true });
      const candidates: Array<{ transcriptPath: string; sessionId: string; mtimeMs: number }> = [];

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) {
          continue;
        }

        const candidateFile = path.join(brainPath, entry.name, '.system_generated', 'logs', 'transcript.jsonl');
        try {
          if (fs.existsSync(candidateFile)) {
            const stats = fs.statSync(candidateFile);
            candidates.push({
              transcriptPath: candidateFile,
              sessionId: entry.name,
              mtimeMs: stats.mtimeMs,
            });
          }
        } catch {
          // Skip inaccessible entries
        }
      }

      if (candidates.length === 0) {
        return null;
      }

      candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
      this.activeSessionId = candidates[0].sessionId;
      return candidates[0].transcriptPath;
    } catch {
      return null;
    }
  }

  /**
   * Starts watching for new transcript entries.
   */
  public start(): void {
    if (this.isWatching) return;

    if (!this.transcriptPath) {
      const brain = this.options.brainPath || AntigravityAdapter.getDefaultBrainPath();
      this.transcriptPath = this.findLatestTranscript(brain);
    }

    if (this.transcriptPath && fs.existsSync(this.transcriptPath)) {
      try {
        this.currentOffset = fs.statSync(this.transcriptPath).size;
      } catch {
        this.currentOffset = 0;
      }
    }

    this.remainderBuffer = '';
    this.isWatching = true;
    const interval = this.options.pollIntervalMs || 300;

    this.watchTimer = setInterval(() => {
      this.pollForUpdates();
    }, interval);
  }

  /**
   * Polls the transcript file for appended JSONL records with safe line buffering.
   */
  public pollForUpdates(): void {
    if (!this.transcriptPath || !fs.existsSync(this.transcriptPath)) {
      const brain = this.options.brainPath || AntigravityAdapter.getDefaultBrainPath();
      const discovered = this.findLatestTranscript(brain);
      if (discovered) {
        this.transcriptPath = discovered;
        this.currentOffset = fs.statSync(this.transcriptPath).size;
        this.remainderBuffer = '';
      }
      return;
    }

    try {
      const stat = fs.statSync(this.transcriptPath);
      if (stat.size <= this.currentOffset) {
        return;
      }

      const lengthToRead = stat.size - this.currentOffset;
      const buffer = Buffer.alloc(lengthToRead);
      const fd = fs.openSync(this.transcriptPath, 'r');
      fs.readSync(fd, buffer, 0, lengthToRead, this.currentOffset);
      fs.closeSync(fd);

      this.currentOffset = stat.size;
      const incomingText = this.remainderBuffer + buffer.toString('utf8');
      const lines = incomingText.split('\n');

      // The trailing element is incomplete if buffer didn't end with newline
      this.remainderBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          this.parseAndEmitRecord(trimmed);
        }
      }
    } catch {
      // Ignore read errors on active file modifications
    }
  }

  /**
   * Parses a single JSONL record and emits normalized events.
   */
  public parseAndEmitRecord(rawLine: string): void {
    try {
      const record = JSON.parse(rawLine);
      const now = Date.now();

      // Skip raw tool stdout outputs (GENERIC) to avoid polluting chat
      if (record.type === 'GENERIC') {
        return;
      }

      // 1. Handle User Request
      if (record.type === 'USER_INPUT' || record.source === 'USER_EXPLICIT') {
        const cleanContent = extractCleanUserRequest(record.content || '');
        if (cleanContent) {
          this.onEvent({
            event: 'STREAM_CHUNK',
            sessionId: this.activeSessionId,
            agentType: 'antigravity',
            timestamp: now,
            type: 'content',
            sender: 'user',
            delta: cleanContent,
          });

          this.onEvent({
            event: 'AGENT_STATUS',
            sessionId: this.activeSessionId,
            agentType: 'antigravity',
            timestamp: now,
            status: 'thinking',
          });
        }
        return;
      }

      // 2. Handle Model Reasoning (Thinking)
      if (record.thinking) {
        this.onEvent({
          event: 'STREAM_CHUNK',
          sessionId: this.activeSessionId,
          agentType: 'antigravity',
          timestamp: now,
          type: 'thinking',
          sender: 'agent',
          delta: record.thinking,
        });

        this.onEvent({
          event: 'AGENT_STATUS',
          sessionId: this.activeSessionId,
          agentType: 'antigravity',
          timestamp: now,
          status: 'thinking',
        });
      }

      // 3. Handle Tool Calls
      const hasTools = Array.isArray(record.tool_calls) && record.tool_calls.length > 0;
      if (hasTools) {
        for (let i = 0; i < record.tool_calls.length; i++) {
          const tool = record.tool_calls[i];
          const requiresApproval = tool.name === 'run_command' || tool.name === 'ask_question';
          const toolPayload: ToolCallPayload = {
            id: `${record.step_index || 0}-${i}`,
            name: tool.name,
            args: tool.args || tool.arguments || {},
            requiresApproval,
          };

          this.onEvent({
            event: 'TOOL_CALL',
            sessionId: this.activeSessionId,
            agentType: 'antigravity',
            timestamp: now,
            tool: toolPayload,
          });

          this.onEvent({
            event: 'AGENT_STATUS',
            sessionId: this.activeSessionId,
            agentType: 'antigravity',
            timestamp: now,
            status: requiresApproval ? 'waiting_approval' : 'running_tool',
          });
        }
      }

      // 4. Handle Assistant Response Content
      if (record.content) {
        this.onEvent({
          event: 'STREAM_CHUNK',
          sessionId: this.activeSessionId,
          agentType: 'antigravity',
          timestamp: now,
          type: 'content',
          sender: 'agent',
          delta: record.content,
        });
      }

      // 5. Completion Status Detection
      if (record.status === 'DONE' && !hasTools) {
        this.onEvent({
          event: 'AGENT_STATUS',
          sessionId: this.activeSessionId,
          agentType: 'antigravity',
          timestamp: now,
          status: 'done',
        });
      } else if (record.status === 'ERROR') {
        this.onEvent({
          event: 'AGENT_STATUS',
          sessionId: this.activeSessionId,
          agentType: 'antigravity',
          timestamp: now,
          status: 'error',
          error: record.error || 'Execution failed',
        });
      }
    } catch {
      // Ignore unparseable records
    }
  }

  /**
   * Stops watching.
   */
  public stop(): void {
    this.isWatching = false;
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
  }

  public getActiveSessionId(): string {
    return this.activeSessionId;
  }
}
