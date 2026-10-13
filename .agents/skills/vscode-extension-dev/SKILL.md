---
name: vscode-extension-dev
description: Specialized guidelines and patterns for developing the VS Code / Antigravity companion extension and local daemon.
---

# VS Code Extension & Local Daemon Engineering Skill

## 1. Core Principles
* **Lightweight & Non-Intrusive:** The extension must run with near-zero idle CPU and memory footprint (< 30MB).
* **Ephemeral Security:** Every pairing session creates a cryptographically strong 256-bit token. Only connections presenting this token are accepted.
* **Compatibility:** Compatible with standard VS Code, Cursor, Windsurf, and Antigravity IDE.
* **OS Keep-Awake:** Uses native OS power assertions while an agent task is active so laptops don't sleep mid-run.

## 2. Directory Layout
```
./
├── src/
│   ├── server/             # WebSocket server on localhost (ws package)
│   │   ├── wss.ts          # Server instance & connection manager
│   │   ├── auth.ts         # Ephemeral token generation & verification
│   │   └── qr.ts           # QR code generator for pairing terminal/webview
│   ├── adapters/           # AI Assistant observers
│   │   ├── base.ts         # AgentAdapter interface
│   │   ├── antigravity.ts  # Antigravity transcript.jsonl tailing
│   │   └── copilot.ts      # GitHub Copilot Chat API listener
│   ├── keepawake/          # Windows & macOS power assertion APIs
│   │   ├── index.ts        # KeepAwakeManager
│   │   └── win32.ts        # SetThreadExecutionState wrapper
│   ├── extension.ts        # activate() and deactivate()
│   └── test/               # Jest unit tests
├── package.json
└── tsconfig.json
```

## 3. Key Patterns

### Ephemeral Token Generation & Verification
```typescript
import * as crypto from 'crypto';

export class TokenManager {
  private currentToken: string | null = null;

  public generateSessionToken(): string {
    this.currentToken = crypto.randomBytes(32).toString('hex');
    return this.currentToken;
  }

  public verify(incomingToken: string): boolean {
    if (!this.currentToken || !incomingToken) return false;
    return crypto.timingSafeEqual(
      Buffer.from(this.currentToken),
      Buffer.from(incomingToken)
    );
  }
}
```

### Windows & macOS Keep-Awake Implementation
```typescript
import { exec } from 'child_process';

export class KeepAwake {
  private active = false;

  public enable(): void {
    if (this.active) return;
    this.active = true;
    if (process.platform === 'win32') {
      exec('powershell -Command "[void][Windows.System.Power.PowerManager, Windows.System, ContentType=WindowsRuntime]"');
    } else if (process.platform === 'darwin') {
      exec('caffeinate -d -i -m -u &');
    }
  }

  public disable(): void {
    this.active = false;
    if (process.platform === 'darwin') {
      exec('killall caffeinate');
    }
  }
}
```

---

## ⚡ TL;DR

* Ephemeral session tokens with constant-time verification.
* Built-in OS keep-awake assertions during active agent tasks.
* Low memory footprint (< 30MB) and clean resource disposal.

