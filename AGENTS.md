# AGENTS.md - VS Code Extension Context Cache & Engineering Guidelines

> **Repository:** AgentPulse VS Code Extension (`agentpulse-vscode`)  
> **Tech Stack:** VS Code Extension API (^1.93.0) | Node.js `ws` | TypeScript (strict) | Jest

---

## 1. Core Principles & Non-Negotiables

* **Zero-Server / Standalone:** The extension runs a local WebSocket server on localhost with ephemeral token authorization. No data is stored in the cloud.
* **Security & Privacy First:** Pairing tokens are 256-bit cryptographic secrets validated using constant-time comparisons (`crypto.timingSafeEqual`).
* **Keep-Awake Management:** Engage OS power assertions while an agent task is active so laptops don't go to sleep mid-run.
* **Token Optimization for AI Agents:**
  * Consult skills in `.agents/skills/` before generating boilerplate.
  * Modular files (< 250 lines).
  * Run tests (`npm test`) before declaring tasks done.

---

## 2. Directory Layout

```
extension/
├── .agents/                      # AI Agent Skills & Rules
│   ├── rules/
│   │   ├── coding-standards.md   # TypeScript standards
│   │   └── security.md           # Security & token rules
│   └── skills/
│       ├── vscode-extension-dev/ # Extension & daemon patterns
│       └── antigravity-adapter/  # Antigravity log observer pattern
├── src/
│   ├── server/                   # WebSocket daemon & QR pairing
│   ├── adapters/                 # Antigravity & Copilot observers
│   ├── keepawake/                # Windows & macOS power assertions
│   ├── extension.ts              # Extension entrypoint
│   └── test/                     # Jest unit tests
├── package.json
└── tsconfig.json
```

---

## 3. Development Commands

```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript to out/
npm run watch        # Watch and recompile
npm test             # Run Jest unit test suite
```

---

## 4. Skills & Fast Reference

* **VS Code & Daemon Architecture:** See `.agents/skills/vscode-extension-dev/SKILL.md`
* **Antigravity Transcript Adapter:** See `.agents/skills/antigravity-adapter/SKILL.md`
* **Security & Token Rules:** See `.agents/rules/security.md`

---

## ⚡ TL;DR

* Local-first daemon on ephemeral port; zero cloud storage.
* Ephemeral pairing tokens, keep-awake OS assertions, and JSONL log tailing.
* Modular TypeScript (< 250 lines) with Jest tests.

