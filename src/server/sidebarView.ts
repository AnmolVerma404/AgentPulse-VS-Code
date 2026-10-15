import * as vscode from 'vscode';
import * as QRCode from 'qrcode';

export interface SidebarState {
  isRunning: boolean;
  port: number;
  token: string | null;
  connectionUri: string | null;
  connectedClients: number;
  agentStatus: string;
  keepAwakeActive: boolean;
}

export class AgentPulseSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'agentpulse.controlView';
  private _view?: vscode.WebviewView;
  private _state: SidebarState = {
    isRunning: false,
    port: 49152,
    token: null,
    connectionUri: null,
    connectedClients: 0,
    agentStatus: 'idle',
    keepAwakeActive: false,
  };

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'startServer':
          vscode.commands.executeCommand('agentpulse.startServer');
          break;
        case 'stopServer':
          vscode.commands.executeCommand('agentpulse.stopServer');
          break;
        case 'copyUri':
          if (this._state.connectionUri) {
            vscode.env.clipboard.writeText(this._state.connectionUri);
            vscode.window.showInformationMessage('AgentPulse URI copied to clipboard!');
          }
          break;
      }
    });

    this.render();
  }

  public async updateState(newState: Partial<SidebarState>): Promise<void> {
    this._state = { ...this._state, ...newState };
    await this.render();
  }

  private async render(): Promise<void> {
    if (!this._view) return;

    let qrDataUrl = '';
    if (this._state.isRunning && this._state.connectionUri) {
      try {
        qrDataUrl = await QRCode.toDataURL(this._state.connectionUri, {
          margin: 1,
          width: 180,
          color: {
            dark: '#ffffff',
            light: '#1e1e1e',
          },
        });
      } catch {
        qrDataUrl = '';
      }
    }

    this._view.webview.html = this._getHtml(qrDataUrl);
  }

  private _getHtml(qrDataUrl: string): string {
    const isRunning = this._state.isRunning;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      padding: 12px;
      margin: 0;
      background: transparent;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .badge-running {
      background: #10b98122;
      color: #10b981;
      border: 1px solid #10b98166;
    }
    .badge-stopped {
      background: #ef444422;
      color: #ef4444;
      border: 1px solid #ef444466;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 6px;
      background: currentColor;
    }
    .btn {
      width: 100%;
      padding: 8px 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #ffffff);
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, #333);
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
    }
    .qr-img {
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .info-card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border, #333);
      border-radius: 6px;
      padding: 10px;
      margin-top: 12px;
      font-size: 11px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .info-label {
      color: var(--vscode-descriptionForeground);
    }
    .info-value {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div>
    <div class="badge ${isRunning ? 'badge-running' : 'badge-stopped'}">
      <div class="status-dot"></div>
      ${isRunning ? `Running on :${this._state.port}` : 'Server Stopped'}
    </div>

    ${
      isRunning
        ? `<button class="btn btn-secondary" onclick="sendMessage('stopServer')">⏹ Stop Server</button>`
        : `<button class="btn btn-primary" onclick="sendMessage('startServer')">▶ Start Server</button>`
    }

    ${
      isRunning && qrDataUrl
        ? `
        <div class="qr-container">
          <img class="qr-img" src="${qrDataUrl}" width="160" height="160" alt="Pairing QR Code" />
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-align: center; margin-bottom: 8px;">
            Scan in AgentPulse Mobile
          </div>
          <button class="btn btn-secondary" onclick="sendMessage('copyUri')">📋 Copy Connection URI</button>
        </div>
        `
        : ''
    }

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Connected Phones:</span>
        <span class="info-value">${this._state.connectedClients}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Antigravity Status:</span>
        <span class="info-value">${this._state.agentStatus}</span>
      </div>
      <div class="info-row" style="margin-bottom: 0;">
        <span class="info-label">Laptop Keep-Awake:</span>
        <span class="info-value">${this._state.keepAwakeActive ? 'Active' : 'Off'}</span>
      </div>
    </div>
  </div>

  <script>
    const vscode = window.vscodeApi || (window.vscodeApi = acquireVsCodeApi());
    function sendMessage(type) {
      vscode.postMessage({ type });
    }
  </script>
</body>
</html>`;
  }
}
