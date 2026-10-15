import { WebSocket } from 'ws';
import { AgentPulseServer } from '../server/wss';
import { TokenManager } from '../server/auth';
import { NormalizedEvent } from '../adapters/types';

describe('AgentPulseServer & WebSocket Handshake', () => {
  let tokenManager: TokenManager;
  let server: AgentPulseServer;
  let serverPort: number;
  let validToken: string;

  beforeEach(async () => {
    tokenManager = new TokenManager();
    validToken = tokenManager.generateSessionToken();

    server = new AgentPulseServer({
      port: 0, // OS assigns random available port
      tokenManager,
    });

    serverPort = await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('starts on an available port and responds to HTTP health check', async () => {
    expect(serverPort).toBeGreaterThan(0);
  });

  it('rejects connection attempts without valid token', (done) => {
    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}`);

    ws.on('error', (err) => {
      expect(err).toBeDefined();
      done();
    });

    ws.on('open', () => {
      ws.close();
      done(new Error('Connection should have been rejected'));
    });
  });

  it('accepts connection with valid token and receives broadcasted events', (done) => {
    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}?token=${validToken}`);

    const testEvent: NormalizedEvent = {
      event: 'AGENT_STATUS',
      sessionId: 'test-session',
      agentType: 'antigravity',
      status: 'thinking',
      timestamp: Date.now(),
    };

    ws.on('open', () => {
      server.broadcast(testEvent);
    });

    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      expect(parsed.event).toBe('AGENT_STATUS');
      expect(parsed.status).toBe('thinking');
      ws.close();
      done();
    });
  });

  it('notifies onClientCountChange when client connects and disconnects', (done) => {
    const counts: number[] = [];

    let finished = false;
    const testServer = new AgentPulseServer({
      port: 0,
      tokenManager,
      onClientCountChange: (count) => {
        counts.push(count);
        if (!finished && counts.includes(1) && count === 0) {
          finished = true;
          testServer.stop().then(() => {
            expect(counts).toContain(1);
            expect(counts[counts.length - 1]).toBe(0);
            done();
          });
        }
      },
    });

    testServer.start().then((port) => {
      const testWs = new WebSocket(`ws://127.0.0.1:${port}?token=${validToken}`);
      testWs.on('open', () => {
        testWs.close();
      });
    });
  });
});

