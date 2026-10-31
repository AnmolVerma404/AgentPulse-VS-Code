import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AntigravityAdapter, extractCleanUserRequest } from '../adapters/antigravity';
import { NormalizedEvent } from '../adapters/types';

describe('AntigravityAdapter', () => {
  let tmpDir: string;
  let transcriptPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-test-'));
    transcriptPath = path.join(tmpDir, 'transcript.jsonl');
    fs.writeFileSync(transcriptPath, '');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('extractCleanUserRequest strips <USER_REQUEST> tags and metadata cleanly', () => {
    const raw = `<USER_REQUEST>\nPlease fix this test\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\ntime: 2026-10-31\n</ADDITIONAL_METADATA>`;
    expect(extractCleanUserRequest(raw)).toBe('Please fix this test');

    const bare = 'Hello agent without tags';
    expect(extractCleanUserRequest(bare)).toBe('Hello agent without tags');
  });

  it('parses content, thinking, and DONE status from transcript.jsonl', () => {
    const events: NormalizedEvent[] = [];
    const adapter = new AntigravityAdapter(
      { transcriptPath },
      (ev) => events.push(ev)
    );

    const record = {
      step_index: 1,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      content: 'Refactoring completed successfully.',
      thinking: 'Analyzing TypeScript imports...',
    };

    adapter.parseAndEmitRecord(JSON.stringify(record));

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.some((e) => e.event === 'STREAM_CHUNK' && e.type === 'thinking')).toBe(true);
    expect(events.some((e) => e.event === 'STREAM_CHUNK' && e.type === 'content' && e.sender === 'agent')).toBe(true);
    expect(events.some((e) => e.event === 'AGENT_STATUS' && e.status === 'done')).toBe(true);
  });

  it('detects interactive tool calls and parses tool.args properly', () => {
    const events: NormalizedEvent[] = [];
    const adapter = new AntigravityAdapter(
      { transcriptPath },
      (ev) => events.push(ev)
    );

    const record = {
      step_index: 2,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      tool_calls: [
        {
          name: 'run_command',
          args: { CommandLine: 'npm test' },
        },
      ],
    };

    adapter.parseAndEmitRecord(JSON.stringify(record));

    const toolCallEvent = events.find((e) => e.event === 'TOOL_CALL');
    expect(toolCallEvent).toBeDefined();
    expect(toolCallEvent?.tool?.name).toBe('run_command');
    expect(toolCallEvent?.tool?.args).toEqual({ CommandLine: 'npm test' });
    expect(toolCallEvent?.tool?.requiresApproval).toBe(true);

    const approvalStatusEvent = events.find(
      (e) => e.event === 'AGENT_STATUS' && e.status === 'waiting_approval'
    );
    expect(approvalStatusEvent).toBeDefined();
  });

  it('omits GENERIC tool outputs from conversational chat content', () => {
    const events: NormalizedEvent[] = [];
    const adapter = new AntigravityAdapter(
      { transcriptPath },
      (ev) => events.push(ev)
    );

    const record = {
      step_index: 3,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'DONE',
      content: 'Raw tool stdout dumping 500 lines of terminal output...',
    };

    adapter.parseAndEmitRecord(JSON.stringify(record));
    expect(events.length).toBe(0);
  });

  it('buffers partial lines across chunk boundaries during polling', () => {
    const events: NormalizedEvent[] = [];
    const adapter = new AntigravityAdapter(
      { transcriptPath },
      (ev) => events.push(ev)
    );

    adapter.start();

    const record1 = JSON.stringify({
      step_index: 4,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      content: 'First complete message',
    });

    const fullLine = record1 + '\n';
    const part1 = fullLine.slice(0, 25);
    const part2 = fullLine.slice(25);

    // Write partial line
    fs.appendFileSync(transcriptPath, part1);
    adapter.pollForUpdates();
    // Partial line should be buffered and not yet emitted
    expect(events.length).toBe(0);

    // Complete the line
    fs.appendFileSync(transcriptPath, part2);
    adapter.pollForUpdates();
    adapter.stop();

    expect(events.some((e) => e.delta === 'First complete message')).toBe(true);
  });

  it('findLatestTranscript selects conversation directory with newest transcript.jsonl mtime', () => {
    const brainDir = path.join(tmpDir, 'brain');
    const oldSession = path.join(brainDir, 'old-session', '.system_generated', 'logs');
    const newSession = path.join(brainDir, 'new-session', '.system_generated', 'logs');

    fs.mkdirSync(oldSession, { recursive: true });
    fs.mkdirSync(newSession, { recursive: true });

    const oldTranscript = path.join(oldSession, 'transcript.jsonl');
    const newTranscript = path.join(newSession, 'transcript.jsonl');

    fs.writeFileSync(oldTranscript, 'old');
    fs.writeFileSync(newTranscript, 'new');

    // Force older timestamp on oldTranscript
    const past = new Date(Date.now() - 60000);
    fs.utimesSync(oldTranscript, past, past);

    const adapter = new AntigravityAdapter({}, () => {});
    const latest = adapter.findLatestTranscript(brainDir);

    expect(latest).toBe(newTranscript);
    expect(adapter.getActiveSessionId()).toBe('new-session');
  });
});
