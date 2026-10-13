import { activate, deactivate } from '../extension';

describe('Extension Module', () => {
  it('exports activate and deactivate lifecycle functions', () => {
    expect(typeof activate).toBe('function');
    expect(typeof deactivate).toBe('function');
  });
});

