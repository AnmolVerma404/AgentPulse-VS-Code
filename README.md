# AgentPulse VS Code Extension (`agentpulse-vscode`)

> VS Code & Antigravity IDE companion extension bridging your desktop AI sessions to your mobile phone while AFK.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.93.0-007ACC.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Overview

When you run complex, multi-step agent prompts in **Google Antigravity** or **GitHub Copilot**, you shouldn't have to stay glued to your desk. **AgentPulse** runs a lightweight local daemon inside your IDE that:

* **Tails Antigravity Transcripts:** Streams real-time tokens, internal reasoning, and tool calls directly from Antigravity's structured `transcript.jsonl` session logs.
* **Monitors GitHub Copilot:** Hooks into active chat sessions.
* **Prevents Laptop Sleep:** Engages OS-level keep-awake power assertions (Windows `SetThreadExecutionState` / macOS `caffeinate`) while an agent task is active.
* **Instant QR Code Pairing:** Generates a secure, ephemeral QR code in VS Code to pair your phone in seconds.
* **Zero Cloud Storage:** Runs 100% locally on your machine with ephemeral 256-bit token authentication. No chats or code are ever sent to an external database.

---

## 🛠️ Tech Stack

* **Platform:** VS Code Extension API (^1.93.0) + Antigravity IDE
* **Language:** TypeScript (Strict ES2022)
* **WebSocket Server:** `ws` on localhost
* **Security:** Cryptographic pairing tokens (`crypto.randomBytes(32)` + `timingSafeEqual`)
* **Testing:** Jest + `ts-jest`

---

## 🚀 Getting Started

### Prerequisites
* Node.js 20+ installed
* VS Code or Google Antigravity IDE installed

### 1. Installation & Build
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

### 2. Running in Development (Extension Development Host)
1. Open this repository in VS Code or Antigravity IDE.
2. Press <kbd>F5</kbd> to launch a new **Extension Development Host** window.
3. Open the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) and run:
   * `AgentPulse: Start Mobile Companion Server`
   * `AgentPulse: Show Mobile Pairing QR Code`

---

## 🎮 Contributed Commands

| Command | Title | Description |
| :--- | :--- | :--- |
| `agentpulse.startServer` | `AgentPulse: Start Server` | Starts the local WebSocket companion daemon. |
| `agentpulse.showPairingQr` | `AgentPulse: Show Pairing QR Code` | Displays a pairing QR code in VS Code. |
| `agentpulse.stopServer` | `AgentPulse: Stop Server` | Shuts down the daemon and releases keep-awake assertions. |

---

## 🧪 Testing & Quality Assurance

```bash
# Run unit tests
npm test

# Run linter
npm run lint
```

---

## 📁 Repository Structure

```
./
├── src/
│   ├── server/             # Ephemeral WebSocket daemon & QR generator
│   │   ├── wss.ts          # Server instance & connection manager
│   │   ├── auth.ts         # Token generation & constant-time verification
│   │   └── qr.ts           # Terminal & webview QR code generation
│   ├── adapters/           # AI assistant observers
│   │   ├── base.ts         # AgentAdapter interface
│   │   ├── antigravity.ts  # Antigravity transcript.jsonl tailing
│   │   └── copilot.ts      # GitHub Copilot Chat API listener
│   ├── keepawake/          # Windows & macOS keep-awake engine
│   ├── extension.ts        # Extension activation and command registration
│   └── test/               # Jest test suite
├── package.json            # Extension manifest & commands
├── tsconfig.json           # TypeScript configuration
├── AGENTS.md               # Context cache for AI agents
└── .vscodeignore           # Packaging ignore list
```

---

## 🔒 Security Architecture

* **Localhost Binding:** Binds strictly to `127.0.0.1` by default.
* **Ephemeral Secret:** Every pairing session creates a 256-bit cryptographic token. Connections without this token are immediately rejected.
* **No File Access:** The extension provides an event stream and tool approval gateway; it does not offer arbitrary file reading or remote command execution APIs.

---

## ⚡ TL;DR

* **What it is:** Lightweight VS Code & Antigravity companion extension serving a local WebSocket server and keep-awake engine.
* **Security:** 100% local, ephemeral 256-bit token auth, zero cloud storage.
* **Run:** `npm install && npm run compile`. Press <kbd>F5</kbd> in VS Code to run. Tests: `npm test`.

