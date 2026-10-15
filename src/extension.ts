import * as vscode from 'vscode';
import { TokenManager } from './server/auth';
import { AgentPulseServer } from './server/wss';
import { AntigravityAdapter } from './adapters/antigravity';
import { KeepAwakeManager } from './keepawake';
import { ClientAction, NormalizedEvent } from './adapters/types';

let server: AgentPulseServer | null = null;
let tokenManager: TokenManager | null = null;
let adapter: AntigravityAdapter | null = null;
let keepAwake: KeepAwakeManager | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

export async function activate(context: vscode.ExtensionContext) {
  tokenManager = new TokenManager();
  keepAwake = new KeepAwakeManager();

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(radio-tower) AgentPulse: Ready';
  statusBarItem.tooltip = 'Click to show AgentPulse pairing details';
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

    tokenManager!.generateSessionToken();

    server = new AgentPulseServer({
      port,
      tokenManager: tokenManager!,
      onClientAction: (action: ClientAction) => {
        handleClientAction(action);
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

      // Broadcast to mobile app
      server?.broadcast(event);
    });

    try {
      const boundPort = await server.start();
      adapter.start();

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
    if (!server || !tokenManager) {
      vscode.window.showWarningMessage('Please start the AgentPulse server first.');
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
