import * as crypto from 'crypto';

/**
 * Manages ephemeral pairing tokens for local WebSocket connections.
 * Enforces zero-trust authentication using cryptographically secure tokens
 * and constant-time string comparisons to prevent timing attacks.
 */
export class TokenManager {
  private currentToken: string | null = null;

  /**
   * Generates a new 256-bit cryptographically secure session token.
   */
  public generateSessionToken(): string {
    this.currentToken = crypto.randomBytes(32).toString('hex');
    return this.currentToken;
  }

  /**
   * Returns the current session token, or null if no token has been generated.
   */
  public getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Verifies an incoming token against the active session token using constant-time comparison.
   */
  public verify(incomingToken: string | undefined | null): boolean {
    if (!this.currentToken || !incomingToken) {
      return false;
    }

    const currentBuffer = Buffer.from(this.currentToken, 'utf8');
    const incomingBuffer = Buffer.from(incomingToken, 'utf8');

    if (currentBuffer.length !== incomingBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(currentBuffer, incomingBuffer);
  }

  /**
   * Invalidates the active token.
   */
  public invalidate(): void {
    this.currentToken = null;
  }
}

