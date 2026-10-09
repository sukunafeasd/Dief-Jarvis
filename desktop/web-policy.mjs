import dns from "node:dns/promises";
import net from "node:net";
const reserved = new net.BlockList();
for (const [address, prefix, family] of [
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["192.0.0.0", 24, "ipv4"],
  ["192.0.2.0", 24, "ipv4"],
  ["198.18.0.0", 15, "ipv4"],
  ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"],
  ["224.0.0.0", 3, "ipv4"],
  ["::", 128, "ipv6"],
  ["::1", 128, "ipv6"],
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
  ["ff00::", 8, "ipv6"],
  ["2001:db8::", 32, "ipv6"],
])
  reserved.addSubnet(address, prefix, family);
export function publicAddress(address) {
  const version = typeof address === "string" ? net.isIP(address) : 0;
  if (!version) return false;
  if (
    version === 6 &&
    !address.toLowerCase().startsWith("::ffff:") &&
    !/^[23]/.test(address)
  )
    return false;
  return !reserved.check(address, version === 4 ? "ipv4" : "ipv6");
}
export async function publicUrl(value, lookup = dns.lookup) {
  if (typeof value !== "string" || value.length > 2000)
    throw Error("URL invalida.");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw Error("Use HTTPS publico, sem credenciais ou portas especiais.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  )
    throw Error("Enderecos locais nao sao permitidos no navegador agente.");
  let timer;
  const addresses = net.isIP(host)
    ? [{ address: host }]
    : await Promise.race([
        lookup(host, { all: true }),
        new Promise((_resolve, reject) => {
          timer = setTimeout(
            () => reject(Error("Resolucao de endereco demorou demais.")),
            5000,
          );
        }),
      ]).finally(() => clearTimeout(timer));
  if (
    !addresses.length ||
    addresses.some((item) => !publicAddress(item.address))
  )
    throw Error("Destino privado ou reservado bloqueado.");
  return url.href;
}
