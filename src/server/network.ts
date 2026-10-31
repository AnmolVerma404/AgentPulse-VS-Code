import * as os from 'os';

export type NetworkInterfacesProvider = () => NodeJS.Dict<os.NetworkInterfaceInfo[]>;

/**
 * Discovers the local machine's primary non-internal IPv4 address for local network pairing.
 * Prioritizes physical adapters (Wi-Fi, Ethernet) over virtual switches (WSL, Docker, Hyper-V).
 */
export function getLanIPv4Address(
  getInterfaces: NetworkInterfacesProvider = os.networkInterfaces
): string {
  const interfaces = getInterfaces() || {};
  const candidates: Array<{ name: string; address: string; isPriority: boolean }> = [];

  const virtualRegex = /(vethernet|virtual|wsl|docker|vmware|vbox|loopback)/i;
  const preferredRegex = /(wi-?fi|wlan|ethernet|eth|en\d+)/i;

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    const isVirtual = virtualRegex.test(name);
    const isPreferred = preferredRegex.test(name);

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({
          name,
          address: addr.address,
          isPriority: isPreferred && !isVirtual,
        });
      }
    }
  }

  // Pick highest priority candidate first
  const preferred = candidates.find((c) => c.isPriority);
  if (preferred) {
    return preferred.address;
  }

  // Otherwise, non-virtual candidates
  const nonVirtual = candidates.find((c) => !virtualRegex.test(c.name));
  if (nonVirtual) {
    return nonVirtual.address;
  }

  // Fallback to any detected non-internal IP
  if (candidates.length > 0) {
    return candidates[0].address;
  }

  // Offline fallback
  return '127.0.0.1';
}
