import { isIP, isIPv4 } from "node:net";

export type RoomScope = "auto" | "ip" | "subnet";

function splitV4(ip: string): number[] {
  return ip.split(".").map((part) => Number.parseInt(part, 10));
}

function isPrivateV4(ip: string): boolean {
  const octets = splitV4(ip);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n))) return false;
  const a = octets[0] ?? -1;
  const b = octets[1] ?? -1;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  return false;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  return false;
}

/** Strip an ::ffff:a.b.c.d wrapper so mapped IPv4 is treated as IPv4. */
function normalize(ip: string): string {
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:") && isIPv4(lower.slice(7))) return lower.slice(7);
  return ip;
}

/** First 4 hextets of an IPv6 address -> a /64 prefix. */
function ipv6Prefix(ip: string): string {
  const [head = "", tail = ""] = ip.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const missing = Math.max(8 - headGroups.length - tailGroups.length, 0);
  const groups = [
    ...headGroups,
    ...Array<string>(missing).fill("0"),
    ...tailGroups,
  ];
  return groups.slice(0, 4).map((group) => group || "0").join(":");
}

function v4Prefix(ip: string): string {
  const octets = ip.split(".");
  return `${octets[0] ?? "0"}.${octets[1] ?? "0"}.${octets[2] ?? "0"}.0`;
}

/**
 * Maps a client IP to the string that will be hashed into the room id.
 *
 * - `ip`     : exact address (the original service's behaviour)
 * - `subnet` : always /24 (v4) or /64 (v6)
 * - `auto`   : collapse only private/loopback addresses to their LAN prefix so
 *              devices behind one router share a bucket in local/LAN testing,
 *              while public addresses stay exact for privacy.
 */
export function roomKey(ip: string, scope: RoomScope = "auto"): string {
  if (scope === "ip") return ip;

  const address = normalize(ip);
  const version = isIP(address);

  if (version === 4) {
    if (scope === "subnet" || isPrivateV4(address)) return v4Prefix(address);
    return address;
  }

  if (version === 6) {
    if (scope === "subnet" || isPrivateV6(address)) return `v6:${ipv6Prefix(address)}`;
    return address;
  }

  return address;
}
