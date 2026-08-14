declare module "node:fs/promises" {
  export function mkdir(path: string, options?: unknown): Promise<unknown>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
}

declare module "node:child_process" {
  export function execFile(...args: unknown[]): unknown;
}

declare module "node:util" {
  export function promisify(fn: unknown): (...args: unknown[]) => Promise<{ stdout: string }>;
}

declare const process: {
  platform: string;
  argv: string[];
  cwd(): string;
  exitCode?: number;
};
