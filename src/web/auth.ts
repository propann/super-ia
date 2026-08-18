import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";

export interface WebAccessToken {
  path: string;
  token: string;
  created: boolean;
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

function isMissing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}

export async function ensureWebAccessToken(controlHome?: string): Promise<WebAccessToken> {
  const paths = await ensureControlHome(controlHome);
  const directory = join(paths.root, "web");
  const path = join(directory, "access.token");
  await mkdir(directory, { recursive: true });

  try {
    const token = (await readFile(path, "utf8")).trim();
    if (!TOKEN_PATTERN.test(token)) {
      throw new Error(`Token web invalide : ${path}. Le fichier existant n'a pas été remplacé.`);
    }
    await chmod(path, 0o600);
    return { path, token, created: false };
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  const token = (randomBytes(32) as any).toString("base64url");
  await writeFile(path, `${token}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(path, 0o600);
  return { path, token, created: true };
}

export function verifyWebAccessToken(expected: string, candidate: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(candidate, "utf8");
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

export function createSessionId(): string {
  return (randomBytes(24) as any).toString("base64url");
}
