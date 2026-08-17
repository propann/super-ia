export type MachinePlatform = "linux" | "windows";
export type MachineTransport = "ssh" | "winrm";
export type MachineAuthMode = "key" | "password" | "session" | "manual";
export type MachineState = "disabled" | "configured" | "ready" | "manual" | "invalid";

export interface RemoteMachine {
  id: string;
  label: string;
  platform: MachinePlatform;
  transport: MachineTransport;
  host: string;
  port: number;
  user: string;
  enabled: boolean;
  authMode: MachineAuthMode;
  identityFile?: string;
  shell?: string;
  sessionName: string;
  projectRoot?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MachineCheck extends RemoteMachine {
  state: MachineState;
  ready: boolean;
  reasons: string[];
  networkChecked: false;
}

export interface MachineStore {
  schemaVersion: 1;
  updatedAt: string;
  machines: RemoteMachine[];
}
