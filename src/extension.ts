import * as vscode from 'vscode';
import { TokenManager } from './server/auth';
import { AgentPulseServer } from './server/wss';
import { AntigravityAdapter } from './adapters/antigravity';
import { KeepAwakeManager } from './keepawake';
import { AgentPulseSidebarProvider } from './server/sidebarView';
import { ClientAction, NormalizedEvent } from './adapters/types';

let server: AgentPulseServer | null = null;
let tokenManager: TokenManager | null = null;
let adapter: AntigravityAdapter | null = null;
let keepAwake: KeepAwakeManager | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let sidebarProvider: AgentPulseSidebarProvider | null = null;

export async function activate(context: vscode.ExtensionContext) {
  tokenManager = new TokenManager();
  keepAwake = new KeepAwakeManager();

  // Register Sidebar Control Center Webview Provider
  sidebarProvider = new AgentPulseSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AgentPulseSidebarProvider.viewType,
      sidebarProvider
    )
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(radio-tower) AgentPulse: Ready';
  statusBarItem.tooltip = 'Click to show AgentPulse Control Center';
  statusBarItem.command = 'agentpulse.showPairingQr';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const startServer = async () => {
    if (server) {
      vscode.window.showInformationMessage('AgentPulse server is already running.');
      return;
    }

    const config = vscode.workspace.getConfiguration('agentpulse');
    const port = config.get<number>('port', 49152);
    const autoKeepAwake = config.get<boolean>('autoKeepAwake', true);

    const token = tokenManager!.generateSessionToken();

    server = new AgentPulseServer({
      port,
      tokenManager: tokenManager!,
      onClientAction: (action: ClientAction) => {
        handleClientAction(action);
      },
      onClientCountChange: (count: number) => {
        sidebarProvider?.updateState({ connectedClients: count });
      },
    });

    adapter = new AntigravityAdapter({}, (event: NormalizedEvent) => {
      // Manage power assertions based on agent state
      if (autoKeepAwake && keepAwake) {
        if (event.status === 'thinking' || event.status === 'running_tool') {
          keepAwake.activate();
        } else if (event.status === 'done' || event.status === 'error') {
          keepAwake.deactivate();
        }
      }

      sidebarProvider?.updateState({
        agentStatus: event.status,
        keepAwakeActive: keepAwake?.isActive() ?? false,
      });

      // Broadcast to mobile app
      server?.broadcast(event);
    });

    try {
      const boundPort = await server.start();
      adapter.start();

      const connectionUri = `ws://127.0.0.1:${boundPort}?token=${token}`;
      sidebarProvider?.updateState({
        isRunning: true,
        port: boundPort,
        token,
        connectionUri,
        connectedClients: 0,
        keepAwakeActive: keepAwake?.isActive() ?? false,
      });

      if (statusBarItem) {
        statusBarItem.text = `$(radio-tower) AgentPulse: :${boundPort}`;
      }

      vscode.window.showInformationMessage(
        `AgentPulse companion server running on port ${boundPort}. Ready to pair.`
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to start AgentPulse server: ${err.message}`);
    }
  };

  const showPairingInfo = () => {
    vscode.commands.executeCommand('agentpulse.controlView.focus');

    if (!server || !tokenManager) {
      vscode.window.showInformationMessage('Please start the AgentPulse companion server using the sidebar Control Center.');
      return;
    }

    const token = tokenManager.getCurrentToken();
    const config = vscode.workspace.getConfiguration('agentpulse');
    const port = config.get<number>('port', 49152);
    const connectionUri = `ws://127.0.0.1:${port}?token=${token}`;

    vscode.window.showInformationMessage(
      `AgentPulse Connection URI: ${connectionUri}`,
      'Copy to Clipboard'
    ).then((selection) => {
      if (selection === 'Copy to Clipboard') {
        vscode.env.clipboard.writeText(connectionUri);
        vscode.window.showInformationMessage('Connection URI copied to clipboard!');
      }
    });
  };

  const stopServer = async () => {
    if (adapter) {
      adapter.stop();
      adapter = null;
    }

    if (keepAwake) {
      keepAwake.deactivate();
    }

    if (server) {
      await server.stop();
      server = null;
    }

    sidebarProvider?.updateState({
      isRunning: false,
      token: null,
      connectionUri: null,
      connectedClients: 0,
      keepAwakeActive: false,
      agentStatus: 'idle',
    });

    if (statusBarItem) {
      statusBarItem.text = '$(radio-tower) AgentPulse: Stopped';
    }

    vscode.window.showInformationMessage('AgentPulse server stopped.');
  };

  const startCmd = vscode.commands.registerCommand('agentpulse.startServer', startServer);
  const showQrCmd = vscode.commands.registerCommand('agentpulse.showPairingQr', showPairingInfo);
  const stopCmd = vscode.commands.registerCommand('agentpulse.stopServer', stopServer);

  context.subscriptions.push(startCmd, showQrCmd, stopCmd);
}

function handleClientAction(action: ClientAction) {
  if (action.action === 'TOOL_ACTION') {
    vscode.window.showInformationMessage(
      `AgentPulse Mobile: User decided to [${action.decision?.toUpperCase()}] tool execution.`
    );
  } else if (action.action === 'SEND_PROMPT') {
    vscode.window.showInformationMessage(
      `AgentPulse Mobile prompt received: "${action.prompt}"`
    );
  }
}

export async function deactivate() {
  if (adapter) {
    adapter.stop();
  }
  if (keepAwake) {
    keepAwake.deactivate();
  }
  if (server) {
    await server.stop();
  }
}
