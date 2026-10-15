/**
 * Mock for the 'vscode' module during unit tests.
 */
export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createWebviewPanel: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn((command: string, callback: (...args: any[]) => any) => {
    return { dispose: jest.fn() };
  }),
  executeCommand: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
    update: jest.fn(),
  })),
};

