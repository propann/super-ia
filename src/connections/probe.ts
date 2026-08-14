import { assertSafeNetworkTarget, type HostResolver } from "./network-policy.js";
import type { AiConnection } from "./types.js";

export type ConnectionProbeState = "reachable" | "redirect-blocked" | "policy-blocked" | "failed" | "unsupported" | "disabled";

export interface ConnectionProbeResult {
  connectionId: string;
  state: ConnectionProbeState;
  reachable: boolean;
  networkAttempted: boolean;
  statusCode?: number;
  durationMs: number;
  reasons: string[];
  resolvedAddresses: string[];
  usedAuthentication: false;
  followedRedirect: false;
}

export interface ProbeResponse {
  status: number;
  headers: { get(name: string): string | null };
}

export type ProbeFetcher = (url: string, init: {
  method: "HEAD";
  redirect: "manual";
  signal: AbortSignal;
  headers: Record<string, string>;
}) => Promise<ProbeResponse>;

export interface ConnectionProbeOptions {
  timeoutMs?: number;
  resolver?: HostResolver;
  fetcher?: ProbeFetcher;
}

function duration(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

export async function probeConnection(
  connection: AiConnection,
  options: ConnectionProbeOptions = {},
): Promise<ConnectionProbeResult> {
  const startedAt = Date.now();
  if (!connection.enabled) {
    return {
      connectionId: connection.id,
      state: "disabled",
      reachable: false,
      networkAttempted: false,
      durationMs: duration(startedAt),
      reasons: ["connexion désactivée"],
      resolvedAddresses: [],
      usedAuthentication: false,
      followedRedirect: false,
    };
  }
  if (!connection.baseUrl) {
    return {
      connectionId: connection.id,
      state: "unsupported",
      reachable: false,
      networkAttempted: false,
      durationMs: duration(startedAt),
      reasons: ["ce transport ne fournit pas de baseUrl sondable"],
      resolvedAddresses: [],
      usedAuthentication: false,
      followedRedirect: false,
    };
  }

  const policy = await assertSafeNetworkTarget(connection, options.resolver);
  if (!policy.allowed || !policy.url) {
    return {
      connectionId: connection.id,
      state: "policy-blocked",
      reachable: false,
      networkAttempted: false,
      durationMs: duration(startedAt),
      reasons: policy.reasons,
      resolvedAddresses: policy.resolvedAddresses,
      usedAuthentication: false,
      followedRedirect: false,
    };
  }

  const timeoutMs = Math.min(15_000, Math.max(250, options.timeoutMs ?? 5_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher: ProbeFetcher = options.fetcher ?? (async (url, init) => fetch(url, init));
  try {
    const response = await fetcher(policy.url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "accept": "application/json, text/plain, */*",
        "user-agent": "superia-connection-probe/1",
      },
    });
    const redirect = response.status >= 300 && response.status < 400 && Boolean(response.headers.get("location"));
    return {
      connectionId: connection.id,
      state: redirect ? "redirect-blocked" : "reachable",
      reachable: true,
      networkAttempted: true,
      statusCode: response.status,
      durationMs: duration(startedAt),
      reasons: redirect ? ["endpoint joignable mais redirection non suivie"] : [],
      resolvedAddresses: policy.resolvedAddresses,
      usedAuthentication: false,
      followedRedirect: false,
    };
  } catch (error) {
    const message = controller.signal.aborted ? `délai dépassé après ${timeoutMs} ms` : error instanceof Error ? error.message : String(error);
    return {
      connectionId: connection.id,
      state: "failed",
      reachable: false,
      networkAttempted: true,
      durationMs: duration(startedAt),
      reasons: [message],
      resolvedAddresses: policy.resolvedAddresses,
      usedAuthentication: false,
      followedRedirect: false,
    };
  } finally {
    clearTimeout(timer);
  }
}
