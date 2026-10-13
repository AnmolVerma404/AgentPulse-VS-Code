# Security & Privacy Rules (Extension)

1. **Local-First & Zero-Trust:**
   - The WebSocket daemon binds to `127.0.0.1` by default.
   - External tunneling must require explicit user activation.
2. **Ephemeral Pairing Tokens:**
   - Every session generates a cryptographically secure 256-bit token (`crypto.randomBytes(32)`).
   - Incoming WebSocket connections must present the valid token during the handshake.
   - Use `crypto.timingSafeEqual` for constant-time token comparison to avoid timing attacks.
3. **No Codebase Exfiltration:**
   - Never expose an arbitrary file reading or remote command execution endpoint.
   - Only stream chat events, tool descriptors, and planned diff summaries.
4. **Zero Cloud Storage:**
   - No chats, prompts, or source code are ever uploaded to third-party databases.

---

## ⚡ TL;DR

* Ephemeral 256-bit pairing token verified with constant-time comparison.
* Default bind to localhost; zero cloud database storage.
* No arbitrary file access or remote shell execution endpoints.

