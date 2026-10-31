import { getLanIPv4Address } from '../server/network';

describe('getLanIPv4Address helper', () => {
  it('returns a valid IPv4 address string from native interfaces', () => {
    const ip = getLanIPv4Address();
    expect(typeof ip).toBe('string');
    expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  });

  it('prioritizes physical Wi-Fi over virtual adapters', () => {
    const mockInterfaces = () => ({
      'vEthernet (WSL)': [
        {
          address: '172.28.0.1',
          netmask: '255.255.240.0',
          family: 'IPv4' as const,
          mac: '00:15:5d:00:00:01',
          internal: false,
          cidr: '172.28.0.1/20',
        },
      ],
      'Wi-Fi': [
        {
          address: '192.168.1.50',
          netmask: '255.255.255.0',
          family: 'IPv4' as const,
          mac: '00:11:22:33:44:55',
          internal: false,
          cidr: '192.168.1.50/24',
        },
      ],
    });

    const ip = getLanIPv4Address(mockInterfaces);
    expect(ip).toBe('192.168.1.50');
  });

  it('falls back to 127.0.0.1 when no non-internal network interfaces exist', () => {
    const mockInterfaces = () => ({
      lo: [
        {
          address: '127.0.0.1',
          netmask: '255.0.0.0',
          family: 'IPv4' as const,
          mac: '00:00:00:00:00:00',
          internal: true,
          cidr: '127.0.0.1/8',
        },
      ],
    });

    const ip = getLanIPv4Address(mockInterfaces);
    expect(ip).toBe('127.0.0.1');
  });

  it('selects non-virtual interface when wi-fi is not named explicitly', () => {
    const mockInterfaces = () => ({
      'docker0': [
        {
          address: '172.17.0.1',
          netmask: '255.255.0.0',
          family: 'IPv4' as const,
          mac: '02:42:1a:2b:3c:4d',
          internal: false,
          cidr: '172.17.0.1/16',
        },
      ],
      'custom-lan': [
        {
          address: '10.0.0.42',
          netmask: '255.255.255.0',
          family: 'IPv4' as const,
          mac: '00:22:33:44:55:66',
          internal: false,
          cidr: '10.0.0.42/24',
        },
      ],
    });

    const ip = getLanIPv4Address(mockInterfaces);
    expect(ip).toBe('10.0.0.42');
  });
});
