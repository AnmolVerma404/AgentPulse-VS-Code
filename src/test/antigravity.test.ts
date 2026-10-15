import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AntigravityAdapter } from '../adapters/antigravity';
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
    expect(events.some((e) => e.event === 'STREAM_CHUNK' && e.type === 'content')).toBe(true);
    expect(events.some((e) => e.event === 'AGENT_STATUS' && e.status === 'done')).toBe(true);
  });

  it('detects interactive tool calls and requests approval', () => {
    const events: NormalizedEvent[] = [];
    const adapter = new AntigravityAdapter(
      { transcriptPath },
      (ev) => events.push(ev)
    );

    const record = {
      step_index: 2,
      source: 'MODEL',
      tool_calls: [
        {
          name: 'run_command',
          arguments: { CommandLine: 'npm test' },
        },
      ],
    };

    adapter.parseAndEmitRecord(JSON.stringify(record));

    const toolCallEvent = events.find((e) => e.event === 'TOOL_CALL');
    expect(toolCallEvent).toBeDefined();
    expect(toolCallEvent?.tool?.name).toBe('run_command');
    expect(toolCallEvent?.tool?.requiresApproval).toBe(true);

    const approvalStatusEvent = events.find(
      (e) => e.event === 'AGENT_STATUS' && e.status === 'waiting_approval'
    );
    expect(approvalStatusEvent).toBeDefined();
  });

  it('polls new appended records from the file stream', () => {
    const events: NormalizedEvent[] = [];
    const adapter = new AntigravityAdapter(
      { transcriptPath },
      (ev) => events.push(ev)
    );

    adapter.start();

    // Append a record
    const record = {
      step_index: 3,
      status: 'DONE',
      content: 'Appended token stream test',
    };
    fs.appendFileSync(transcriptPath, JSON.stringify(record) + '\n');

    adapter.pollForUpdates();
    adapter.stop();

    expect(events.some((e) => e.delta === 'Appended token stream test')).toBe(true);
  });
});

