declare module "node:fs/promises" {
  export function access(path: string): Promise<void>;
  export function mkdir(path: string, options?: unknown): Promise<unknown>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function readdir(path: string): Promise<string[]>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
}

declare module "node:path" {
  export function basename(path: string): string;
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare module "node:child_process" {
  export function execFile(...args: unknown[]): unknown;
}

declare module "node:util" {
  export function promisify(fn: unknown): (...args: unknown[]) => Promise<{ stdout: string; stderr?: string }>;
}

declare const process: {
  platform: string;
  argv: string[];
  cwd(): string;
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
