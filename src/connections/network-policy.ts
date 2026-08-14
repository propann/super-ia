import { lookup } from "node:dns/promises";
import type { AiConnection } from "./types.js";

export type EndpointScope = "public" | "loopback" | "private" | "invalid";

export interface EndpointPolicyDecision {
  allowed: boolean;
  scope: EndpointScope;
  url?: string;
  hostname?: string;
  reasons: string[];
  resolvedAddresses: string[];
}

export type HostResolver = (hostname: string) => Promise<string[]>;

function parseIpv4(value: string): number[] | undefined {
  const parts = value.split(".");
  if (parts.length !== 4) return undefined;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part, index) => !Number.isInteger(part) || part < 0 || part > 255 || String(part) !== parts[index].replace(/^0+(?=\d)/, ""))) return undefined;
  return numbers;
}

export function classifyAddress(rawValue: string): EndpointScope {
  const value = rawValue.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return classifyAddress(mapped);

  const ipv4 = parseIpv4(value);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 127 || a === 0) return "loopback";
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "private";
    if ((a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)) return "private";
    if (a >= 224 || a === 255) return "private";
    return "public";
  }

  if (value.includes(":")) {
    if (value === "::1") return "loopback";
    if (value === "::") return "private";
    if (/^f[cd]/.test(value) || /^fe[89ab]/.test(value) || /^ff/.test(value)) return "private";
    return "public";
  }

  return "invalid";
}

function classifyHostname(hostname: string): EndpointScope {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return "loopback";
  if (normalized.endsWith(".local") || normalized.endsWith(".internal") || normalized.endsWith(".home.arpa")) return "private";
  const address = classifyAddress(normalized);
  return address === "invalid" ? "public" : address;
}

export function evaluateEndpointPolicy(connection: AiConnection): EndpointPolicyDecision {
  if (!connection.baseUrl) return { allowed: false, scope: "invalid", reasons: ["baseUrl absente"], resolvedAddresses: [] };
  let parsed: URL;
  try {
    parsed = new URL(connection.baseUrl);
  } catch {
    return { allowed: false, scope: "invalid", reasons: ["URL invalide"], resolvedAddresses: [] };
  }

  const reasons: string[] = [];
  if (parsed.username || parsed.password) reasons.push("identifiants interdits dans l'URL");
  if (parsed.hash) reasons.push("fragment URL interdit");
  if (!["http:", "https:"].includes(parsed.protocol)) reasons.push("protocole non HTTP(S)");

  const scope = classifyHostname(parsed.hostname);
  if (connection.kind === "local-endpoint") {
    if (scope !== "loopback") reasons.push("un endpoint local doit rester sur la boucle locale");
  } else {
    if (parsed.protocol !== "https:") reasons.push("HTTPS obligatoire pour un endpoint distant");
    if (scope !== "public") reasons.push("adresse locale, privée ou spéciale interdite pour un endpoint distant");
  }

  return {
    allowed: reasons.length === 0,
    scope,
    url: parsed.toString(),
    hostname: parsed.hostname.replace(/^\[|\]$/g, ""),
    reasons,
    resolvedAddresses: [],
  };
}

async function defaultResolver(hostname: string): Promise<string[]> {
  const direct = classifyAddress(hostname);
  if (direct !== "invalid") return [hostname];
  return (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);
}

export async function assertSafeNetworkTarget(
  connection: AiConnection,
  resolver: HostResolver = defaultResolver,
): Promise<EndpointPolicyDecision> {
  const decision = evaluateEndpointPolicy(connection);
  if (!decision.allowed || !decision.hostname) return decision;

  let addresses: string[];
  try {
    addresses = [...new Set(await resolver(decision.hostname))];
  } catch (error) {
    return {
      ...decision,
      allowed: false,
      reasons: [`résolution DNS impossible : ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  if (!addresses.length) return { ...decision, allowed: false, reasons: ["résolution DNS vide"] };

  const forbidden = addresses.filter((address) => {
    const scope = classifyAddress(address);
    return connection.kind === "local-endpoint" ? scope !== "loopback" : scope !== "public";
  });
  if (forbidden.length) {
    return {
      ...decision,
      allowed: false,
      reasons: [`résolution vers une adresse interdite : ${forbidden.join(", ")}`],
      resolvedAddresses: addresses,
    };
  }
  return { ...decision, resolvedAddresses: addresses };
}
