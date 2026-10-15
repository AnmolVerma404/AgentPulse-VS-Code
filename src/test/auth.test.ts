import { TokenManager } from '../server/auth';

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
  });

  it('generates a 64-character hex session token (256-bit)', () => {
    const token = tokenManager.generateSessionToken();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
    expect(tokenManager.getCurrentToken()).toBe(token);
  });

  it('verifies a valid token successfully', () => {
    const token = tokenManager.generateSessionToken();
    expect(tokenManager.verify(token)).toBe(true);
  });

  it('rejects invalid or tampered tokens', () => {
    tokenManager.generateSessionToken();
    expect(tokenManager.verify('invalid-token')).toBe(false);
    expect(tokenManager.verify('')).toBe(false);
    expect(tokenManager.verify(undefined)).toBe(false);
    expect(tokenManager.verify(null)).toBe(false);
  });

  it('rejects tokens after invalidation', () => {
    const token = tokenManager.generateSessionToken();
    tokenManager.invalidate();
    expect(tokenManager.getCurrentToken()).toBeNull();
    expect(tokenManager.verify(token)).toBe(false);
  });
});

