# Graph Report - extension  (2026-10-24)

## Corpus Check
- Corpus is ~5,620 words - fits in a single context window. You may not need a graph.

## Summary
- 146 nodes · 198 edges · 14 communities (10 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- WebSocket Server & Token Security
- VS Code Package Manifest & Dependencies
- VS Code Settings & Activity Bar Contributions
- TypeScript Compiler Configuration
- Extension Lifecycle & KeepAwake Daemon
- Webview Sidebar Provider & QR Code
- Antigravity Session Adapter & Log Tailing
- Development & Jest Test Dependencies
- File System & Log Parsing Infrastructure
- NPM Scripts & Prepublish Workflows
- VS Code Mocking Utilities for Unit Tests
- Architecture Guidelines & Zero-Server Model
- Extension TypeScript Standards

## God Nodes (most connected - your core abstractions)
1. `AntigravityAdapter` - 13 edges
2. `activate()` - 12 edges
3. `TokenManager` - 12 edges
4. `compilerOptions` - 11 edges
5. `AgentPulseSidebarProvider` - 10 edges
6. `AgentPulseServer` - 10 edges
7. `NormalizedEvent` - 8 edges
8. `KeepAwakeManager` - 7 edges
9. `scripts` - 6 edges
10. `contributes` - 5 edges

## Surprising Connections (you probably didn't know these)
- `AgentPulse VS Code Overview` --references--> `activate()`  [INFERRED]
  README.md → src/extension.ts
- `Desktop Daemon & Bridge` --references--> `KeepAwakeManager`  [INFERRED]
  README.md → src/keepawake/index.ts
- `Local Token Authentication Security` --implements--> `TokenManager`  [INFERRED]
  .agents/rules/security.md → src/server/auth.ts
- `VS Code Extension Guidelines` --implements--> `AgentPulseSidebarProvider`  [INFERRED]
  .agents/skills/vscode-extension-dev/SKILL.md → src/server/sidebarView.ts
- `Local Token Authentication Security` --references--> `AgentPulseServer`  [INFERRED]
  .agents/rules/security.md → src/server/wss.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AgentPulse Desktop Server Subsystem** — src_server_wss_agentpulseserver, src_server_auth_tokenmanager, src_server_sidebarview_agentpulsesidebarprovider, src_keepawake_index_keepawakemanager [INFERRED 0.90]

## Communities (14 total, 4 thin omitted)

### Community 0 - "WebSocket Server & Token Security"
Cohesion: 0.13
Nodes (9): Local Token Authentication Security, ws, AgentStatus, AgentType, ClientAction, NormalizedEvent, TokenManager, AgentPulseServer (+1 more)

### Community 1 - "VS Code Package Manifest & Dependencies"
Cohesion: 0.09
Nodes (22): activationEvents, categories, dependencies, qrcode, ws, description, displayName, engines (+14 more)

### Community 2 - "VS Code Settings & Activity Bar Contributions"
Cohesion: 0.11
Nodes (18): Extension Activity Bar Icon, default, description, type, default, description, type, properties (+10 more)

### Community 3 - "TypeScript Compiler Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, rootDir, skipLibCheck (+5 more)

### Community 4 - "Extension Lifecycle & KeepAwake Daemon"
Cohesion: 0.24
Nodes (6): AgentPulse VS Code Overview, Desktop Daemon & Bridge, activate(), deactivate(), handleClientAction(), KeepAwakeManager

### Community 5 - "Webview Sidebar Provider & QR Code"
Cohesion: 0.24
Nodes (4): VS Code Extension Guidelines, qrcode, AgentPulseSidebarProvider, SidebarState

### Community 6 - "Antigravity Session Adapter & Log Tailing"
Cohesion: 0.29
Nodes (3): Antigravity Adapter Guidelines, Antigravity Transcript Tailing, AntigravityAdapter

### Community 7 - "Development & Jest Test Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jest, ts-jest, @types/jest, @types/node, @types/qrcode, @types/vscode, @types/ws (+1 more)

### Community 9 - "NPM Scripts & Prepublish Workflows"
Cohesion: 0.33
Nodes (6): scripts, compile, lint, test, vscode:prepublish, watch

### Community 10 - "VS Code Mocking Utilities for Unit Tests"
Cohesion: 0.50
Nodes (3): commands, window, workspace

## Knowledge Gaps
- **14 isolated node(s):** `@types/jest`, `@types/node`, `@types/qrcode`, `@types/vscode`, `@types/ws` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 86 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ws` connect `WebSocket Server & Token Security` to `VS Code Package Manifest & Dependencies`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **What connects `@types/jest`, `@types/node`, `@types/qrcode` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `WebSocket Server & Token Security` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Why does `contributes` connect `VS Code Settings & Activity Bar Contributions` to `VS Code Package Manifest & Dependencies`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Should `VS Code Package Manifest & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `qrcode` connect `Webview Sidebar Provider & QR Code` to `VS Code Package Manifest & Dependencies`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Should `VS Code Settings & Activity Bar Contributions` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._