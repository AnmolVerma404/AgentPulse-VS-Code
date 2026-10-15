import { exec, ChildProcess } from 'child_process';

/**
 * Manages OS power assertions to prevent computer sleep during active AI agent runs.
 */
export class KeepAwakeManager {
  private active = false;
  private childProcess: ChildProcess | null = null;

  /**
   * Activates OS keep-awake assertion.
   */
  public activate(): void {
    if (this.active) return;
    this.active = true;

    try {
      if (process.platform === 'win32') {
        // Windows: Execute keep-awake loop in background
        this.childProcess = exec(
          'powershell -NoProfile -NonInteractive -Command "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class SleepUtil { [DllImport(\\\"kernel32.dll\\\")] public static extern uint SetThreadExecutionState(uint esFlags); }\'; [SleepUtil]::SetThreadExecutionState(0x80000003); Start-Sleep -Seconds 86400"'
        );
      } else if (process.platform === 'darwin') {
        // macOS: Use native caffeinate tool
        this.childProcess = exec('caffeinate -d -i -m -u');
      }
    } catch {
      // Ignore if OS does not permit power assertions
    }
  }

  /**
   * Deactivates OS keep-awake assertion.
   */
  public deactivate(): void {
    this.active = false;
    if (this.childProcess) {
      try {
        this.childProcess.kill();
      } catch {
        // Process might already be dead
      }
      this.childProcess = null;
    }
  }

  public isActive(): boolean {
    return this.active;
  }
}

