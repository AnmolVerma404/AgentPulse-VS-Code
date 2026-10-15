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
 * Observes and streams live Google Antigravity session transcripts.
 */
export class AntigravityAdapter {
  private transcriptPath: string | null = null;
  private currentOffset = 0;
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
   * Finds the most recently modified conversation directory.
   */
  public findLatestTranscript(brainPath: string): string | null {
    if (!fs.existsSync(brainPath)) {
      return null;
    }

    try {
      const entries = fs.readdirSync(brainPath, { withFileTypes: true });
      const dirs = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => {
          const dirPath = path.join(brainPath, entry.name);
          try {
            const stats = fs.statSync(dirPath);
            return { dirPath, name: entry.name, mtimeMs: stats.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter((item): item is { dirPath: string; name: string; mtimeMs: number } => item !== null)
        .sort((a, b) => b.mtimeMs - a.mtimeMs);

      for (const dir of dirs) {
        const transcript = path.join(dir.dirPath, '.system_generated', 'logs', 'transcript.jsonl');
        if (fs.existsSync(transcript)) {
          this.activeSessionId = dir.name;
          return transcript;
        }
      }
    } catch {
      return null;
    }

    return null;
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

    this.isWatching = true;
    const interval = this.options.pollIntervalMs || 300;

    this.watchTimer = setInterval(() => {
      this.pollForUpdates();
    }, interval);
  }

  /**
   * Polls the transcript file for appended JSONL records.
   */
  public pollForUpdates(): void {
    if (!this.transcriptPath || !fs.existsSync(this.transcriptPath)) {
      const brain = this.options.brainPath || AntigravityAdapter.getDefaultBrainPath();
      const discovered = this.findLatestTranscript(brain);
      if (discovered) {
        this.transcriptPath = discovered;
        this.currentOffset = fs.statSync(this.transcriptPath).size;
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
      const rawText = buffer.toString('utf8');
      const lines = rawText.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          this.parseAndEmitRecord(trimmed);
        }
      }
    } catch (err) {
      // Ignore read errors on partially written lines
    }
  }

  /**
   * Parses a single JSONL record and emits normalized events.
   */
  public parseAndEmitRecord(rawLine: string): void {
    try {
      const record = JSON.parse(rawLine);
      const now = Date.now();

      // Emit Thinking delta if available
      if (record.thinking) {
        this.onEvent({
          event: 'STREAM_CHUNK',
          sessionId: this.activeSessionId,
          agentType: 'antigravity',
          timestamp: now,
          type: 'thinking',
          delta: record.thinking,
        });
      }

      // Emit Content delta if available
      if (record.content) {
        this.onEvent({
          event: 'STREAM_CHUNK',
          sessionId: this.activeSessionId,
          agentType: 'antigravity',
          timestamp: now,
          type: 'content',
          delta: record.content,
        });
      }

      // Emit Tool Calls if present
      if (Array.isArray(record.tool_calls) && record.tool_calls.length > 0) {
        for (let i = 0; i < record.tool_calls.length; i++) {
          const tool = record.tool_calls[i];
          const toolPayload: ToolCallPayload = {
            id: `${record.step_index || 0}-${i}`,
            name: tool.name,
            args: tool.arguments,
            requiresApproval: tool.name === 'run_command' || tool.name === 'ask_question',
          };

          this.onEvent({
            event: 'TOOL_CALL',
            sessionId: this.activeSessionId,
            agentType: 'antigravity',
            timestamp: now,
            tool: toolPayload,
          });

          if (toolPayload.requiresApproval) {
            this.onEvent({
              event: 'AGENT_STATUS',
              sessionId: this.activeSessionId,
              agentType: 'antigravity',
              timestamp: now,
              status: 'waiting_approval',
            });
          }
        }
      }

      // Status updates
      if (record.status === 'DONE') {
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

