declare module "node:fs" {
  export function appendFileSync(path: string, data: string, encoding: string): void;
}

declare module "node:fs/promises" {
  export function access(path: string): Promise<void>;
  export function chmod(path: string, mode: number): Promise<void>;
  export function mkdir(path: string, options?: unknown): Promise<unknown>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function readFile(path: string): Promise<{ byteLength: number }>;
  export function readdir(path: string): Promise<string[]>;
  export function realpath(path: string): Promise<string>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function rm(path: string, options?: unknown): Promise<void>;
  export function writeFile(path: string, data: string, encoding?: string): Promise<void>;
}

declare module "node:path" {
  export const sep: string;
  export function basename(path: string): string;
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare module "node:os" {
  export function homedir(): string;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(value: unknown): { digest(encoding: "hex"): string };
  };
  export function randomUUID(): string;
}

declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
      get(...params: unknown[]): Record<string, unknown> | undefined;
      all(...params: unknown[]): Record<string, unknown>[];
    };
    close(): void;
  }
}

declare module "node:child_process" {
  export function execFile(...args: unknown[]): unknown;
  export function spawn(...args: unknown[]): any;
}

declare module "node:util" {
  export function promisify(fn: unknown): (...args: unknown[]) => Promise<{ stdout: string; stderr?: string }>;
}

declare const Buffer: {
  byteLength(value: string, encoding?: string): number;
  from(value: string, encoding?: string): {
    byteLength: number;
    subarray(start: number, end?: number): { toString(encoding?: string): string };
  };
};

declare const process: {
  platform: string;
  argv: string[];
  env: Record<string, string | undefined>;
  pid: number;
  cwd(): string;
  kill(pid: number, signal?: string): void;
  exitCode?: number;
  stdout: {
    columns?: number;
    write(chunk: string): boolean;
  };
  stdin: {
    isTTY?: boolean;
    setRawMode?(mode: boolean): void;
    setEncoding(encoding: string): void;
    resume(): void;
    pause(): void;
    on(event: string, listener: (data: string) => void): void;
    off(event: string, listener: (data: string) => void): void;
  };
  on(event: string, listener: () => void): void;
  off(event: string, listener: () => void): void;
};
