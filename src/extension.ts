import * as vscode from 'vscode';

/**
 * Extension entrypoint for AgentPulse.
 * Monitors Antigravity and Copilot sessions and bridges them to the paired mobile app.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('AgentPulse extension is now active.');

  const startServerCommand = vscode.commands.registerCommand('agentpulse.startServer', () => {
    vscode.window.showInformationMessage('AgentPulse server started on local port.');
  });

  const showPairingQrCommand = vscode.commands.registerCommand('agentpulse.showPairingQr', () => {
    vscode.window.showInformationMessage('AgentPulse: QR pairing window requested.');
  });

  const stopServerCommand = vscode.commands.registerCommand('agentpulse.stopServer', () => {
    vscode.window.showInformationMessage('AgentPulse server stopped.');
  });

  context.subscriptions.push(startServerCommand, showPairingQrCommand, stopServerCommand);
}

export function deactivate() {
  console.log('AgentPulse extension deactivated.');
}

