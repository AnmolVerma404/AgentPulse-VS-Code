# Coding Standards & Quality Guidelines (Extension)

1. **TypeScript Strictness:** Strict mode (`"strict": true`) is enforced. Use explicit types, interfaces, and avoid `any`.
2. **Modular Architecture:**
   - Server logic belongs in `src/server/`.
   - Agent monitoring logic belongs in `src/adapters/`.
   - OS keep-awake logic belongs in `src/keepawake/`.
   - Keep files small (< 250 lines).
3. **Automated Testing:**
   - Every adapter, server component, and token manager must have unit tests in `src/test/`.
   - Run tests with `npm test`.
4. **Performance & Memory Footprint:**
   - The extension must be extremely lightweight (< 30MB memory footprint, 0% idle CPU).
   - Clean up all listeners and WebSocket servers on `deactivate()`.

---

## ⚡ TL;DR

* Strict TypeScript, modular design (< 250 lines), zero `any`.
* Unit tests required for all adapters and server modules (`npm test`).
* Near-zero resource footprint (< 30MB RAM); complete cleanup in `deactivate()`.

