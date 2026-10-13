---
name: antigravity-adapter
description: Engineering instructions for observing, parsing, and streaming Google Antigravity session transcripts to mobile clients.
---

# Google Antigravity Session Adapter Skill

## 1. Antigravity Data Architecture
Antigravity stores sessions locally on the user's computer:
* **Windows:** `%USERPROFILE%\.gemini\antigravity\`
* **macOS / Linux:** `~/.gemini/antigravity/`

### Key Paths:
* Active conversation state: `<appDataDir>/conversations/`
* Session transcripts: `<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`
* Full detailed logs: `<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript_full.jsonl`

## 2. Transcript JSONL Schema
Each line in `transcript.jsonl` is a JSON object with:
* `step_index` (integer): Step counter in conversation.
* `source` ("USER_EXPLICIT" | "MODEL" | "SYSTEM")
* `type` ("USER_INPUT" | "PLANNER_RESPONSE")
* `status` ("DONE" | "ERROR" | "RUNNING")
* `content` (string): Text response / user message
* `thinking` (string): Internal model reasoning
* `tool_calls` (array): List of tools executed with names and arguments

## 3. Real-Time Tailing Pattern
```typescript
import * as fs from 'fs';

export class AntigravityLogWatcher {
  private fileOffset = 0;

  constructor(private transcriptPath: string, private onNewRecord: (record: any) => void) {}

  public start(): void {
    if (fs.existsSync(this.transcriptPath)) {
      this.fileOffset = fs.statSync(this.transcriptPath).size;
    }

    fs.watchFile(this.transcriptPath, { interval: 250 }, (curr) => {
      if (curr.size > this.fileOffset) {
        const stream = fs.createReadStream(this.transcriptPath, {
          start: this.fileOffset,
          end: curr.size,
          encoding: 'utf8',
        });

        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                this.onNewRecord(JSON.parse(line));
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        });

        stream.on('end', () => {
          this.fileOffset = curr.size;
        });
      }
    });
  }
}
```

---

## ⚡ TL;DR

* Watches `transcript.jsonl` in `<appDataDir>/brain/<id>/.system_generated/logs/`.
* Tails file by byte offset to stream tokens, thoughts, and tool approvals with zero polling lag.

