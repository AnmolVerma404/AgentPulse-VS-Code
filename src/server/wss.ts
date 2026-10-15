import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { TokenManager } from './auth';
import { NormalizedEvent, ClientAction } from '../adapters/types';

export interface ServerOptions {
  port: number;
  tokenManager: TokenManager;
  onClientAction?: (action: ClientAction) => void;
}

export class AgentPulseServer {
  private wss: WebSocketServer | null = null;
  private server: http.Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private isRunning = false;

  constructor(private options: ServerOptions) {}

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer((req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'AgentPulse Daemon' }));
        });

        this.wss = new WebSocketServer({ noServer: true });

        this.server.on('upgrade', (request, socket, head) => {
          const parsedUrl = new URL(request.url || '', 'http://127.0.0.1');
          const token = parsedUrl.searchParams.get('token') || '';

          if (!this.options.tokenManager.verify(token)) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          this.wss?.handleUpgrade(request, socket, head, (ws) => {
            this.wss?.emit('connection', ws, request);
          });
        });

        this.wss.on('connection', (ws: WebSocket) => {
          this.clients.add(ws);

          ws.on('message', (data: Buffer | string) => {
            try {
              const parsed: ClientAction = JSON.parse(data.toString());
              if (this.options.onClientAction) {
                this.options.onClientAction(parsed);
              }
            } catch {
              // Ignore invalid JSON messages
            }
          });

          ws.on('close', () => {
            this.clients.delete(ws);
          });

          ws.on('error', () => {
            this.clients.delete(ws);
          });
        });

        this.server.listen(this.options.port, '127.0.0.1', () => {
          this.isRunning = true;
          const address = this.server?.address();
          const actualPort = typeof address === 'object' && address ? address.port : this.options.port;
          resolve(actualPort);
        });

        this.server.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Broadcasts a normalized event to all authenticated connected mobile clients.
   */
  public broadcast(event: NormalizedEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.isRunning = false;
      for (const client of this.clients) {
        client.terminate();
      }
      this.clients.clear();

      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }

      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
