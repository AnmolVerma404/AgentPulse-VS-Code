import * as vscode from 'vscode';
import { AgentPulseSidebarProvider } from '../server/sidebarView';

describe('AgentPulseSidebarProvider', () => {
  let provider: AgentPulseSidebarProvider;
  let mockWebview: any;
  let mockWebviewView: any;
  let messageListener: ((data: any) => void) | null = null;

  beforeEach(() => {
    messageListener = null;
    mockWebview = {
      options: {},
      html: '',
      onDidReceiveMessage: jest.fn((callback) => {
        messageListener = callback;
        return { dispose: jest.fn() };
      }),
      postMessage: jest.fn(),
    };

    mockWebviewView = {
      webview: mockWebview,
    };

    const mockUri = { fsPath: '/test/path' } as vscode.Uri;
    provider = new AgentPulseSidebarProvider(mockUri);
  });

  it('resolves webview view and sets initial HTML content', () => {
    provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );

    expect(mockWebview.html).toContain('Server Stopped');
    expect(mockWebview.html).toContain('Start Server');
  });

  it('updates state and renders active running status with port and QR container', async () => {
    provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );

    await provider.updateState({
      isRunning: true,
      port: 49152,
      connectionUri: 'ws://127.0.0.1:49152?token=test-token',
      connectedClients: 1,
      agentStatus: 'thinking',
      keepAwakeActive: true,
    });

    expect(mockWebview.html).toContain('Running on :49152');
    expect(mockWebview.html).toContain('Stop Server');
    expect(mockWebview.html).toContain('Scan in AgentPulse Mobile');
    expect(mockWebview.html).toContain('Connected Phones:');
    expect(mockWebview.html).toContain('thinking');
    expect(mockWebview.html).toContain('Active');
  });

  it('handles webview messages to execute start and stop commands', () => {
    const executeCommandSpy = jest.spyOn(vscode.commands, 'executeCommand').mockImplementation(() => Promise.resolve());

    provider.resolveWebviewView(
      mockWebviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken
    );

    expect(messageListener).toBeDefined();

    messageListener!({ type: 'startServer' });
    expect(executeCommandSpy).toHaveBeenCalledWith('agentpulse.startServer');

    messageListener!({ type: 'stopServer' });
    expect(executeCommandSpy).toHaveBeenCalledWith('agentpulse.stopServer');

    executeCommandSpy.mockRestore();
  });
});
