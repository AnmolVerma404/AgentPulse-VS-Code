# Implementation Plan - AgentPulse Extension (Read-Only Monitor)

> **Goal:** Transform the VS Code extension into a reliable, read-only session observer and WebSocket daemon that streams Antigravity progress and triggers "Task Done" notifications to a mobile device on the local network (Case 1: Home Wi-Fi).

---

## Technical Context & Constraints
- **Zero Input Injection:** No writing prompts or simulated tool approvals back into Antigravity (Antigravity provides no public extension API for this).
- **Network Scope (Case 1):** Workstation and phone are connected to the same local Wi-Fi router.
- **Log Source:** `%USERPROFILE%\.gemini\antigravity\brain\<id>\.system_generated\logs\transcript.jsonl`.

---

## Proposed Phases & Steps

### Phase 1: Clean Up & Remove Legacy Write Code
* [x] **Step 1.1:** Update [`src/adapters/types.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/adapters/types.ts) to deprecate `ClientAction` and interactive approval requests. Simplify `NormalizedEvent` to focus on status, thinking, message content, and tool execution indicators.
* [x] **Step 1.2:** In [`src/server/wss.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/server/wss.ts), remove `onClientAction` dispatch and incoming message parsing. The server becomes strictly a broadcast and state synchronization daemon.
* [x] **Step 1.3:** In [`src/extension.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/extension.ts), remove `handleClientAction` and unused write handlers.

---

### Phase 2: Fix Local Network Binding & QR LAN Address
* [x] **Step 2.1:** In [`src/server/wss.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/server/wss.ts), change `this.server.listen(port, '127.0.0.1')` to bind to `'0.0.0.0'` (all network interfaces) so devices on the local Wi-Fi can connect.
* [x] **Step 2.2:** Add a network utility helper to resolve the machine's primary non-internal IPv4 address (e.g. `192.168.x.x` via `os.networkInterfaces()`).
* [x] **Step 2.3:** In [`src/extension.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/extension.ts) and [`src/server/sidebarView.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/server/sidebarView.ts), update the connection URI and QR code to use the resolved LAN IP instead of hardcoded `127.0.0.1`.

---

### Phase 3: Reliable Antigravity Transcript Observer
* [x] **Step 3.1:** Fix `findLatestTranscript()` in [`src/adapters/antigravity.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/adapters/antigravity.ts) to compare the modification timestamps (`mtimeMs`) of the actual `transcript.jsonl` files (Windows directory mtime does not propagate up from subfolders).
* [x] **Step 3.2:** Implement partial line buffering during file tailing in `pollForUpdates()` so chunk boundaries in JSON lines never cause `JSON.parse` syntax crashes.
* [x] **Step 3.3:** Correct transcript schema parsing:
  - Support `tool.args` (instead of `tool.arguments`).
  - Distinguish user inputs (`USER_EXPLICIT` / `USER_INPUT`) and assistant outputs (`PLANNER_RESPONSE`).
  - Strip raw XML tags (`<USER_REQUEST>`, `<ADDITIONAL_METADATA>`) from user prompts for a clean chat feed.
  - Omit `GENERIC` (raw tool stdout dumps) from the main chat content stream.
* [x] **Step 3.4:** Add exact completion detection: when a `PLANNER_RESPONSE` completes with `status: 'DONE'`, emit a high-priority `AGENT_STATUS: 'done'` event.

---

### Phase 4: Initial State Handshake on Connection
* [ ] **Step 4.1:** In [`src/adapters/antigravity.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/adapters/antigravity.ts), add a method to parse the existing conversation history (recent messages) from the active transcript file.
* [ ] **Step 4.2:** In [`src/server/wss.ts`](file:///d:/Code/Personal_Projects/AI_Chat_To_App/extension/src/server/wss.ts), when a new client connects, immediately emit an `INIT_SESSION` event containing the current session ID, agent status, and recent message history so the phone doesn't start with a blank screen.

---

### Phase 5: Verification & Tests
* [ ] **Step 5.1:** Update existing unit tests in `src/test/` to reflect read-only server and parser adjustments.
* [ ] **Step 5.2:** Test extension compilation (`npm run compile`) and verify `npm test` passes 100%.

